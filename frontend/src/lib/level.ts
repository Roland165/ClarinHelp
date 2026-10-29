/** RMS amplitude (0..1) -> decibels relative to full scale (0 dB = loudest possible). */
export function toDb(rms: number): number {
  return 20 * Math.log10(Math.max(rms, 1e-6))
}

// Before we have heard anything: about 3/4 of the level bar.
const START_GATE_DB = -15
// A note counts if it is at most this much softer than the recent playing level
// (a beginner's piano is ~15 dB below their forte).
const MARGIN_DB = 20
// How fast we follow the player: 0.1 per frame = ~0.2 s at 47 frames/s.
const ADAPT = 0.1
// Never go low enough to let room noise through.
const MIN_GATE_DB = -55

/**
 * Silence threshold that follows the player's own loudness.
 * It only learns from frames where a note is heard, so it stays put during
 * silences and breaths instead of dropping as soon as you stop playing.
 */
export class LevelGate {
  private playingDb: number | null = null

  update(db: number, noteHeard: boolean) {
    if (!noteHeard) return
    this.playingDb = this.playingDb === null ? db : this.playingDb + ADAPT * (db - this.playingDb)
  }

  get gateDb(): number {
    if (this.playingDb === null) return START_GATE_DB
    return Math.max(MIN_GATE_DB, this.playingDb - MARGIN_DB)
  }

  reset() {
    this.playingDb = null
  }
}
