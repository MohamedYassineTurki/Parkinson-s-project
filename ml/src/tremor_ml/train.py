from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import GroupShuffleSplit

from .preprocess import PREPROCESSING_VERSION, extract_session_features, preprocess_samples


def load_manifest(path: Path):
    with path.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    required = {"recording_path", "label", "participant_id"}
    if not rows or not required.issubset(rows[0]):
        raise ValueError(f"Manifest must contain {sorted(required)}.")
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a participant-disjoint tremor severity baseline model.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    rows = load_manifest(args.manifest)
    feature_rows, labels, groups = [], [], []
    for row in rows:
        recording_path = (args.manifest.parent / row["recording_path"]).resolve()
        with recording_path.open(encoding="utf-8") as file:
            payload = json.load(file)
        feature_rows.append(extract_session_features(preprocess_samples(payload["samples"])))
        labels.append(int(row["label"]))
        groups.append(row["participant_id"])

    if len(set(groups)) < 2:
        raise ValueError("At least two participants are required for participant-disjoint evaluation.")
    feature_names = list(feature_rows[0])
    features = np.asarray([[row[name] for name in feature_names] for row in feature_rows])
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_indices, test_indices = next(splitter.split(features, labels, groups))
    model = RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=42)
    model.fit(features[train_indices], np.asarray(labels)[train_indices])
    predictions = model.predict(features[test_indices])

    args.output_dir.mkdir(parents=True, exist_ok=True)
    import pickle
    with (args.output_dir / "model.pkl").open("wb") as file:
        pickle.dump(model, file)
    (args.output_dir / "metadata.json").write_text(json.dumps({"preprocessing_version": PREPROCESSING_VERSION, "feature_names": feature_names, "train_participants": sorted({groups[i] for i in train_indices}), "test_participants": sorted({groups[i] for i in test_indices})}, indent=2), encoding="utf-8")
    (args.output_dir / "metrics.json").write_text(json.dumps({"classification_report": classification_report(np.asarray(labels)[test_indices], predictions, output_dict=True, zero_division=0), "confusion_matrix": confusion_matrix(np.asarray(labels)[test_indices], predictions).tolist()}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
