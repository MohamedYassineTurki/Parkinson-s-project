import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { medications, tremorResults, tremorTestPairs, tremorTestSessions } from "@/db/schema";
import type { HistoricalTestPair, HistoricalTestSession } from "./types";

export async function getPatientHistory(patientProfileId: string): Promise<{ sessions: HistoricalTestSession[]; pairs: HistoricalTestPair[] }> {
  const db = getDb();
  const rows = await db
    .select({ id: tremorTestSessions.id, testedAt: tremorTestSessions.startedAt, context: tremorTestSessions.context, medicationName: medications.name, tremorPower: tremorResults.tremorPower, severityClass: tremorResults.severityClass, severityLabel: tremorResults.severityLabel, qualityStatus: tremorTestSessions.qualityStatus })
    .from(tremorTestSessions)
    .innerJoin(tremorResults, eq(tremorResults.sessionId, tremorTestSessions.id))
    .leftJoin(medications, eq(medications.id, tremorTestSessions.medicationId))
    .where(eq(tremorTestSessions.patientProfileId, patientProfileId))
    .orderBy(desc(tremorTestSessions.startedAt));

  const sessions = rows
    .filter((row): row is typeof row & { context: "before_medication" | "after_medication"; qualityStatus: "valid" | "invalid" } => row.context !== "unpaired" && row.qualityStatus !== "pending")
    .map((row) => ({ id: row.id, testedAt: row.testedAt.toISOString(), context: row.context, medicationName: row.medicationName ?? "Not specified", tremorPower: row.tremorPower, severityClass: row.severityClass as 0 | 1 | 2 | 3, severityLabel: row.severityLabel, qualityStatus: row.qualityStatus }));
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const pairRows = await db.select().from(tremorTestPairs).where(eq(tremorTestPairs.patientProfileId, patientProfileId)).orderBy(desc(tremorTestPairs.createdAt));
  const pairs: HistoricalTestPair[] = pairRows.flatMap((pair) => {
    const before = sessionMap.get(pair.beforeSessionId);
    const after = sessionMap.get(pair.afterSessionId);
    if (!before || !after || pair.improvementPercent == null) return [];
    return [{ id: pair.id, testedAt: after.testedAt, medicationName: after.medicationName, beforePower: before.tremorPower, afterPower: after.tremorPower, improvementPercent: pair.improvementPercent, qualityStatus: before.qualityStatus === "valid" && after.qualityStatus === "valid" ? "valid" : "invalid" }];
  });
  return { sessions, pairs };
}
