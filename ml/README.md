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

## Generate smoke-test data and train the lightweight feature model

```bash
python -m tremor_ml.generate_synthetic_dataset --output-dir /tmp/tremor-synthetic
python -m tremor_ml.train \
  --manifest /tmp/tremor-synthetic/manifest.csv \
  --output-dir models/demo-feature-v1 \
  --version demo-feature-v1 \
  --provenance synthetic-pipeline-validation
```

The command writes the model, feature schema, test metrics, confusion matrix,
and exact run metadata. The JSON artifact contains numeric coefficients rather
than executable pickle content. It fails when the dataset is not suitable for
participant-disjoint evaluation.

## Train the tiny CNN

```bash
pip install -e '.[cnn]'
python -m tremor_ml.train_cnn \
  --manifest /tmp/tremor-synthetic/manifest.csv \
  --output-dir models/demo-cnn-v1
```

The CNN uses two small separable 1D convolution blocks and global average
pooling. Its validation split is participant-disjoint. The inference service
deliberately serves the much lighter feature model; the CNN remains an offline
research candidate until trained and validated on a suitable real dataset.

## Run the inference API

```bash
export ML_MODEL_PATH=models/demo-feature-v1/model.json
export ML_SERVICE_API_KEY=replace-with-a-long-random-key
uvicorn tremor_ml.api:app --host 0.0.0.0 --port 8000
```

Endpoints are `GET /health`, authenticated `GET /v1/models/current`, and
authenticated `POST /v1/analyze-session`. The Next.js server calls this API;
the patient's browser never receives the internal service key.

Raw recordings are health-related data. Keep the dataset outside Git, remove
identifiers, obtain explicit consent, and validate any model with qualified
clinical collaborators before real-world use.
