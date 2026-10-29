import { concertToWritten, midiToName, nearestNote } from '../lib/pitch'

// Within ±5 cents most listeners can't hear the difference: call it in tune.
const IN_TUNE_CENTS = 5
const CLOSE_CENTS = 15

function tuningClass(cents: number): string {
  const off = Math.abs(cents)
  if (off <= IN_TUNE_CENTS) return 'in-tune'
  if (off <= CLOSE_CENTS) return 'close'
  return 'off'
}

export function Tuner({ frequency }: { frequency: number | null }) {
  if (frequency === null) {
    return (
      <div className="tuner">
        <div className="tuner-note">–</div>
        <Needle cents={null} />
        <div className="tuner-details">Play a note</div>
      </div>
    )
  }

  // The mic hears concert pitch; a clarinettist reads written pitch.
  const { midi, cents } = nearestNote(frequency)
  const written = midiToName(concertToWritten(midi))
  const sign = cents > 0 ? '+' : ''

  return (
    <div className={`tuner ${tuningClass(cents)}`}>
      <div className="tuner-note">{written}</div>
      <Needle cents={cents} />
      <div className="tuner-details">
        {sign}
        {cents.toFixed(0)} cents · concert {midiToName(midi)} · {frequency.toFixed(1)} Hz
      </div>
    </div>
  )
}

// Horizontal scale from -50 (flat) to +50 cents (sharp), 0 in the middle.
function Needle({ cents }: { cents: number | null }) {
  return (
    <div className="needle-scale">
      <span className="needle-label left">♭</span>
      <span className="needle-center" />
      {cents !== null && <span className="needle" style={{ left: `${50 + cents}%` }} />}
      <span className="needle-label right">♯</span>
    </div>
  )
}
