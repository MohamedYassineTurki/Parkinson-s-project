from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.metrics import balanced_accuracy_score, classification_report, confusion_matrix, f1_score

from .dataset import load_dataset, participant_split
from .preprocess import PREPROCESSING_VERSION, WINDOW_SIZE


def build_model():
    try:
        import tensorflow as tf
    except ImportError as error:
        raise RuntimeError("Install the optional CNN dependencies with pip install -e '.[cnn]'.") from error
    return tf.keras.Sequential([
        tf.keras.layers.Input(shape=(WINDOW_SIZE, 3)),
        tf.keras.layers.SeparableConv1D(16, 5, padding="same", activation="relu"),
        tf.keras.layers.MaxPooling1D(2),
        tf.keras.layers.SeparableConv1D(24, 5, padding="same", activation="relu"),
        tf.keras.layers.GlobalAveragePooling1D(),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(4, activation="softmax"),
    ], name="tiny_tremor_cnn")


def main() -> None:
    import tensorflow as tf

    parser = argparse.ArgumentParser(description="Train and validate the tiny 1D CNN by participant.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--version", default="tiny-cnn-v1")
    parser.add_argument("--epochs", type=int, default=40)
    args = parser.parse_args()
    tf.keras.utils.set_random_seed(42)

    dataset = load_dataset(args.manifest)
    train_pool_indices, test_indices = participant_split(dataset.window_groups)
    relative_train_indices, relative_validation_indices = participant_split(
        dataset.window_groups[train_pool_indices], test_size=0.2,
    )
    train_indices = train_pool_indices[relative_train_indices]
    validation_indices = train_pool_indices[relative_validation_indices]
    model = build_model()
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    history = model.fit(
        dataset.windows[train_indices], dataset.window_labels[train_indices],
        validation_data=(dataset.windows[validation_indices], dataset.window_labels[validation_indices]),
        epochs=args.epochs, batch_size=64, verbose=2,
        callbacks=[tf.keras.callbacks.EarlyStopping(patience=6, restore_best_weights=True)],
    )
    probabilities = model.predict(dataset.windows[test_indices], verbose=0)
    predictions = probabilities.argmax(axis=1)
    labels = dataset.window_labels[test_indices]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    model.save(args.output_dir / "model.keras")
    metrics = {
        "version": args.version,
        "preprocessing_version": PREPROCESSING_VERSION,
        "parameter_count": model.count_params(),
        "balanced_accuracy": float(balanced_accuracy_score(labels, predictions)),
        "macro_f1": float(f1_score(labels, predictions, average="macro", zero_division=0)),
        "classification_report": classification_report(labels, predictions, output_dict=True, zero_division=0),
        "confusion_matrix": confusion_matrix(labels, predictions, labels=[0, 1, 2, 3]).tolist(),
        "epochs_completed": len(history.history["loss"]),
        "test_participants": sorted(set(dataset.window_groups[test_indices].tolist())),
        "validation_participants": sorted(set(dataset.window_groups[validation_indices].tolist())),
        "warning": "Research/demo model only; not clinically validated.",
    }
    (args.output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
