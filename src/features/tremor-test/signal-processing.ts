import type { AccelerationSample, TremorAnalysisResult, TremorSeverityLabel } from "./types";

/**
 * This processing version is intentionally persisted with every result. Do not
 * compare its physical metrics with results produced by signal-v1.
 */
export const ALGORITHM_VERSION = "signal-v2" as const;
export const TARGET_SAMPLE_RATE_HZ = 50;
export const WINDOW_SIZE = 90;
export const WINDOW_STEP = 45;
export const MIN_ANALYSIS_SAMPLES = WINDOW_SIZE;
const MIN_FREQUENCY_HZ = 0.5;
const MAX_FREQUENCY_HZ = 12;
const TREMOR_BAND_MIN_HZ = 3;
const TREMOR_BAND_MAX_HZ = 7;
const GRAVITY_SMOOTHING_ALPHA = 0.9;
const EPSILON = 1e-8;

type Vector = Pick<AccelerationSample, "x" | "y" | "z">;
type SpectrumPoint = { frequencyHz: number; power: number };

export function analyzeTremorSignal(samples: AccelerationSample[]): TremorAnalysisResult {
  const notes: string[] = [];
  const prepared = preprocessAccelerometerSamples(samples);

  if (prepared.samples.length < MIN_ANALYSIS_SAMPLES) {
    notes.push("Not enough resampled samples for windowed signal analysis.");
    return emptyAnalysis(notes, prepared.sampleRateHz);
  }

  // Physical amplitude is retained for longitudinal tremor metrics. The
  // normalized samples remain the future CNN input, where shape matters more
  // than phone-specific absolute scale.
  const windows = createSlidingWindows(prepared.analysisSamples, WINDOW_SIZE, WINDOW_STEP);
  if (windows.length === 0) {
    notes.push("No complete analysis windows were available.");
    return emptyAnalysis(notes, prepared.sampleRateHz);
  }

  const analyses = windows.map((window) => analyzeWindow(window, prepared.sampleRateHz));
  const tremorPower = median(analyses.map((item) => item.tremorPower));
  const spectralConcentration = median(analyses.map((item) => item.spectralConcentration));
  const rmsIntensity = median(analyses.map((item) => item.rmsIntensity));
  const dominantFrequencies = analyses
    .map((item) => item.dominantFrequencyHz)
    .filter((frequency): frequency is number => frequency != null);
  const dominantFrequencyHz = dominantFrequencies.length ? median(dominantFrequencies) : null;
  const tremorWindowPercent = (analyses.filter((item) => item.isTremorLike).length / analyses.length) * 100;
  const severityClass = classifySeverity(tremorPower, spectralConcentration, tremorWindowPercent);

  if (prepared.wasResampled) notes.push(`Resampled to ${TARGET_SAMPLE_RATE_HZ} Hz for consistent window analysis.`);
  if (dominantFrequencyHz == null) notes.push("No dominant tremor-band frequency was detected.");
  if (spectralConcentration < 0.2) notes.push("Movement energy is not concentrated in the expected tremor band.");

  return {
    algorithmVersion: ALGORITHM_VERSION,
    severityClass,
    severityLabel: getSeverityLabel(severityClass),
    rmsIntensity,
    dominantFrequencyHz,
    tremorPower,
    spectralConcentration,
    windowCount: windows.length,
    tremorWindowPercent,
    processedSampleCount: prepared.samples.length,
    processedSampleRateHz: prepared.sampleRateHz,
    notes,
  };
}

/** Shared contract for the browser pipeline and the future Python ML package. */
export function preprocessAccelerometerSamples(samples: AccelerationSample[]) {
  const cleaned = samples
    .filter((sample) => Number.isFinite(sample.t) && Number.isFinite(sample.x) && Number.isFinite(sample.y) && Number.isFinite(sample.z))
    .sort((a, b) => a.t - b.t)
    .filter((sample, index, values) => index === 0 || sample.t > values[index - 1].t);

  if (cleaned.length < 2) return { samples: [] as AccelerationSample[], analysisSamples: [] as AccelerationSample[], sampleRateHz: 0, wasResampled: false };

  const resampled = resampleToFixedRate(cleaned, TARGET_SAMPLE_RATE_HZ);
  const gravityRemoved = removeEstimatedGravity(resampled);
  const normalized = normalizeAxes(gravityRemoved);
  return { samples: normalized, analysisSamples: gravityRemoved, sampleRateHz: TARGET_SAMPLE_RATE_HZ, wasResampled: true };
}

function resampleToFixedRate(samples: AccelerationSample[], sampleRateHz: number) {
  const intervalMs = 1000 / sampleRateHz;
  const start = samples[0].t;
  const end = samples[samples.length - 1].t;
  const output: AccelerationSample[] = [];
  let sourceIndex = 0;

  for (let t = start; t <= end + EPSILON; t += intervalMs) {
    while (sourceIndex < samples.length - 2 && samples[sourceIndex + 1].t < t) sourceIndex += 1;
    const left = samples[sourceIndex];
    const right = samples[Math.min(sourceIndex + 1, samples.length - 1)];
    const span = right.t - left.t;
    const ratio = span > 0 ? Math.min(1, Math.max(0, (t - left.t) / span)) : 0;
    output.push({
      t: t - start,
      x: interpolate(left.x, right.x, ratio),
      y: interpolate(left.y, right.y, ratio),
      z: interpolate(left.z, right.z, ratio),
    });
  }
  return output;
}

function removeEstimatedGravity(samples: AccelerationSample[]): AccelerationSample[] {
  let gravity: Vector = { x: samples[0].x, y: samples[0].y, z: samples[0].z };
  return samples.map((sample) => {
    gravity = {
      x: GRAVITY_SMOOTHING_ALPHA * gravity.x + (1 - GRAVITY_SMOOTHING_ALPHA) * sample.x,
      y: GRAVITY_SMOOTHING_ALPHA * gravity.y + (1 - GRAVITY_SMOOTHING_ALPHA) * sample.y,
      z: GRAVITY_SMOOTHING_ALPHA * gravity.z + (1 - GRAVITY_SMOOTHING_ALPHA) * sample.z,
    };
    return { t: sample.t, x: sample.x - gravity.x, y: sample.y - gravity.y, z: sample.z - gravity.z };
  });
}

function normalizeAxes(samples: AccelerationSample[]): AccelerationSample[] {
  const means = axisStatistics(samples, "mean");
  const standardDeviations = axisStatistics(samples, "standardDeviation", means);
  return samples.map((sample) => ({
    t: sample.t,
    x: (sample.x - means.x) / Math.max(standardDeviations.x, EPSILON),
    y: (sample.y - means.y) / Math.max(standardDeviations.y, EPSILON),
    z: (sample.z - means.z) / Math.max(standardDeviations.z, EPSILON),
  }));
}

function axisStatistics(samples: AccelerationSample[], kind: "mean" | "standardDeviation", means?: Vector): Vector {
  const mean = means ?? {
    x: average(samples.map((sample) => sample.x)),
    y: average(samples.map((sample) => sample.y)),
    z: average(samples.map((sample) => sample.z)),
  };
  if (kind === "mean") return mean;
  return {
    x: Math.sqrt(average(samples.map((sample) => (sample.x - mean.x) ** 2))),
    y: Math.sqrt(average(samples.map((sample) => (sample.y - mean.y) ** 2))),
    z: Math.sqrt(average(samples.map((sample) => (sample.z - mean.z) ** 2))),
  };
}

function analyzeWindow(window: AccelerationSample[], sampleRateHz: number) {
  const spectrum = combineSpectra(["x", "y", "z"].map((axis) => calculatePowerSpectrum(window.map((sample) => sample[axis as keyof Vector]), sampleRateHz)));
  const usable = spectrum.filter((point) => point.frequencyHz >= MIN_FREQUENCY_HZ && point.frequencyHz <= MAX_FREQUENCY_HZ);
  const tremorBand = usable.filter((point) => point.frequencyHz >= TREMOR_BAND_MIN_HZ && point.frequencyHz <= TREMOR_BAND_MAX_HZ);
  const totalPower = sumPower(usable);
  const tremorPower = sumPower(tremorBand);
  const spectralConcentration = totalPower > EPSILON ? tremorPower / totalPower : 0;
  const dominant = findDominantPoint(tremorBand);
  return {
    tremorPower,
    spectralConcentration,
    dominantFrequencyHz: dominant?.frequencyHz ?? null,
    rmsIntensity: calculateVectorRms(window),
    isTremorLike: spectralConcentration >= 0.35 && tremorPower > 0.2,
  };
}

function createSlidingWindows(samples: AccelerationSample[], size: number, step: number) {
  const windows: AccelerationSample[][] = [];
  for (let start = 0; start + size <= samples.length; start += step) windows.push(samples.slice(start, start + size));
  return windows;
}

function calculatePowerSpectrum(values: number[], sampleRateHz: number): SpectrumPoint[] {
  const result: SpectrumPoint[] = [];
  for (let bin = 1; bin <= Math.floor(values.length / 2); bin += 1) {
    const frequencyHz = (bin * sampleRateHz) / values.length;
    if (frequencyHz > MAX_FREQUENCY_HZ) break;
    let real = 0;
    let imaginary = 0;
    for (let index = 0; index < values.length; index += 1) {
      const angle = (2 * Math.PI * bin * index) / values.length;
      real += values[index] * Math.cos(angle);
      imaginary -= values[index] * Math.sin(angle);
    }
    result.push({ frequencyHz, power: (real ** 2 + imaginary ** 2) / values.length });
  }
  return result;
}

function combineSpectra(spectra: SpectrumPoint[][]): SpectrumPoint[] {
  return (spectra[0] ?? []).map((point, index) => ({ frequencyHz: point.frequencyHz, power: spectra.reduce((sum, spectrum) => sum + (spectrum[index]?.power ?? 0), 0) }));
}
function classifySeverity(power: number, concentration: number, tremorWindowPercent: number): 0 | 1 | 2 | 3 {
  const score = power * Math.max(concentration, 0.1) * (0.5 + tremorWindowPercent / 200);
  if (score < 3) return 0;
  if (score < 8) return 1;
  if (score < 18) return 2;
  return 3;
}
function emptyAnalysis(notes: string[], processedSampleRateHz: number): TremorAnalysisResult {
  return { algorithmVersion: ALGORITHM_VERSION, severityClass: 0, severityLabel: "none", rmsIntensity: 0, dominantFrequencyHz: null, tremorPower: 0, spectralConcentration: 0, windowCount: 0, tremorWindowPercent: 0, processedSampleCount: 0, processedSampleRateHz, notes };
}
function getSeverityLabel(value: 0 | 1 | 2 | 3): TremorSeverityLabel { return ["none", "low", "medium", "high"][value] as TremorSeverityLabel; }
function findDominantPoint(points: SpectrumPoint[]) { return points.reduce<SpectrumPoint | null>((best, point) => !best || point.power > best.power ? point : best, null); }
function sumPower(points: SpectrumPoint[]) { return points.reduce((sum, point) => sum + point.power, 0); }
function calculateVectorRms(values: Vector[]) { return Math.sqrt(average(values.map((value) => value.x ** 2 + value.y ** 2 + value.z ** 2))); }
function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function median(values: number[]) { const ordered = [...values].sort((a, b) => a - b); const middle = Math.floor(ordered.length / 2); return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2; }
function interpolate(left: number, right: number, ratio: number) { return left + (right - left) * ratio; }
