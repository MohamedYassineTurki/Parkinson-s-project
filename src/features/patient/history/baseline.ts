import type { HistoricalTestSession, PersonalComparison } from "./types";

export const MINIMUM_BASELINE_SESSIONS = 5;

/**
 * Compares a session only with earlier valid sessions from the same medication,
 * test context, and signal-processing version. This avoids treating a global
 * score as a patient-specific clinical conclusion.
 */
export function calculatePersonalComparison(
  session: HistoricalTestSession,
  allSessions: HistoricalTestSession[],
): PersonalComparison {
  const earlierComparableSessions = allSessions
    .filter((candidate) =>
      candidate.id !== session.id &&
      candidate.qualityStatus === "valid" &&
      candidate.medicationId === session.medicationId &&
      candidate.context === session.context &&
      candidate.algorithmVersion === session.algorithmVersion &&
      Date.parse(candidate.testedAt) < Date.parse(session.testedAt),
    )
    .sort((a, b) => Date.parse(a.testedAt) - Date.parse(b.testedAt));

  if (earlierComparableSessions.length < MINIMUM_BASELINE_SESSIONS) {
    return {
      status: "building_baseline",
      baselineSessionCount: earlierComparableSessions.length,
      baselineMedianPower: null,
      deviationPercent: null,
      message: `Building your personal baseline (${earlierComparableSessions.length}/${MINIMUM_BASELINE_SESSIONS} earlier valid tests).`,
    };
  }

  const baselineValues = earlierComparableSessions.map((item) => item.tremorPower);
  const baselineMedianPower = median(baselineValues);
  const absoluteDeviations = baselineValues.map((value) => Math.abs(value - baselineMedianPower));
  const medianAbsoluteDeviation = median(absoluteDeviations);
  const minimumVariation = Math.max(Math.abs(baselineMedianPower) * 0.1, 0.01);
  const robustVariation = Math.max(medianAbsoluteDeviation * 1.4826, minimumVariation);
  const deviationPercent = baselineMedianPower === 0 ? null : ((session.tremorPower - baselineMedianPower) / baselineMedianPower) * 100;
  const zScore = (session.tremorPower - baselineMedianPower) / robustVariation;
  const status = zScore >= 2.5 ? "above_usual" : zScore <= -2.5 ? "below_usual" : "within_usual";

  return {
    status,
    baselineSessionCount: earlierComparableSessions.length,
    baselineMedianPower,
    deviationPercent,
    message:
      status === "above_usual"
        ? "Higher than this patient's usual range for this medication and test context."
        : status === "below_usual"
          ? "Lower than this patient's usual range for this medication and test context."
          : "Within this patient's usual range for this medication and test context.",
  };
}

function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}
