import { describe, expect, it } from "vitest";

import { hasWorseningMedicationResponse } from "./trends";
import type { HistoricalTestPair } from "./types";

function pair(day: number, afterPower: number): HistoricalTestPair {
  return { id: String(day), testedAt: new Date(2026, 0, day).toISOString(), medicationName: "Test", beforePower: 30, afterPower, improvementPercent: ((30 - afterPower) / 30) * 100, qualityStatus: "valid", algorithmVersion: "signal-v2" };
}

describe("alert logic", () => {
  it("requires three recent valid results at least 30% above baseline", () => {
    expect(hasWorseningMedicationResponse([pair(1, 10), pair(2, 10), pair(3, 10), pair(4, 14), pair(5, 14), pair(6, 14)])).toBe(true);
  });

  it("does not alert from one worsening result", () => {
    expect(hasWorseningMedicationResponse([pair(1, 10), pair(2, 10), pair(3, 10), pair(4, 14), pair(5, 10), pair(6, 10)])).toBe(false);
  });
});
