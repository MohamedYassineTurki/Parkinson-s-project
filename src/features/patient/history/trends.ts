import { differenceInDays } from "date-fns";

import type {
  HistoricalTestPair,
  HistoricalTestSession,
  TrendSummary,
} from "./types";

export function calculateTrendSummary(
  sessions: HistoricalTestSession[],
  pairs: HistoricalTestPair[],
  referenceDate = new Date(),
): TrendSummary {
  const newestValidSession = sessions.find((session) => session.qualityStatus === "valid");
  const validSessions = sessions.filter((session) => session.qualityStatus === "valid" && session.algorithmVersion === newestValidSession?.algorithmVersion);
  const latestSession = validSessions[0];
  const last7DaySessions = validSessions.filter(
    (session) => differenceInDays(referenceDate, new Date(session.testedAt)) <= 7,
  );
  const last30DaySessions = validSessions.filter(
    (session) => differenceInDays(referenceDate, new Date(session.testedAt)) <= 30,
  );
  const validPairs = pairs.filter((pair) => pair.qualityStatus === "valid" && pair.algorithmVersion === newestValidSession?.algorithmVersion);

  return {
    latestSeverityClass: latestSession?.severityClass ?? null,
    latestTremorPower: latestSession?.tremorPower ?? null,
    last7DayAveragePower: average(last7DaySessions.map((session) => session.tremorPower)),
    last30DayAveragePower: average(
      last30DaySessions.map((session) => session.tremorPower),
    ),
    averageImprovementPercent: average(
      validPairs.map((pair) => pair.improvementPercent),
    ),
    alertCandidate: hasWorseningMedicationResponse(validPairs),
    latestPersonalComparison: latestSession?.personalComparison ?? null,
  };
}

export function hasWorseningMedicationResponse(pairs: HistoricalTestPair[]) {
  if (pairs.length < 4) {
    return false;
  }

  const chronologicalPairs = [...pairs].sort(
    (a, b) => Date.parse(a.testedAt) - Date.parse(b.testedAt),
  );
  const baselinePairs = chronologicalPairs.slice(0, Math.max(3, pairs.length - 3));
  const recentPairs = chronologicalPairs.slice(-3);
  const baselineAfterPower = average(baselinePairs.map((pair) => pair.afterPower));

  if (baselineAfterPower == null || baselineAfterPower <= 0) {
    return false;
  }

  return recentPairs.every(
    (pair) => pair.afterPower >= baselineAfterPower * 1.3 && pair.qualityStatus === "valid",
  );
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
