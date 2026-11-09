import { useEffect, useRef, useState } from 'react'
import { startPitchTracker, type PitchFrame } from '../audio/mic'
import type { ScoreNote } from '../lib/feedback'
import { analyzeTake, type TakeResult } from '../lib/take'
import { Score, SCORES_URL } from './Score'

interface Tune {
  id: string
  title: string
}

// While playing, the whole take is analysed again every 5 frames (~100 ms): fast
// enough for the cursor to follow, cheap enough for the page to stay smooth.
const LIVE_EVERY_FRAMES = 5

/** Choose a tune, play it, and see the cursor follow you and each note get its color. */
export function Practice() {
  const [tunes, setTunes] = useState<Tune[]>([])
  const [tuneId, setTuneId] = useState('au_clair')
  const [score, setScore] = useState<ScoreNote[]>([])
  const [recording, setRecording] = useState(false)
  const [result, setResult] = useState<TakeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const frames = useRef<PitchFrame[]>([])
  const stopMic = useRef<(() => void) | null>(null)

  function onFrame(frame: PitchFrame) {
    frames.current.push(frame)
    if (frames.current.length % LIVE_EVERY_FRAMES === 0) {
      setResult(analyzeTake(frames.current, score))
    }
  }

  useEffect(() => {
    fetch(`${SCORES_URL}/index.json`)
      .then((response) => response.json())
      .then(setTunes)
      .catch((err) => setError(String(err)))
  }, [])

  function chooseTune(id: string) {
    setTuneId(id)
    setResult(null)
  }

  async function record() {
    setError(null)
    setResult(null)
    frames.current = []
    try {
      stopMic.current = await startPitchTracker(onFrame)
      setRecording(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function stop() {
    stopMic.current?.()
    stopMic.current = null
    setRecording(false)
    setResult(analyzeTake(frames.current, score))
  }

  return (
    <section className="practice">
      <div className="practice-controls">
        <label>
          Tune{' '}
          <select
            value={tuneId}
            disabled={recording}
            onChange={(event) => chooseTune(event.target.value)}
          >
            {tunes.map((tune) => (
              <option key={tune.id} value={tune.id}>
                {tune.title}
              </option>
            ))}
          </select>
        </label>
        <button onClick={recording ? stop : record}>{recording ? 'Stop' : 'Record'}</button>
        {recording && <span className="recording">Recording… start from the beginning</span>}
      </div>
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="take-summary">
          <p>
            <span className="in-tune">{result.counts['in-tune']} in tune</span>
            {' · '}
            <span className="close">{result.counts.close} a bit off</span>
            {' · '}
            <span className="wrong">
              {result.counts.wrong} wrong · {result.counts.missed} missed · {result.counts.extra}{' '}
              extra
            </span>
          </p>
          {!recording && result.stoppedAtBar !== null && (
            <p>Stopped at bar {result.stoppedAtBar}: the rest of the tune is not judged.</p>
          )}
          {result.messages.length > 0 && (
            <ul>
              {result.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Score
        tuneId={tuneId}
        statuses={result?.statuses ?? null}
        // On the note being played: the last one the take reached.
        cursorAt={recording ? Math.max(0, (result?.reached ?? 0) - 1) : null}
        onLoaded={setScore}
        onError={setError}
      />
    </section>
  )
}
