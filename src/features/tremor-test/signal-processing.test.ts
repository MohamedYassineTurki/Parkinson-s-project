import { describe, expect, it } from "vitest";

import { evaluateRecordingQuality } from "./sensor-recorder";
import { analyzeTremorSignal, preprocessAccelerometerSamples } from "./signal-processing";
import type { AccelerationSample } from "./types";

function makeSignal(frequencyHz: number, amplitude = 1, sampleRateHz = 50): AccelerationSample[] {
  return Array.from({ length: 500 }, (_, index) => {
    const t = (index / sampleRateHz) * 1000;
    const signal = amplitude * Math.sin(2 * Math.PI * frequencyHz * (index / sampleRateHz));
    return { t, x: signal, y: signal * 0.7, z: 9.81 + signal * 0.4 };
  });
}

describe("accelerometer analysis", () => {
  it("accepts a stable ten-second recording with enough samples", () => {
    const quality = evaluateRecordingQuality(makeSignal(5));
    expect(quality.status).toBe("valid");
    expect(quality.sampleRateHz).toBeCloseTo(50, 0);
  });

  it("detects a dominant Parkinsonian tremor-band frequency", () => {
    const analysis = analyzeTremorSignal(makeSignal(5));
    expect(analysis.dominantFrequencyHz).toBeCloseTo(5, 1);
    expect(analysis.tremorPower).toBeGreaterThan(0);
    expect(analysis.spectralConcentration).toBeGreaterThan(0.5);
    expect(analysis.windowCount).toBe(10);
  });

  it("resamples and normalizes axes for consistent real windows", () => {
    const irregularSamples = makeSignal(5).filter((_, index) => index % 7 !== 0);
    const prepared = preprocessAccelerometerSamples(irregularSamples);
    expect(prepared.sampleRateHz).toBe(50);
    expect(prepared.samples.length).toBeGreaterThanOrEqual(490);
    const xMean = prepared.samples.reduce((sum, sample) => sum + sample.x, 0) / prepared.samples.length;
    expect(xMean).toBeCloseTo(0, 6);
  });

  it("rejects recordings that are too short", () => {
    expect(evaluateRecordingQuality(makeSignal(5).slice(0, 50)).status).toBe("invalid");
  });
});
