import { useRef, useState } from 'react'
import { startPitchTracker, type PitchFrame } from './audio/mic'

// Anything quieter than -60 dB is shown as an empty bar.
const SILENCE_DB = -60

function toDb(rms: number): number {
  return 20 * Math.log10(Math.max(rms, 1e-6))
}

function App() {
  const [listening, setListening] = useState(false)
  const [frame, setFrame] = useState<PitchFrame | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stopMic = useRef<(() => void) | null>(null)

  async function start() {
    setError(null)
    try {
      stopMic.current = await startPitchTracker(setFrame)
      setListening(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function stop() {
    stopMic.current?.()
    stopMic.current = null
    setListening(false)
    setFrame(null)
  }

  const db = toDb(frame?.rms ?? 0)
  const fill = Math.min(100, Math.max(0, (1 - db / SILENCE_DB) * 100))

  return (
    <main>
      <h1>ClarinHelp</h1>

      <button onClick={listening ? stop : start}>
        {listening ? 'Stop' : 'Start microphone'}
      </button>
      {error && <p className="error">Could not open the microphone: {error}</p>}

      <p className="frequency">
        {frame?.frequency ? `${frame.frequency.toFixed(1)} Hz` : '–'}
      </p>

      <div className="meter">
        <div className="meter-fill" style={{ width: `${fill}%` }} />
      </div>
      <p>
        {listening ? `${db.toFixed(0)} dB · confidence ${frame?.confidence.toFixed(2) ?? '–'}` : '–'}
      </p>
    </main>
  )
}

export default App
