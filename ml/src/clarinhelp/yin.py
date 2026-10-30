"""YIN pitch detector, mirrored from frontend/src/lib/yin.ts.

Same algorithm and same defaults as in the browser, so that what we measure
offline is what the live tuner actually does.
"""

import numpy as np

# Same framing as the AudioWorklet (frontend/src/audio/pitch-processor.ts).
FRAME_SIZE = 2048
HOP_SIZE = 1024


def yin(frame, sample_rate, min_frequency=120.0, max_frequency=2200.0, threshold=0.15):
    """Return (frequency in Hz, confidence 0..1) for one frame, or None if not periodic."""
    frame = np.asarray(frame, dtype=float)
    tau_min = max(2, int(sample_rate // max_frequency))
    tau_max = min(len(frame) // 2, int(np.ceil(sample_rate / min_frequency)))
    window_size = len(frame) - tau_max

    # Step 1: difference function d(tau) = sum (x[j] - x[j + tau])^2, for j < window_size.
    # Same values as the double loop of yin.ts, computed faster by expanding the square:
    # d(tau) = sum x[j]^2 + sum x[j + tau]^2 - 2 * sum x[j] * x[j + tau]
    # The last sum (a cross-correlation) is computed for every tau at once with an FFT.
    head = frame[:window_size]
    energy = np.cumsum(np.concatenate([[0.0], frame**2]))
    shifted_energy = energy[window_size : window_size + tau_max + 1] - energy[: tau_max + 1]
    size = 2 ** int(np.ceil(np.log2(len(frame) + window_size)))
    spectrum = np.fft.rfft(frame, size) * np.conj(np.fft.rfft(head, size))
    correlation = np.fft.irfft(spectrum, size)[: tau_max + 1]
    diff = np.maximum(energy[window_size] + shifted_energy - 2 * correlation, 0.0)

    # Step 2: cumulative mean normalized difference.
    running_sum = np.cumsum(diff[1:])
    cmnd = np.ones(tau_max + 1)
    taus = np.arange(1, tau_max + 1)
    nonzero = running_sum > 0
    cmnd[1:][nonzero] = diff[1:][nonzero] * taus[nonzero] / running_sum[nonzero]

    # Step 3: first dip under the threshold, then slide down to its bottom.
    below = np.nonzero(cmnd[tau_min:] < threshold)[0]
    if len(below) == 0:
        return None
    tau = tau_min + below[0]
    while tau < tau_max and cmnd[tau + 1] < cmnd[tau]:
        tau += 1

    # Step 4: refine the period between two samples.
    period = parabolic_minimum(cmnd, tau)
    return sample_rate / period, 1 - cmnd[tau]


def parabolic_minimum(values, i):
    """Fit a parabola through (i-1, i, i+1) and return the x of its lowest point."""
    if i <= 0 or i >= len(values) - 1:
        return float(i)
    left, middle, right = values[i - 1], values[i], values[i + 1]
    curvature = left - 2 * middle + right
    return float(i) if curvature == 0 else i + (left - right) / (2 * curvature)


def track(signal, sample_rate, frame_size=FRAME_SIZE, hop_size=HOP_SIZE):
    """Run YIN over a whole recording.

    Returns three arrays, one value per frame: time of the frame centre (s),
    frequency (Hz, NaN when no pitch) and RMS level.
    """
    signal = np.asarray(signal, dtype=float)
    starts = range(0, len(signal) - frame_size + 1, hop_size)
    times, frequencies, rms = [], [], []
    for start in starts:
        frame = signal[start : start + frame_size]
        estimate = yin(frame, sample_rate)
        times.append((start + frame_size / 2) / sample_rate)
        frequencies.append(np.nan if estimate is None else estimate[0])
        rms.append(np.sqrt(np.mean(frame**2)))
    return np.array(times), np.array(frequencies), np.array(rms)
