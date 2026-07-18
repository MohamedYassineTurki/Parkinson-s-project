from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .preprocess import extract_session_features, preprocess_samples, sliding_windows


@dataclass(frozen=True)
class Dataset:
    session_features: list[dict[str, float]]
    windows: np.ndarray
    window_labels: np.ndarray
    window_groups: np.ndarray
    labels: np.ndarray
    groups: np.ndarray


def load_dataset(manifest_path: Path) -> Dataset:
    with manifest_path.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    required = {"recording_path", "label", "participant_id"}
    if not rows or not required.issubset(rows[0]):
        raise ValueError(f"Manifest must contain {sorted(required)}.")

    features: list[dict[str, float]] = []
    labels: list[int] = []
    groups: list[str] = []
    all_windows: list[np.ndarray] = []
    window_labels: list[int] = []
    window_groups: list[str] = []
    for row in rows:
        label = int(row["label"])
        if label not in (0, 1, 2, 3):
            raise ValueError("Severity labels must be integers from 0 through 3.")
        recording_path = (manifest_path.parent / row["recording_path"]).resolve()
        payload = json.loads(recording_path.read_text(encoding="utf-8"))
        recording = preprocess_samples(payload["samples"])
        windows = sliding_windows(recording.values)
        if len(windows) == 0:
            continue
        features.append(extract_session_features(recording))
        labels.append(label)
        groups.append(row["participant_id"])
        all_windows.extend(windows)
        window_labels.extend([label] * len(windows))
        window_groups.extend([row["participant_id"]] * len(windows))
    if not features:
        raise ValueError("No recordings produced a complete analysis window.")
    return Dataset(
        session_features=features,
        windows=np.asarray(all_windows, dtype=np.float32),
        window_labels=np.asarray(window_labels, dtype=np.int64),
        window_groups=np.asarray(window_groups),
        labels=np.asarray(labels, dtype=np.int64),
        groups=np.asarray(groups),
    )


def participant_split(groups: np.ndarray, test_size: float = 0.2):
    from sklearn.model_selection import GroupShuffleSplit

    if len(set(groups.tolist())) < 5:
        raise ValueError("At least five participants are required for participant-disjoint evaluation.")
    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=42)
    return next(splitter.split(np.zeros(len(groups)), groups=groups))
