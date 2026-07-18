import { describe, expect, it } from "vitest";

import { getLocalDayBounds } from "./pairing";

describe("same-day dose pairing", () => {
  it("uses the phone's local day for a UTC+1 patient", () => {
    const bounds = getLocalDayBounds(new Date("2026-07-18T15:00:00.000Z"), -60);

    expect(bounds.start.toISOString()).toBe("2026-07-17T23:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-07-18T23:00:00.000Z");
  });

  it("keeps tests just after local midnight in the new day", () => {
    const bounds = getLocalDayBounds(new Date("2026-07-18T23:30:00.000Z"), -60);

    expect(bounds.start.toISOString()).toBe("2026-07-18T23:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-07-19T23:00:00.000Z");
  });

  it("supports timezones west of UTC", () => {
    const bounds = getLocalDayBounds(new Date("2026-07-18T03:00:00.000Z"), 240);

    expect(bounds.start.toISOString()).toBe("2026-07-17T04:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-07-18T04:00:00.000Z");
  });
});
