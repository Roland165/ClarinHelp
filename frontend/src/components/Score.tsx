import { useEffect, useRef } from 'react'
import type { Note, OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import type { ScoreNote } from '../lib/feedback'
import type { NoteStatus } from '../lib/take'

// Scores are generated from data/scores/*.abc by ml/scripts/export_musicxml.py.
export const SCORES_URL = `${import.meta.env.BASE_URL}scores`

type OsmdModule = typeof import('opensheetmusicdisplay')

const NOTE_COLORS: Record<NoteStatus, string> = {
  'in-tune': '#2e9e5b',
  close: '#e0a100',
  wrong: '#d64545',
  missed: '#d64545',
}
const DEFAULT_COLOR = '#000000'

interface ScoreProps {
  tuneId: string
  statuses: (NoteStatus | null)[] | null // one per score note, null = no color
  cursorAt: number | null // index of the score note under the cursor, null = no cursor
  onLoaded: (notes: ScoreNote[]) => void
  onError: (message: string) => void
}

/**
 * Walk through the score with the cursor. A tied note counts once, but all its parts
 * get its color. steps[i] is how many cursor moves it takes to reach score note i.
 */
function readScore(osmd: OpenSheetMusicDisplay) {
  const notes: ScoreNote[] = []
  const graphics: Note[][] = []
  const steps: number[] = []
  const cursor = osmd.cursor
  cursor.reset()
  for (let step = 0; !cursor.Iterator.EndReached; step++) {
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
        steps.push(step)
      }
    }
    cursor.next()
  }
  cursor.reset()
  cursor.hide()
  return { notes, graphics, steps }
}

export function Score({ tuneId, statuses, cursorAt, onLoaded, onError }: ScoreProps) {
  const container = useRef<HTMLDivElement>(null)
  const osmdModule = useRef<OsmdModule | null>(null)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const graphics = useRef<Note[][]>([])
  const steps = useRef<number[]>([])
  const colors = useRef<string[]>([]) // color currently drawn for each score note
  const cursorStep = useRef(0)

  useEffect(() => {
    const element = container.current
    if (!element) return
    let cancelled = false

    async function draw(element: HTMLDivElement) {
      // OpenSheetMusicDisplay is big: load it only when a score is shown,
      // so the tuner still opens instantly.
      osmdModule.current ??= await import('opensheetmusicdisplay')
      if (cancelled) return
      // Only one instance: each one keeps listening to window resizes and redraws itself.
      osmdRef.current ??= new osmdModule.current.OpenSheetMusicDisplay(element, {
        autoResize: true,
        drawPartNames: false,
        // music21 writes the title twice (work and movement title).
        drawSubtitle: false,
        // Scroll the page to keep the cursor in sight while playing.
        followCursor: true,
      })
      const osmd = osmdRef.current
      await osmd.load(`${SCORES_URL}/${tuneId}.musicxml`)
      if (cancelled) return
      graphics.current = []
      osmd.render()
      const score = readScore(osmd)
      graphics.current = score.graphics
      steps.current = score.steps
      colors.current = score.graphics.map(() => DEFAULT_COLOR)
      cursorStep.current = 0
      onLoaded(score.notes)
    }

    draw(element).catch((err) => onError(String(err)))
    return () => {
      cancelled = true
    }
  }, [tuneId, onLoaded, onError])

  // Colors change several times per second while playing: redrawing the whole score
  // each time would be too slow, so only the notes that change are recolored in place.
  useEffect(() => {
    const osmd = osmdRef.current
    const GraphicalNote = osmdModule.current?.GraphicalNote
    if (!osmd || !GraphicalNote) return
    graphics.current.forEach((parts, i) => {
      const status = statuses?.[i]
      const color = status ? NOTE_COLORS[status] : DEFAULT_COLOR
      if (colors.current[i] === color) return
      colors.current[i] = color
      for (const note of parts) {
        note.NoteheadColor = color // kept when OSMD redraws, e.g. after a resize
        GraphicalNote.FromNote(note, osmd.EngravingRules)?.setColor(color, {
          applyToNoteheads: true,
        })
      }
    })
  }, [statuses])

  useEffect(() => {
    const cursor = osmdRef.current?.cursor
    if (!cursor) return
    if (cursorAt === null) {
      cursor.hide()
      return
    }
    // The cursor only moves one step at a time: go back to the start if needed.
    const target = steps.current[Math.min(cursorAt, steps.current.length - 1)] ?? 0
    if (target < cursorStep.current) {
      cursor.reset()
      cursorStep.current = 0
    }
    while (cursorStep.current < target) {
      cursor.next()
      cursorStep.current++
    }
    cursor.show()
  }, [cursorAt])

  return <div ref={container} className="score-sheet" />
}
