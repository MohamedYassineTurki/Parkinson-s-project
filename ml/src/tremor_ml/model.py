from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class FeatureModel:
    version: str
    preprocessing_version: str
    feature_names: list[str]
    means: np.ndarray
    scales: np.ndarray
    coefficients: np.ndarray
    intercepts: np.ndarray
    classes: np.ndarray
    provenance: str
    clinically_validated: bool

    @classmethod
    def load(cls, path: Path) -> "FeatureModel":
        payload = json.loads(path.read_text(encoding="utf-8"))
        return cls(
            version=payload["version"],
            preprocessing_version=payload["preprocessing_version"],
            feature_names=payload["feature_names"],
            means=np.asarray(payload["means"], dtype=np.float64),
            scales=np.asarray(payload["scales"], dtype=np.float64),
            coefficients=np.asarray(payload["coefficients"], dtype=np.float64),
            intercepts=np.asarray(payload["intercepts"], dtype=np.float64),
            classes=np.asarray(payload["classes"], dtype=np.int64),
            provenance=payload["provenance"],
            clinically_validated=bool(payload["clinically_validated"]),
        )

    def predict_proba(self, features: dict[str, float]) -> np.ndarray:
        vector = np.asarray([features[name] for name in self.feature_names], dtype=np.float64)
        normalized = (vector - self.means) / np.maximum(self.scales, 1e-12)
        logits = self.coefficients @ normalized + self.intercepts
        logits -= logits.max()
        probabilities = np.exp(logits)
        probabilities /= probabilities.sum()
        output = np.zeros(4, dtype=np.float64)
        output[self.classes] = probabilities
        return output
