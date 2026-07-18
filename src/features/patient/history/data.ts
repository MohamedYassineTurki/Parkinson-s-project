import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { medications, patientSessionComparisons, tremorResults, tremorTestPairs, tremorTestSessions } from "@/db/schema";
import type { HistoricalTestPair, HistoricalTestSession } from "./types";
import { calculatePersonalComparison } from "./baseline";

export async function getPatientHistory(patientProfileId: string): Promise<{ sessions: HistoricalTestSession[]; pairs: HistoricalTestPair[] }> {
  const db = getDb();
  const rows = await db
    .select({ id: tremorTestSessions.id, testedAt: tremorTestSessions.startedAt, context: tremorTestSessions.context, medicationId: tremorTestSessions.medicationId, medicationName: medications.name, tremorPower: tremorResults.tremorPower, severityClass: tremorResults.severityClass, severityLabel: tremorResults.severityLabel, qualityStatus: tremorTestSessions.qualityStatus, algorithmVersion: tremorResults.algorithmVersion, comparisonStatus: patientSessionComparisons.status, baselineSessionCount: patientSessionComparisons.baselineSessionCount, baselineDeviationPercent: patientSessionComparisons.deviationPercent, comparisonExplanation: patientSessionComparisons.explanation })
    .from(tremorTestSessions)
    .innerJoin(tremorResults, eq(tremorResults.sessionId, tremorTestSessions.id))
    .leftJoin(medications, eq(medications.id, tremorTestSessions.medicationId))
    .leftJoin(patientSessionComparisons, eq(patientSessionComparisons.sessionId, tremorTestSessions.id))
    .where(eq(tremorTestSessions.patientProfileId, patientProfileId))
    .orderBy(desc(tremorTestSessions.startedAt));

  const sessions = rows
    .filter((row): row is typeof row & { context: "before_medication" | "after_medication"; qualityStatus: "valid" | "invalid" } => row.context !== "unpaired" && row.qualityStatus !== "pending")
    .map((row) => ({ id: row.id, testedAt: row.testedAt.toISOString(), context: row.context, medicationId: row.medicationId, medicationName: row.medicationName ?? "Not specified", tremorPower: row.tremorPower, severityClass: row.severityClass as 0 | 1 | 2 | 3, severityLabel: row.severityLabel, qualityStatus: row.qualityStatus, algorithmVersion: row.algorithmVersion, personalComparison: row.comparisonStatus && row.comparisonStatus !== "not_comparable" ? { status: row.comparisonStatus, baselineSessionCount: row.baselineSessionCount ?? 0, baselineMedianPower: null, deviationPercent: row.baselineDeviationPercent, message: row.comparisonExplanation ?? "Personal comparison stored." } : undefined }));
  const sessionsWithComparisons = sessions.map((session) => ({
    ...session,
    personalComparison: session.personalComparison ?? (session.qualityStatus === "valid" ? calculatePersonalComparison(session, sessions) : undefined),
  }));
  const sessionMap = new Map(sessionsWithComparisons.map((session) => [session.id, session]));
  const pairRows = await db.select().from(tremorTestPairs).where(eq(tremorTestPairs.patientProfileId, patientProfileId)).orderBy(desc(tremorTestPairs.createdAt));
  const pairs: HistoricalTestPair[] = pairRows.flatMap((pair) => {
    const before = sessionMap.get(pair.beforeSessionId);
    const after = sessionMap.get(pair.afterSessionId);
    if (!before || !after || pair.improvementPercent == null) return [];
    if (before.algorithmVersion !== after.algorithmVersion) return [];
    return [{ id: pair.id, testedAt: after.testedAt, medicationName: after.medicationName, beforePower: before.tremorPower, afterPower: after.tremorPower, improvementPercent: pair.improvementPercent, qualityStatus: before.qualityStatus === "valid" && after.qualityStatus === "valid" ? "valid" : "invalid", algorithmVersion: after.algorithmVersion }];
  });
  const activeAlgorithmVersion = sessionsWithComparisons.find((session) => session.qualityStatus === "valid")?.algorithmVersion;
  return { sessions: sessionsWithComparisons, pairs: activeAlgorithmVersion ? pairs.filter((pair) => pair.algorithmVersion === activeAlgorithmVersion) : pairs };
}
