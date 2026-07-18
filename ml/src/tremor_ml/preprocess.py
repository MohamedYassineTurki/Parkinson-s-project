"""Python reference implementation of the web app's signal-v2 preprocessing."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping

import numpy as np

PREPROCESSING_VERSION = "signal-v2"
TARGET_SAMPLE_RATE_HZ = 50
WINDOW_SIZE = 90
WINDOW_STEP = 45
GRAVITY_SMOOTHING_ALPHA = 0.9


@dataclass(frozen=True)
class ProcessedRecording:
    values: np.ndarray  # shape: [samples, 3], normalized X/Y/Z
    analysis_values: np.ndarray  # gravity-reduced physical values for longitudinal metrics
    timestamps_ms: np.ndarray
    sample_rate_hz: int


def preprocess_samples(samples: Iterable[Mapping[str, float]]) -> ProcessedRecording:
    """Sort, deduplicate, interpolate, remove gravity, then z-normalize X/Y/Z."""
    rows = sorted(
        ((float(item["t"]), float(item["x"]), float(item["y"]), float(item["z"])) for item in samples),
        key=lambda item: item[0],
    )
    rows = [row for index, row in enumerate(rows) if index == 0 or row[0] > rows[index - 1][0]]
    if len(rows) < 2:
        return ProcessedRecording(np.empty((0, 3)), np.empty((0, 3)), np.empty(0), TARGET_SAMPLE_RATE_HZ)

    raw = np.asarray(rows, dtype=np.float64)
    timestamps = np.arange(raw[0, 0], raw[-1, 0] + 1e-8, 1000 / TARGET_SAMPLE_RATE_HZ)
    resampled = np.column_stack([np.interp(timestamps, raw[:, 0], raw[:, axis]) for axis in (1, 2, 3)])

    gravity = resampled[0].copy()
    linear = np.empty_like(resampled)
    for index, sample in enumerate(resampled):
        gravity = GRAVITY_SMOOTHING_ALPHA * gravity + (1 - GRAVITY_SMOOTHING_ALPHA) * sample
        linear[index] = sample - gravity

    means = linear.mean(axis=0)
    standard_deviations = np.maximum(linear.std(axis=0), 1e-8)
    return ProcessedRecording((linear - means) / standard_deviations, linear, timestamps - timestamps[0], TARGET_SAMPLE_RATE_HZ)


def sliding_windows(values: np.ndarray, size: int = WINDOW_SIZE, step: int = WINDOW_STEP) -> np.ndarray:
    if len(values) < size:
        return np.empty((0, size, 3), dtype=np.float64)
    return np.asarray([values[start : start + size] for start in range(0, len(values) - size + 1, step)])


def extract_session_features(recording: ProcessedRecording) -> dict[str, float]:
    """Feature baseline used before CNN experiments; derived from the same windows."""
    windows = sliding_windows(recording.analysis_values)
    if len(windows) == 0:
        raise ValueError("Recording has fewer than one complete 90-sample window.")
    powers, concentrations, frequencies, rms_values = [], [], [], []
    for window in windows:
        spectrum = np.sum(np.abs(np.fft.rfft(window, axis=0)) ** 2 / len(window), axis=1)
        frequencies_hz = np.fft.rfftfreq(len(window), d=1 / recording.sample_rate_hz)
        usable = (frequencies_hz >= 0.5) & (frequencies_hz <= 12)
        tremor = (frequencies_hz >= 3) & (frequencies_hz <= 7)
        total = float(spectrum[usable].sum())
        power = float(spectrum[tremor].sum())
        powers.append(power)
        concentrations.append(power / total if total > 1e-8 else 0.0)
        if tremor.any():
            band_indices = np.where(tremor)[0]
            frequencies.append(float(frequencies_hz[band_indices[np.argmax(spectrum[tremor])]]))
        rms_values.append(float(np.sqrt(np.mean(np.sum(window**2, axis=1)))))
    return {
        "median_tremor_power": float(np.median(powers)),
        "median_spectral_concentration": float(np.median(concentrations)),
        "median_dominant_frequency_hz": float(np.median(frequencies)),
        "median_rms_intensity": float(np.median(rms_values)),
        "tremor_window_percent": float(100 * np.mean((np.asarray(concentrations) >= 0.35) & (np.asarray(powers) > 0.2))),
        "window_count": float(len(windows)),
    }
