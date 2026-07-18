from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate deterministic synthetic signals for pipeline smoke testing only.")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--participants", type=int, default=32)
    parser.add_argument("--recordings-per-class", type=int, default=2)
    args = parser.parse_args()
    data_dir = args.output_dir / "recordings"
    data_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for participant in range(args.participants):
        rng = np.random.default_rng(10_000 + participant)
        for label in range(4):
            for recording_index in range(args.recordings_per_class):
                name = f"p{participant:03d}-c{label}-r{recording_index}.json"
                samples = synthetic_signal(rng, label)
                (data_dir / name).write_text(json.dumps({"samples": samples}), encoding="utf-8")
                rows.append({"recording_path": f"recordings/{name}", "label": label, "participant_id": f"p{participant:03d}"})
    with (args.output_dir / "manifest.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=["recording_path", "label", "participant_id"])
        writer.writeheader()
        writer.writerows(rows)


def synthetic_signal(rng: np.random.Generator, label: int):
    sample_rate = rng.uniform(46, 62)
    timestamps = np.arange(0, 10_000, 1000 / sample_rate)
    tremor_frequency = rng.uniform(3.8, 6.2)
    amplitudes = (0.03, 0.16, 0.38, 0.72)
    amplitude = amplitudes[label] * rng.uniform(0.85, 1.15)
    phase = rng.uniform(0, 2 * np.pi)
    orientation = rng.normal(size=3)
    orientation = 9.81 * orientation / np.linalg.norm(orientation)
    axis_weights = rng.uniform(0.35, 1.0, size=3)
    samples = []
    for timestamp in timestamps:
        seconds = timestamp / 1000
        base_phase = 2 * np.pi * tremor_frequency * seconds + phase
        if label == 1:
            envelope = 0.2 + 0.8 * (np.sin(2 * np.pi * 0.35 * seconds) > 0)
            tremor = amplitude * envelope * np.sin(base_phase)
        elif label == 2:
            tremor = amplitude * np.sin(base_phase + 0.45 * np.sin(2 * np.pi * 0.4 * seconds))
        elif label == 3:
            tremor = amplitude * (np.sin(base_phase) + 0.25 * np.sin(2 * base_phase))
        else:
            tremor = 0
        drift = 0.03 * np.sin(2 * np.pi * 0.7 * seconds)
        noise = rng.normal(0, 0.025 + label * 0.004, size=3)
        values = orientation + axis_weights * tremor + drift + noise
        samples.append({"t": float(timestamp), "x": float(values[0]), "y": float(values[1]), "z": float(values[2])})
    return samples


if __name__ == "__main__":
    main()
