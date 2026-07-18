from __future__ import annotations

import hmac
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

from .model import FeatureModel
from .preprocess import PREPROCESSING_VERSION, extract_session_features, preprocess_samples, sliding_windows

SEVERITY_LABELS = ("none", "low", "medium", "high")


class Sample(BaseModel):
    t: float = Field(ge=0, le=20_000)
    x: float
    y: float
    z: float


class AnalyzeRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100)
    samples: list[Sample] = Field(min_length=90, max_length=2_000)


class ModelInfo(BaseModel):
    version: str
    model_type: str = "feature-logistic-regression"
    provenance: str
    clinically_validated: bool


class AnalyzeResponse(BaseModel):
    request_id: str
    status: str = "success"
    model: ModelInfo
    preprocessing_version: str
    predicted_severity_class: int
    predicted_severity_label: str
    probabilities: list[float]
    confidence: float
    features: dict[str, float]
    window_count: int
    inference_duration_ms: float


class ModelRegistry:
    def __init__(self, model_path: Path):
        self.model_path = model_path
        self.model: FeatureModel | None = None
        self.error: str | None = None

    def load(self):
        try:
            self.model = FeatureModel.load(self.model_path)
            if self.model.preprocessing_version != PREPROCESSING_VERSION:
                raise ValueError("Model preprocessing version does not match the service.")
        except Exception as error:  # service remains healthy enough to expose diagnostics
            self.error = str(error)
            self.model = None


def create_app(model_path: Path | None = None, api_key: str | None = None) -> FastAPI:
    resolved_model_path = model_path or Path(os.getenv("ML_MODEL_PATH", "models/demo-feature-v1/model.json"))
    configured_api_key = api_key if api_key is not None else os.getenv("ML_SERVICE_API_KEY", "")
    registry = ModelRegistry(resolved_model_path)
    api_key_header = APIKeyHeader(name="X-ML-Service-Key", auto_error=False)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        registry.load()
        yield

    app = FastAPI(
        title="Parkinson Project Tremor Inference",
        version="1.0.0",
        description="Research tremor-pattern inference; not a diagnostic service.",
        lifespan=lifespan,
    )

    def authorize(value: str | None = Security(api_key_header)):
        if not configured_api_key:
            raise HTTPException(status_code=503, detail="ML_SERVICE_API_KEY is not configured.")
        if configured_api_key and (value is None or not hmac.compare_digest(value, configured_api_key)):
            raise HTTPException(status_code=401, detail="Invalid service key.")

    @app.get("/health")
    def health():
        return {
            "status": "ok" if registry.model else "degraded",
            "model_loaded": registry.model is not None,
            "model_version": registry.model.version if registry.model else None,
            "error": registry.error,
        }

    @app.get("/v1/models/current", dependencies=[Depends(authorize)])
    def current_model():
        model = require_model(registry)
        return model_info(model)

    @app.post("/v1/analyze-session", response_model=AnalyzeResponse, dependencies=[Depends(authorize)])
    def analyze(payload: AnalyzeRequest):
        started = time.perf_counter()
        model = require_model(registry)
        recording = preprocess_samples(sample.model_dump() for sample in payload.samples)
        windows = sliding_windows(recording.values)
        if len(windows) == 0:
            raise HTTPException(status_code=422, detail="No complete 90-sample window was produced.")
        features = extract_session_features(recording)
        probabilities = model.predict_proba(features)
        severity_class = int(np.argmax(probabilities))
        return AnalyzeResponse(
            request_id=str(uuid.uuid4()),
            model=model_info(model),
            preprocessing_version=PREPROCESSING_VERSION,
            predicted_severity_class=severity_class,
            predicted_severity_label=SEVERITY_LABELS[severity_class],
            probabilities=[float(value) for value in probabilities],
            confidence=float(probabilities[severity_class]),
            features=features,
            window_count=len(windows),
            inference_duration_ms=(time.perf_counter() - started) * 1_000,
        )

    return app


def require_model(registry: ModelRegistry):
    if registry.model is None:
        raise HTTPException(status_code=503, detail="No compatible inference model is loaded.")
    return registry.model


def model_info(model: FeatureModel):
    return ModelInfo(
        version=model.version,
        provenance=model.provenance,
        clinically_validated=model.clinically_validated,
    )


app = create_app()
