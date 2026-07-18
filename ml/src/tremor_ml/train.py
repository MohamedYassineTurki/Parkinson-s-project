from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.preprocessing import StandardScaler

from .dataset import load_dataset, participant_split
from .preprocess import PREPROCESSING_VERSION


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a lightweight participant-disjoint feature model.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--version", default="feature-v1")
    parser.add_argument("--provenance", default="research-dataset")
    args = parser.parse_args()

    dataset = load_dataset(args.manifest)
    feature_names = list(dataset.session_features[0])
    values = np.asarray([[row[name] for name in feature_names] for row in dataset.session_features])
    train_indices, test_indices = participant_split(dataset.groups)
    scaler = StandardScaler().fit(values[train_indices])
    model = LogisticRegression(max_iter=2_000, class_weight="balanced", random_state=42)
    model.fit(scaler.transform(values[train_indices]), dataset.labels[train_indices])
    predictions = model.predict(scaler.transform(values[test_indices]))

    args.output_dir.mkdir(parents=True, exist_ok=True)
    artifact = {
        "version": args.version,
        "preprocessing_version": PREPROCESSING_VERSION,
        "model_type": "multinomial-logistic-regression",
        "feature_names": feature_names,
        "means": scaler.mean_.tolist(),
        "scales": scaler.scale_.tolist(),
        "coefficients": model.coef_.tolist(),
        "intercepts": model.intercept_.tolist(),
        "classes": model.classes_.tolist(),
        "provenance": args.provenance,
        "clinically_validated": False,
    }
    (args.output_dir / "model.json").write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    metrics = evaluation_metrics(dataset.labels[test_indices], predictions)
    metrics["train_participants"] = sorted(set(dataset.groups[train_indices].tolist()))
    metrics["test_participants"] = sorted(set(dataset.groups[test_indices].tolist()))
    metrics["warning"] = "Research/demo model only; not clinically validated."
    (args.output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")


def evaluation_metrics(labels: np.ndarray, predictions: np.ndarray):
    return {
        "balanced_accuracy": float(balanced_accuracy_score(labels, predictions)),
        "macro_f1": float(f1_score(labels, predictions, average="macro", zero_division=0)),
        "classification_report": classification_report(labels, predictions, output_dict=True, zero_division=0),
        "confusion_matrix": confusion_matrix(labels, predictions, labels=[0, 1, 2, 3]).tolist(),
    }


if __name__ == "__main__":
    main()
