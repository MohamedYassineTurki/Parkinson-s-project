import { describe, expect, it } from "vitest";

import { hasRepeatedAboveBaseline } from "./personal-alert";

describe("personal-range alert policy", () => {
  it("requires three repeated above-range results with established baselines", () => {
    expect(hasRepeatedAboveBaseline([
      { status: "above_usual", baselineSessionCount: 7 },
      { status: "above_usual", baselineSessionCount: 6 },
      { status: "above_usual", baselineSessionCount: 5 },
    ])).toBe(true);
  });

  it("does not alert from one result or an unfinished baseline", () => {
    expect(hasRepeatedAboveBaseline([{ status: "above_usual", baselineSessionCount: 8 }])).toBe(false);
    expect(hasRepeatedAboveBaseline([
      { status: "above_usual", baselineSessionCount: 7 },
      { status: "above_usual", baselineSessionCount: 6 },
      { status: "above_usual", baselineSessionCount: 4 },
    ])).toBe(false);
  });
});
