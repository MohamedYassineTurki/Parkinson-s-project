import { subDays } from "date-fns";

import type {
  HistoricalTestPair,
  HistoricalTestSession,
} from "./types";

const now = new Date();

const pairsSeed = [
  { daysAgo: 26, before: 31.8, after: 12.4, improvement: 61.0 },
  { daysAgo: 22, before: 33.1, after: 13.2, improvement: 60.1 },
  { daysAgo: 18, before: 32.7, after: 14.1, improvement: 56.9 },
  { daysAgo: 13, before: 35.4, after: 18.6, improvement: 47.5 },
  { daysAgo: 8, before: 36.8, after: 23.4, improvement: 36.4 },
  { daysAgo: 4, before: 37.9, after: 28.9, improvement: 23.7 },
  { daysAgo: 1, before: 39.6, after: 31.8, improvement: 19.7 },
];

export const demoHistoricalPairs: HistoricalTestPair[] = pairsSeed.map((item, index) => ({
  id: `pair-${index + 1}`,
  testedAt: subDays(now, item.daysAgo).toISOString(),
  medicationName: "Levodopa 100mg",
  beforePower: item.before,
  afterPower: item.after,
  improvementPercent: item.improvement,
  qualityStatus: "valid",
}));

export const demoHistoricalSessions: HistoricalTestSession[] = demoHistoricalPairs
  .flatMap((pair) => [
    {
      id: `${pair.id}-before`,
      testedAt: pair.testedAt,
      context: "before_medication" as const,
      medicationName: pair.medicationName,
      tremorPower: pair.beforePower,
      severityClass: severityFromPower(pair.beforePower),
      severityLabel: severityLabelFromPower(pair.beforePower),
      qualityStatus: pair.qualityStatus,
    },
    {
      id: `${pair.id}-after`,
      testedAt: pair.testedAt,
      context: "after_medication" as const,
      medicationName: pair.medicationName,
      tremorPower: pair.afterPower,
      severityClass: severityFromPower(pair.afterPower),
      severityLabel: severityLabelFromPower(pair.afterPower),
      qualityStatus: pair.qualityStatus,
    },
  ])
  .sort((a, b) => Date.parse(b.testedAt) - Date.parse(a.testedAt));

function severityFromPower(power: number): 0 | 1 | 2 | 3 {
  if (power < 4) {
    return 0;
  }

  if (power < 12) {
    return 1;
  }

  if (power < 28) {
    return 2;
  }

  return 3;
}

function severityLabelFromPower(
  power: number,
): HistoricalTestSession["severityLabel"] {
  const severity = severityFromPower(power);

  if (severity === 0) {
    return "none";
  }

  if (severity === 1) {
    return "low";
  }

  if (severity === 2) {
    return "medium";
  }

  return "high";
}
