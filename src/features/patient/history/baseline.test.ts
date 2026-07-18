import { describe, expect, it } from "vitest";

import { calculatePersonalComparison } from "./baseline";
import type { HistoricalTestSession } from "./types";

function session(day: number, power: number, medicationId = "medication-a"): HistoricalTestSession {
  return {
    id: `${medicationId}-${day}`,
    testedAt: new Date(2026, 0, day).toISOString(),
    context: "before_medication",
    medicationId,
    medicationName: "Levodopa",
    tremorPower: power,
    severityClass: 1,
    severityLabel: "low",
    qualityStatus: "valid",
    algorithmVersion: "signal-v2",
  };
}

describe("personal tremor baseline", () => {
  it("requires five earlier comparable tests before interpreting a result", () => {
    const sessions = [1, 2, 3, 4].map((day) => session(day, 10));
    const current = session(5, 15);
    expect(calculatePersonalComparison(current, [...sessions, current]).status).toBe("building_baseline");
  });

  it("marks a sustained-size departure from the patient’s own range", () => {
    const earlier = [1, 2, 3, 4, 5].map((day) => session(day, 10));
    const current = session(6, 15);
    const result = calculatePersonalComparison(current, [...earlier, current]);
    expect(result.status).toBe("above_usual");
    expect(result.deviationPercent).toBeCloseTo(50);
  });

  it("does not mix medications into a personal baseline", () => {
    const earlier = [1, 2, 3, 4, 5].map((day) => session(day, 50, "medication-b"));
    const current = session(6, 10, "medication-a");
    expect(calculatePersonalComparison(current, [...earlier, current]).status).toBe("building_baseline");
  });
});
