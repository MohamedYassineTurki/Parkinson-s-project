import { describe, expect, it } from "vitest";

import { compareMedicationResponse } from "./comparison";
import type { SensorRecording } from "./types";

function recording(power: number, quality: "valid" | "invalid" = "valid"): SensorRecording {
  return { context: "before_medication", startedAt: new Date(), completedAt: new Date(), samples: [], quality: { status: quality, sampleCount: 500, durationMs: 10_000, sampleRateHz: 50, notes: [] }, analysis: { algorithmVersion: "signal-v1", severityClass: 1, severityLabel: "low", rmsIntensity: 1, dominantFrequencyHz: 5, tremorPower: power, spectralConcentration: 0.8, windowCount: 10, notes: [] } };
}

describe("before/after comparison", () => {
  it("calculates improvement from tremor power", () => {
    const result = compareMedicationResponse(recording(20), recording(10));
    expect(result?.status).toBe("improved");
    expect(result?.improvementPercent).toBeCloseTo(50);
  });

  it("does not compare invalid recordings", () => {
    expect(compareMedicationResponse(recording(20, "invalid"), recording(10))?.status).toBe("not_comparable");
  });

  it("labels a meaningful increase after medication as worse", () => {
    expect(compareMedicationResponse(recording(10), recording(15))?.status).toBe("worse");
  });
});
