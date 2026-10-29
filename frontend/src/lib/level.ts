/** RMS amplitude (0..1) -> decibels relative to full scale (0 dB = loudest possible). */
export function toDb(rms: number): number {
  return 20 * Math.log10(Math.max(rms, 1e-6))
}
