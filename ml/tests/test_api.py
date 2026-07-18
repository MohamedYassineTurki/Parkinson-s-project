import json
from pathlib import Path

from fastapi.testclient import TestClient

from tremor_ml.api import create_app


def write_model(path: Path):
    path.write_text(json.dumps({
        "version": "test-feature-v1",
        "preprocessing_version": "signal-v2",
        "feature_names": ["median_tremor_power", "median_spectral_concentration", "median_dominant_frequency_hz", "median_rms_intensity", "tremor_window_percent", "window_count"],
        "means": [0, 0, 0, 0, 0, 0],
        "scales": [1, 1, 1, 1, 1, 1],
        "coefficients": [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]],
        "intercepts": [2, 1, 0, -1],
        "classes": [0, 1, 2, 3],
        "provenance": "unit-test",
        "clinically_validated": False,
    }), encoding="utf-8")


def samples():
    import numpy as np
    return [{"t": index * 20, "x": float(np.sin(index)), "y": float(np.cos(index)), "z": 9.81} for index in range(500)]


def test_authenticated_inference(tmp_path):
    model_path = tmp_path / "model.json"
    write_model(model_path)
    with TestClient(create_app(model_path, "secret")) as client:
        assert client.get("/health").json()["model_loaded"] is True
        assert client.post("/v1/analyze-session", json={"session_id": "s1", "samples": samples()}).status_code == 401
        response = client.post("/v1/analyze-session", headers={"X-ML-Service-Key": "secret"}, json={"session_id": "s1", "samples": samples()})
        assert response.status_code == 200
        assert response.json()["model"]["version"] == "test-feature-v1"


def test_missing_model_is_degraded(tmp_path):
    with TestClient(create_app(tmp_path / "missing.json", "")) as client:
        assert client.get("/health").json()["status"] == "degraded"
        assert client.post("/v1/analyze-session", json={"session_id": "s1", "samples": samples()}).status_code == 503
