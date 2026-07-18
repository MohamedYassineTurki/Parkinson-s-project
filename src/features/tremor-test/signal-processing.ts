import type {
  AccelerationSample,
  TremorAnalysisResult,
  TremorSeverityLabel,
} from "./types";

const ALGORITHM_VERSION = "signal-v1" as const;
const WINDOW_SIZE = 90;
const WINDOW_STEP = 45;
const MIN_ANALYSIS_SAMPLES = 90;
const MIN_FREQUENCY_HZ = 0.5;
const MAX_FREQUENCY_HZ = 12;
const TREMOR_BAND_MIN_HZ = 3;
const TREMOR_BAND_MAX_HZ = 7;

export function analyzeTremorSignal(
  samples: AccelerationSample[],
): TremorAnalysisResult {
  const notes: string[] = [];

  if (samples.length < MIN_ANALYSIS_SAMPLES) {
    notes.push("Not enough samples for signal analysis.");
    return emptyAnalysis(notes);
  }

  const detrendedAxes = detrendAxes(samples);
  const sampleRateHz = estimateSampleRate(samples);
  const spectrum = combineSpectra([
    calculatePowerSpectrum(detrendedAxes.map((sample) => sample.x), sampleRateHz),
    calculatePowerSpectrum(detrendedAxes.map((sample) => sample.y), sampleRateHz),
    calculatePowerSpectrum(detrendedAxes.map((sample) => sample.z), sampleRateHz),
  ]);
  const usableSpectrum = spectrum.filter(
    (point) =>
      point.frequencyHz >= MIN_FREQUENCY_HZ && point.frequencyHz <= MAX_FREQUENCY_HZ,
  );
  const tremorBand = usableSpectrum.filter(
    (point) =>
      point.frequencyHz >= TREMOR_BAND_MIN_HZ &&
      point.frequencyHz <= TREMOR_BAND_MAX_HZ,
  );

  const totalPower = sumPower(usableSpectrum);
  const tremorPower = sumPower(tremorBand);
  const dominantPoint = findDominantPoint(tremorBand);
  const spectralConcentration = totalPower > 0 ? tremorPower / totalPower : 0;
  const rmsIntensity = calculateVectorRms(detrendedAxes);
  const windowCount = createSlidingWindows(samples.length).length;
  const severityClass = classifySeverity(tremorPower, spectralConcentration);
  const severityLabel = getSeverityLabel(severityClass);

  if (!dominantPoint) {
    notes.push("No dominant tremor-band frequency was detected.");
  }

  if (spectralConcentration < 0.2) {
    notes.push("Movement energy is not concentrated in the expected tremor band.");
  }

  return {
    algorithmVersion: ALGORITHM_VERSION,
    severityClass,
    severityLabel,
    rmsIntensity,
    dominantFrequencyHz: dominantPoint?.frequencyHz ?? null,
    tremorPower,
    spectralConcentration,
    windowCount,
    notes,
  };
}

function emptyAnalysis(notes: string[]): TremorAnalysisResult {
  return {
    algorithmVersion: ALGORITHM_VERSION,
    severityClass: 0,
    severityLabel: "none",
    rmsIntensity: 0,
    dominantFrequencyHz: null,
    tremorPower: 0,
    spectralConcentration: 0,
    windowCount: 0,
    notes,
  };
}

function detrendAxes(samples: AccelerationSample[]) {
  const xMean = average(samples.map((sample) => sample.x));
  const yMean = average(samples.map((sample) => sample.y));
  const zMean = average(samples.map((sample) => sample.z));
  return samples.map((sample) => ({
    x: sample.x - xMean,
    y: sample.y - yMean,
    z: sample.z - zMean,
  }));
}

function estimateSampleRate(samples: AccelerationSample[]) {
  const durationMs = samples[samples.length - 1].t - samples[0].t;

  return durationMs > 0 ? ((samples.length - 1) / durationMs) * 1000 : 0;
}

function calculatePowerSpectrum(values: number[], sampleRateHz: number) {
  if (sampleRateHz <= 0) {
    return [];
  }

  const result: Array<{ frequencyHz: number; power: number }> = [];
  const maxBin = Math.floor(values.length / 2);

  for (let bin = 1; bin <= maxBin; bin += 1) {
    const frequencyHz = (bin * sampleRateHz) / values.length;

    if (frequencyHz > MAX_FREQUENCY_HZ) {
      break;
    }

    let real = 0;
    let imaginary = 0;

    for (let index = 0; index < values.length; index += 1) {
      const angle = (2 * Math.PI * bin * index) / values.length;
      real += values[index] * Math.cos(angle);
      imaginary -= values[index] * Math.sin(angle);
    }

    result.push({
      frequencyHz,
      power: (real ** 2 + imaginary ** 2) / values.length,
    });
  }

  return result;
}

function combineSpectra(spectra: Array<Array<{ frequencyHz: number; power: number }>>) {
  const first = spectra[0] ?? [];
  return first.map((point, index) => ({
    frequencyHz: point.frequencyHz,
    power: spectra.reduce((sum, spectrum) => sum + (spectrum[index]?.power ?? 0), 0),
  }));
}

function sumPower(spectrum: Array<{ power: number }>) {
  return spectrum.reduce((sum, point) => sum + point.power, 0);
}

function findDominantPoint(spectrum: Array<{ frequencyHz: number; power: number }>) {
  return spectrum.reduce<(typeof spectrum)[number] | null>((best, point) => {
    if (!best || point.power > best.power) {
      return point;
    }

    return best;
  }, null);
}

function calculateVectorRms(values: Array<{ x: number; y: number; z: number }>) {
  const meanSquare = values.reduce(
    (sum, value) => sum + value.x ** 2 + value.y ** 2 + value.z ** 2,
    0,
  ) / values.length;

  return Math.sqrt(meanSquare);
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createSlidingWindows(sampleCount: number) {
  const windows: Array<{ start: number; end: number }> = [];

  for (let start = 0; start + WINDOW_SIZE <= sampleCount; start += WINDOW_STEP) {
    windows.push({
      start,
      end: start + WINDOW_SIZE,
    });
  }

  return windows;
}

function classifySeverity(
  tremorPower: number,
  spectralConcentration: number,
): 0 | 1 | 2 | 3 {
  const weightedPower = tremorPower * Math.max(spectralConcentration, 0.1);

  if (weightedPower < 4) {
    return 0;
  }

  if (weightedPower < 12) {
    return 1;
  }

  if (weightedPower < 28) {
    return 2;
  }

  return 3;
}

function getSeverityLabel(severityClass: 0 | 1 | 2 | 3): TremorSeverityLabel {
  switch (severityClass) {
    case 0:
      return "none";
    case 1:
      return "low";
    case 2:
      return "medium";
    case 3:
      return "high";
  }
}
