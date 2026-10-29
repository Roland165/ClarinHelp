import { useRef, useState } from 'react'
import { startPitchTracker, type PitchFrame } from './audio/mic'
import { Tuner } from './components/Tuner'
import { toDb } from './lib/level'
import { PitchSmoother } from './lib/smoothing'

// The level bar goes from -60 dB (empty) to 0 dB (full).
const METER_FLOOR_DB = -60

function meterPercent(db: number): number {
  return Math.min(100, Math.max(0, (1 - db / METER_FLOOR_DB) * 100))
}

function App() {
  const [listening, setListening] = useState(false)
  const [frame, setFrame] = useState<PitchFrame | null>(null)
  const [frequency, setFrequency] = useState<number | null>(null)
  const [gateDb, setGateDb] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stopMic = useRef<(() => void) | null>(null)
  const smoother = useRef(new PitchSmoother())

  function onFrame(raw: PitchFrame) {
    setFrame(raw)
    setFrequency(smoother.current.push(raw))
    setGateDb(smoother.current.gateDb)
  }

  async function start() {
    setError(null)
    smoother.current.reset()
    try {
      stopMic.current = await startPitchTracker(onFrame)
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
    setFrequency(null)
    setGateDb(null)
  }

  const db = toDb(frame?.rms ?? 0)

  return (
    <main>
      <h1>ClarinHelp</h1>

      <button onClick={listening ? stop : start}>
        {listening ? 'Stop' : 'Start microphone'}
      </button>
      {error && <p className="error">Could not open the microphone: {error}</p>}

      <Tuner frequency={frequency} />

      <div className="meter">
        <div className="meter-fill" style={{ width: `${meterPercent(db)}%` }} />
        {/* Under this mark the tuner treats the sound as silence. */}
        {gateDb !== null && (
          <div className="meter-gate" style={{ left: `${meterPercent(gateDb)}%` }} />
        )}
      </div>
      <p>
        {listening
          ? `${db.toFixed(0)} dB · threshold ${gateDb?.toFixed(0) ?? '–'} dB · confidence ${frame?.confidence.toFixed(2) ?? '–'}`
          : '–'}
      </p>
    </main>
  )
}

export default App
