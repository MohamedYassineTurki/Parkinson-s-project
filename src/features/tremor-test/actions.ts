"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import {
  alerts,
  careRelationships,
  medicationIntakes,
  medications,
  tremorResults,
  tremorTestPairs,
  tremorTestSessions,
} from "@/db/schema";
import { getPatientProfileForUser } from "@/features/patient/data";
import { getPatientHistory } from "@/features/patient/history/data";
import { hasWorseningMedicationResponse } from "@/features/patient/history/trends";
import { requireRole } from "@/lib/auth/session";
import { evaluateRecordingQuality } from "./sensor-recorder";
import { analyzeTremorSignal } from "./signal-processing";

const sampleSchema = z.object({
  t: z.number().finite().min(0).max(20_000),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

const recordingSchema = z.object({
  medicationId: z.string().uuid(),
  context: z.enum(["before_medication", "after_medication"]),
  doseTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal("")),
  notes: z.string().trim().max(500),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  samples: z.array(sampleSchema).min(1).max(2_000),
  quality: z.object({
    status: z.enum(["valid", "invalid"]),
    sampleCount: z.number().int().min(0).max(2_000),
    durationMs: z.number().finite().min(0).max(20_000),
    sampleRateHz: z.number().finite().min(0).max(1_000),
    notes: z.array(z.string().max(300)).max(20),
  }),
  analysis: z.object({
    algorithmVersion: z.literal("signal-v2"),
    severityClass: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    severityLabel: z.enum(["none", "low", "medium", "high"]),
    rmsIntensity: z.number().finite().min(0),
    dominantFrequencyHz: z.number().finite().min(0).nullable(),
    tremorPower: z.number().finite().min(0),
    spectralConcentration: z.number().finite().min(0).max(1),
    windowCount: z.number().int().min(0),
    notes: z.array(z.string().max(300)).max(20),
  }),
});

export type SaveRecordingInput = z.infer<typeof recordingSchema>;
export type SaveRecordingResult =
  | { ok: true; sessionId: string; pairId: string | null }
  | { ok: false; message: string };

export async function saveTremorRecording(input: SaveRecordingInput): Promise<SaveRecordingResult> {
  const user = await requireRole("patient");
  const parsed = recordingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "The recording payload is invalid." };

  const patient = await getPatientProfileForUser(user.id);
  if (!patient) return { ok: false, message: "Complete patient onboarding before saving a test." };

  const db = getDb();
  const [medication] = await db
    .select({ id: medications.id, dose: medications.dose })
    .from(medications)
    .where(and(eq(medications.id, parsed.data.medicationId), eq(medications.patientProfileId, patient.id), eq(medications.isActive, true)))
    .limit(1);
  if (!medication) return { ok: false, message: "Select one of your active medications." };

  try {
    const saved = await db.transaction(async (tx) => {
      const data = parsed.data;
      // Browser metrics are useful for immediate feedback, but the server owns
      // persisted clinical-monitoring values and never trusts client scores.
      const canonicalQuality = evaluateRecordingQuality(data.samples);
      const canonicalAnalysis = analyzeTremorSignal(data.samples);
      let medicationIntakeId: string | null = null;
      if (data.context === "after_medication" && data.doseTime) {
        const takenAt = combineDateAndTime(new Date(data.startedAt), data.doseTime);
        const [intake] = await tx.insert(medicationIntakes).values({ patientProfileId: patient.id, medicationId: medication.id, takenAt, dose: medication.dose, notes: data.notes || null }).returning({ id: medicationIntakes.id });
        medicationIntakeId = intake.id;
      }

      const qualityNotes = [...canonicalQuality.notes, ...canonicalAnalysis.notes, ...(data.notes ? [`Patient note: ${data.notes}`] : [])].join("\n") || null;
      const [session] = await tx.insert(tremorTestSessions).values({
        patientProfileId: patient.id,
        medicationId: medication.id,
        medicationIntakeId,
        context: data.context,
        startedAt: new Date(data.startedAt),
        completedAt: new Date(data.completedAt),
        durationMs: Math.round(canonicalQuality.durationMs),
        sampleCount: canonicalQuality.sampleCount,
        sampleRateHz: canonicalQuality.sampleRateHz,
        deviceInfo: { userAgent: "captured-client-side", source: "DeviceMotionEvent" },
        qualityStatus: canonicalQuality.status,
        qualityNotes,
        rawSamples: data.samples,
      }).returning({ id: tremorTestSessions.id, startedAt: tremorTestSessions.startedAt });

      await tx.insert(tremorResults).values({
        sessionId: session.id,
        severityClass: canonicalAnalysis.severityClass,
        severityLabel: canonicalAnalysis.severityLabel,
        rmsIntensity: canonicalAnalysis.rmsIntensity,
        dominantFrequencyHz: canonicalAnalysis.dominantFrequencyHz,
        tremorPower: canonicalAnalysis.tremorPower,
        confidenceScore: canonicalQuality.status === "valid" ? canonicalAnalysis.spectralConcentration : 0,
        algorithmVersion: canonicalAnalysis.algorithmVersion,
      });

      if (data.context !== "after_medication" || canonicalQuality.status !== "valid") return { sessionId: session.id, pairId: null };

      const [before] = await tx
        .select({ id: tremorTestSessions.id, startedAt: tremorTestSessions.startedAt, tremorPower: tremorResults.tremorPower })
        .from(tremorTestSessions)
        .innerJoin(tremorResults, eq(tremorResults.sessionId, tremorTestSessions.id))
        .leftJoin(tremorTestPairs, eq(tremorTestPairs.beforeSessionId, tremorTestSessions.id))
        .where(and(eq(tremorTestSessions.patientProfileId, patient.id), eq(tremorTestSessions.medicationId, medication.id), eq(tremorTestSessions.context, "before_medication"), eq(tremorTestSessions.qualityStatus, "valid"), eq(tremorResults.algorithmVersion, canonicalAnalysis.algorithmVersion), isNull(tremorTestPairs.id)))
        .orderBy(desc(tremorTestSessions.startedAt))
        .limit(1);

      if (!before || before.startedAt >= session.startedAt) return { sessionId: session.id, pairId: null };
      const improvementPercent = before.tremorPower > 0.0001 ? ((before.tremorPower - data.analysis.tremorPower) / before.tremorPower) * 100 : null;
      const [pair] = await tx.insert(tremorTestPairs).values({ patientProfileId: patient.id, medicationId: medication.id, beforeSessionId: before.id, afterSessionId: session.id, improvementPercent, responseWindowMinutes: Math.round((session.startedAt.getTime() - before.startedAt.getTime()) / 60_000) }).returning({ id: tremorTestPairs.id });
      return { sessionId: session.id, pairId: pair.id };
    });

    if (saved.pairId) await updateWorseningAlert(patient.id, saved.sessionId);
    return { ok: true, ...saved };
  } catch (error) {
    console.error("Failed to save tremor recording", error);
    return { ok: false, message: "The test could not be saved. Please try again." };
  }
}

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

async function updateWorseningAlert(patientProfileId: string, sessionId: string) {
  const history = await getPatientHistory(patientProfileId);
  if (!hasWorseningMedicationResponse(history.pairs)) return;
  const db = getDb();
  const existing = await db.query.alerts.findFirst({ where: and(eq(alerts.patientProfileId, patientProfileId), eq(alerts.type, "worsening_response"), eq(alerts.status, "open")) });
  if (existing) return;
  const relationship = await db.query.careRelationships.findFirst({ columns: { doctorProfileId: true }, where: and(eq(careRelationships.patientProfileId, patientProfileId), eq(careRelationships.status, "active")) });
  await db.insert(alerts).values({ patientProfileId, doctorProfileId: relationship?.doctorProfileId ?? null, type: "worsening_response", title: "Review suggested", message: "Recent after-medication tremor results are repeatedly higher than the earlier baseline.", triggeredBySessionId: sessionId });
}
