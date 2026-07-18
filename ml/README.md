# Tremor ML package

This package is the reproducible training foundation for the web application's
`signal-v2` pipeline. It is intentionally **not** a Parkinson's diagnosis
model. Its supported target is four-level tremor-pattern severity.

## Install

```bash
cd ml
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
```

Install `.[cnn]` only when a reviewed labelled dataset is available and a CNN
experiment is required. The default training command uses an auditable
feature-based baseline model first.

## Dataset contract

Create a CSV manifest with these columns:

```text
recording_path,label,participant_id
data/p001-test-01.json,1,p001
```

Each JSON file must contain `samples`, an array of `{t, x, y, z}` values where
`t` is milliseconds. Labels are `0` no detected tremor, `1` low, `2` medium,
and `3` high. Split data by `participant_id`, never by overlapping windows.

## Train the baseline model

```bash
python -m tremor_ml.train --manifest manifest.csv --output-dir artifacts/baseline-v1
```

The command writes the model, feature schema, test metrics, confusion matrix,
and exact run metadata. It fails when the dataset is not suitable for a
participant-disjoint evaluation.

Raw recordings are health-related data. Keep the dataset outside Git, remove
identifiers, obtain explicit consent, and validate any model with qualified
clinical collaborators before real-world use.
