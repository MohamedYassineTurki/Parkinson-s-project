import numpy as np

from tremor_ml.preprocess import TARGET_SAMPLE_RATE_HZ, extract_session_features, preprocess_samples, sliding_windows


def sine_signal(frequency_hz: float = 5.0):
    return [
        {"t": index * 20.0, "x": np.sin(2 * np.pi * frequency_hz * index / 50), "y": 0.7 * np.sin(2 * np.pi * frequency_hz * index / 50), "z": 9.81 + 0.4 * np.sin(2 * np.pi * frequency_hz * index / 50)}
        for index in range(500)
    ]


def test_preprocessing_has_fixed_rate_normalized_axes_and_real_windows():
    recording = preprocess_samples(sine_signal())
    assert recording.sample_rate_hz == TARGET_SAMPLE_RATE_HZ
    assert len(recording.values) == 500
    assert np.allclose(recording.values.mean(axis=0), 0, atol=1e-7)
    assert sliding_windows(recording.values).shape == (10, 90, 3)


def test_feature_extraction_identifies_tremor_band():
    features = extract_session_features(preprocess_samples(sine_signal()))
    assert abs(features["median_dominant_frequency_hz"] - 5) < 0.6
    assert features["window_count"] == 10
