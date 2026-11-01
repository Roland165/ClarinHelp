import { useEffect, useRef, useState } from 'react'

// Scores are generated from data/scores/*.abc by ml/scripts/export_musicxml.py.
const SCORES_URL = `${import.meta.env.BASE_URL}scores`

interface Tune {
  id: string
  title: string
}

export function Score() {
  const [tunes, setTunes] = useState<Tune[]>([])
  const [tuneId, setTuneId] = useState('au_clair')
  const [error, setError] = useState<string | null>(null)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${SCORES_URL}/index.json`)
      .then((response) => response.json())
      .then(setTunes)
      .catch((err) => setError(String(err)))
  }, [])

  useEffect(() => {
    const element = container.current
    if (!element) return
    let cancelled = false

    async function draw(element: HTMLDivElement) {
      // OpenSheetMusicDisplay is big: load it only when a score is shown,
      // so the tuner still opens instantly.
      const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay')
      if (cancelled) return
      element.innerHTML = ''
      const osmd = new OpenSheetMusicDisplay(element, {
        autoResize: true,
        drawPartNames: false,
        // music21 writes the title twice (work and movement title).
        drawSubtitle: false,
      })
      await osmd.load(`${SCORES_URL}/${tuneId}.musicxml`)
      if (!cancelled) osmd.render()
    }

    draw(element).catch((err) => setError(String(err)))
    return () => {
      cancelled = true
    }
  }, [tuneId])

  return (
    <section className="score">
      <label>
        Tune{' '}
        <select value={tuneId} onChange={(event) => setTuneId(event.target.value)}>
          {tunes.map((tune) => (
            <option key={tune.id} value={tune.id}>
              {tune.title}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="error">Could not show the score: {error}</p>}
      <div ref={container} />
    </section>
  )
}
