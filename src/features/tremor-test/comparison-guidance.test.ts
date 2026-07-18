import { describe, expect, it } from "vitest";

import { getComparisonGuidance } from "./comparison-guidance";

describe("comparison result guidance", () => {
  it.each([
    [45, "Clearly lower movement", "45% lower"],
    [15, "Moderately lower movement", "15% lower"],
    [5, "No clear change", "5% lower"],
    [-5, "No clear change", "5% higher"],
    [-15, "Moderately higher movement", "15% higher"],
    [-45, "Clearly higher movement", "45% higher"],
  ])("maps %s percent to clear patient guidance", (percentage, label, differenceLabel) => {
    const guidance = getComparisonGuidance(percentage);
    expect(guidance.label).toBe(label);
    expect(guidance.differenceLabel).toBe(differenceLabel);
    expect(guidance.doctorAdvice).toMatch(/^Doctor contact:/);
  });

  it("does not suggest a medical decision when the percentage is unavailable", () => {
    const guidance = getComparisonGuidance(null);
    expect(guidance.label).toBe("Percentage unavailable");
    expect(guidance.nextStep).toContain("Repeat the test");
  });
});
