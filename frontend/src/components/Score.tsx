import { useEffect, useRef } from 'react'
import type { Note, OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import type { ScoreNote } from '../lib/feedback'
import type { NoteStatus } from '../lib/take'

// Scores are generated from data/scores/*.abc by ml/scripts/export_musicxml.py.
export const SCORES_URL = `${import.meta.env.BASE_URL}scores`

const NOTE_COLORS: Record<NoteStatus, string> = {
  'in-tune': '#2e9e5b',
  close: '#e0a100',
  wrong: '#d64545',
  missed: '#d64545',
}
const DEFAULT_COLOR = '#000000'

interface ScoreProps {
  tuneId: string
  statuses: NoteStatus[] | null // one per score note, null = no colors
  onLoaded: (notes: ScoreNote[]) => void
  onError: (message: string) => void
}

/** Walk through the score. A tied note counts once, but all its parts get its color. */
function readScore(osmd: OpenSheetMusicDisplay) {
  const notes: ScoreNote[] = []
  const graphics: Note[][] = []
  const cursor = osmd.cursor
  cursor.reset()
  while (!cursor.Iterator.EndReached) {
    for (const note of cursor.NotesUnderCursor()) {
      if (note.isRest()) continue
      // Length is a fraction of a whole note.
      const beats = note.Length.RealValue * 4
      if (note.NoteTie && note.NoteTie.StartNote !== note) {
        notes[notes.length - 1].beats += beats
        graphics[graphics.length - 1].push(note)
      } else {
        // OSMD counts half tones from one octave below MIDI.
        const midi = note.halfTone + 12
        notes.push({ bar: cursor.Iterator.CurrentMeasureIndex + 1, midi, beats })
        graphics.push([note])
      }
    }
    cursor.next()
  }
  cursor.reset()
  cursor.hide()
  return { notes, graphics }
}

export function Score({ tuneId, statuses, onLoaded, onError }: ScoreProps) {
  const container = useRef<HTMLDivElement>(null)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const graphics = useRef<Note[][]>([])

  useEffect(() => {
    const element = container.current
    if (!element) return
    let cancelled = false

    async function draw(element: HTMLDivElement) {
      // OpenSheetMusicDisplay is big: load it only when a score is shown,
      // so the tuner still opens instantly.
      const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay')
      if (cancelled) return
      // Only one instance: each one keeps listening to window resizes and redraws itself.
      osmdRef.current ??= new OpenSheetMusicDisplay(element, {
        autoResize: true,
        drawPartNames: false,
        // music21 writes the title twice (work and movement title).
        drawSubtitle: false,
      })
      const osmd = osmdRef.current
      await osmd.load(`${SCORES_URL}/${tuneId}.musicxml`)
      if (cancelled) return
      graphics.current = []
      osmd.render()
      const score = readScore(osmd)
      graphics.current = score.graphics
      onLoaded(score.notes)
    }

    draw(element).catch((err) => onError(String(err)))
    return () => {
      cancelled = true
    }
  }, [tuneId, onLoaded, onError])

  useEffect(() => {
    const osmd = osmdRef.current
    if (!osmd) return
    graphics.current.forEach((parts, i) => {
      const status = statuses?.[i]
      for (const note of parts) note.NoteheadColor = status ? NOTE_COLORS[status] : DEFAULT_COLOR
    })
    osmd.render()
    // Rendering again puts the cursor back: it stays hidden until we follow the player.
    osmd.cursor.hide()
  }, [statuses])

  return <div ref={container} className="score-sheet" />
}
