"use server";

import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import {
  alerts,
  careRelationships,
  medicationIntakes,
  medications,
  mlModels,
  patientSessionComparisons,
  patientTremorBaselines,
  tremorResults,
  tremorMlPredictions,
  tremorTestPairs,
  tremorTestSessions,
} from "@/db/schema";
import { getPatientProfileForUser } from "@/features/patient/data";
import { getPatientHistory } from "@/features/patient/history/data";
import { hasWorseningMedicationResponse } from "@/features/patient/history/trends";
import { requireRole } from "@/lib/auth/session";
import { evaluateRecordingQuality } from "./sensor-recorder";
import { analyzeTremorSignal } from "./signal-processing";
import { analyzeTremorWithMl, type MlInferenceResult } from "./ml-client";
import { hasRepeatedAboveBaseline } from "./personal-alert";

const sampleSchema = z.object({
  t: z.number().finite().min(0).max(20_000),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

const recordingSchema = z.object({
  medicationId: z.string().uuid(),
  doseSlot: z.number().int().min(0).max(23),
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
  | { ok: true; sessionId: string; pairId: string | null; mlStatus: "success" | "unavailable" | "failed" }
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

  const data = parsed.data;
  const sessionId = randomUUID();
  const canonicalQuality = evaluateRecordingQuality(data.samples);
  const canonicalAnalysis = analyzeTremorSignal(data.samples);
  const mlInference = canonicalQuality.status === "valid"
    ? await analyzeTremorWithMl(sessionId, data.samples)
    : { status: "unavailable" as const, reason: "ML inference skipped because recording quality was invalid." };

  try {
    const saved = await db.transaction(async (tx) => {
      let medicationIntakeId: string | null = null;
      if (data.context === "after_medication" && data.doseTime) {
        const takenAt = combineDateAndTime(new Date(data.startedAt), data.doseTime);
        const [intake] = await tx.insert(medicationIntakes).values({ patientProfileId: patient.id, medicationId: medication.id, takenAt, dose: medication.dose, notes: data.notes || null }).returning({ id: medicationIntakes.id });
        medicationIntakeId = intake.id;
      }

      const qualityNotes = [...canonicalQuality.notes, ...canonicalAnalysis.notes, ...(data.notes ? [`Patient note: ${data.notes}`] : [])].join("\n") || null;
      const [session] = await tx.insert(tremorTestSessions).values({
        id: sessionId,
        patientProfileId: patient.id,
        medicationId: medication.id,
        medicationIntakeId,
        doseSlot: data.doseSlot,
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

      await persistMlPrediction(tx, session.id, mlInference);
      const personalComparison = await persistPersonalComparison(tx, {
        sessionId: session.id,
        patientProfileId: patient.id,
        medicationId: medication.id,
        context: data.context,
        startedAt: session.startedAt,
        tremorPower: canonicalAnalysis.tremorPower,
        algorithmVersion: canonicalAnalysis.algorithmVersion,
        qualityStatus: canonicalQuality.status,
      });

      if (data.context !== "after_medication" || canonicalQuality.status !== "valid") {
        return { sessionId: session.id, pairId: null, personalStatus: personalComparison.status };
      }

      const [before] = await tx
        .select({ id: tremorTestSessions.id, startedAt: tremorTestSessions.startedAt, tremorPower: tremorResults.tremorPower, doseSlot: tremorTestSessions.doseSlot })
        .from(tremorTestSessions)
        .innerJoin(tremorResults, eq(tremorResults.sessionId, tremorTestSessions.id))
        .leftJoin(tremorTestPairs, eq(tremorTestPairs.beforeSessionId, tremorTestSessions.id))
        .where(and(eq(tremorTestSessions.patientProfileId, patient.id), eq(tremorTestSessions.medicationId, medication.id), eq(tremorTestSessions.doseSlot, data.doseSlot), eq(tremorTestSessions.context, "before_medication"), eq(tremorTestSessions.qualityStatus, "valid"), eq(tremorResults.algorithmVersion, canonicalAnalysis.algorithmVersion), gte(tremorTestSessions.startedAt, new Date(session.startedAt.getTime() - 6 * 60 * 60 * 1_000)), isNull(tremorTestPairs.id)))
        .orderBy(desc(tremorTestSessions.startedAt))
        .limit(1);

      if (!before || before.startedAt >= session.startedAt) return { sessionId: session.id, pairId: null, personalStatus: personalComparison.status };
      const improvementPercent = before.tremorPower > 0.0001 ? ((before.tremorPower - canonicalAnalysis.tremorPower) / before.tremorPower) * 100 : null;
      const [pair] = await tx.insert(tremorTestPairs).values({ patientProfileId: patient.id, medicationId: medication.id, beforeSessionId: before.id, afterSessionId: session.id, improvementPercent, responseWindowMinutes: Math.round((session.startedAt.getTime() - before.startedAt.getTime()) / 60_000) }).returning({ id: tremorTestPairs.id });
      return { sessionId: session.id, pairId: pair.id, personalStatus: personalComparison.status };
    });

    if (saved.pairId) await updateWorseningAlert(patient.id, saved.sessionId);
    if (saved.personalStatus === "above_usual") await updatePersonalTrendAlert(patient.id, saved.sessionId, medication.id, data.context, canonicalAnalysis.algorithmVersion);
    return { ok: true, sessionId: saved.sessionId, pairId: saved.pairId, mlStatus: mlInference.status };
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

type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function persistMlPrediction(
  tx: DbTransaction,
  sessionId: string,
  inference: MlInferenceResult,
) {
  if (inference.status !== "success") {
    await tx.insert(tremorMlPredictions).values({
      sessionId,
      status: inference.status,
      failureReason: inference.reason,
    });
    return;
  }

  const prediction = inference.prediction;
  const [model] = await tx
    .insert(mlModels)
    .values({
      version: prediction.model.version,
      modelType: prediction.model.model_type,
      preprocessingVersion: prediction.preprocessing_version,
      provenance: prediction.model.provenance,
      clinicallyValidated: prediction.model.clinically_validated,
    })
    .onConflictDoUpdate({
      target: mlModels.version,
      set: {
        modelType: prediction.model.model_type,
        preprocessingVersion: prediction.preprocessing_version,
        provenance: prediction.model.provenance,
        clinicallyValidated: prediction.model.clinically_validated,
        status: "active",
        updatedAt: new Date(),
      },
    })
    .returning({ id: mlModels.id });

  await tx.insert(tremorMlPredictions).values({
    sessionId,
    modelId: model.id,
    status: "success",
    severityClass: prediction.predicted_severity_class,
    severityLabel: prediction.predicted_severity_label,
    probabilities: prediction.probabilities,
    confidence: prediction.confidence,
    windowCount: prediction.window_count,
    inferenceDurationMs: prediction.inference_duration_ms,
    requestId: prediction.request_id,
  });
}

type ComparisonStatus = "building_baseline" | "within_usual" | "above_usual" | "below_usual" | "not_comparable";

async function persistPersonalComparison(
  tx: DbTransaction,
  input: {
    sessionId: string;
    patientProfileId: string;
    medicationId: string;
    context: "before_medication" | "after_medication";
    startedAt: Date;
    tremorPower: number;
    algorithmVersion: string;
    qualityStatus: "valid" | "invalid";
  },
): Promise<{ status: ComparisonStatus }> {
  if (input.qualityStatus !== "valid") {
    await tx.insert(patientSessionComparisons).values({
      sessionId: input.sessionId,
      status: "not_comparable",
      baselineSessionCount: 0,
      explanation: "Recording quality was invalid, so no personal comparison was calculated.",
    });
    return { status: "not_comparable" };
  }

  const prior = await tx
    .select({ tremorPower: tremorResults.tremorPower, startedAt: tremorTestSessions.startedAt })
    .from(tremorTestSessions)
    .innerJoin(tremorResults, eq(tremorResults.sessionId, tremorTestSessions.id))
    .where(and(
      eq(tremorTestSessions.patientProfileId, input.patientProfileId),
      eq(tremorTestSessions.medicationId, input.medicationId),
      eq(tremorTestSessions.context, input.context),
      eq(tremorTestSessions.qualityStatus, "valid"),
      eq(tremorResults.algorithmVersion, input.algorithmVersion),
      lt(tremorTestSessions.startedAt, input.startedAt),
    ));

  const priorValues = prior.map((row) => row.tremorPower);
  const allValues = [...priorValues, input.tremorPower];
  const updatedMedian = median(allValues);
  const updatedMad = median(allValues.map((value) => Math.abs(value - updatedMedian)));
  const firstSessionAt = prior.reduce((earliest, row) => row.startedAt < earliest ? row.startedAt : earliest, input.startedAt);
  const [baseline] = await tx
    .insert(patientTremorBaselines)
    .values({
      patientProfileId: input.patientProfileId,
      medicationId: input.medicationId,
      context: input.context,
      algorithmVersion: input.algorithmVersion,
      medianTremorPower: updatedMedian,
      medianAbsoluteDeviation: updatedMad,
      sessionCount: allValues.length,
      status: allValues.length >= 5 ? "within_usual" : "building_baseline",
      firstSessionAt,
      lastSessionAt: input.startedAt,
    })
    .onConflictDoUpdate({
      target: [
        patientTremorBaselines.patientProfileId,
        patientTremorBaselines.medicationId,
        patientTremorBaselines.context,
        patientTremorBaselines.algorithmVersion,
      ],
      set: {
        medianTremorPower: updatedMedian,
        medianAbsoluteDeviation: updatedMad,
        sessionCount: allValues.length,
        status: allValues.length >= 5 ? "within_usual" : "building_baseline",
        firstSessionAt,
        lastSessionAt: input.startedAt,
        updatedAt: new Date(),
      },
    })
    .returning({ id: patientTremorBaselines.id });

  let status: ComparisonStatus = "building_baseline";
  let deviationPercent: number | null = null;
  let robustZScore: number | null = null;
  let explanation = `Building a personal baseline (${priorValues.length}/5 earlier valid tests).`;
  if (priorValues.length >= 5) {
    const priorMedian = median(priorValues);
    const priorMad = median(priorValues.map((value) => Math.abs(value - priorMedian)));
    const robustVariation = Math.max(priorMad * 1.4826, Math.abs(priorMedian) * 0.1, 0.01);
    robustZScore = (input.tremorPower - priorMedian) / robustVariation;
    deviationPercent = Math.abs(priorMedian) > 0.0001
      ? ((input.tremorPower - priorMedian) / priorMedian) * 100
      : null;
    status = robustZScore >= 2.5 ? "above_usual" : robustZScore <= -2.5 ? "below_usual" : "within_usual";
    explanation = status === "above_usual"
      ? "Higher than the patient's usual range for the same medication and test context."
      : status === "below_usual"
        ? "Lower than the patient's usual range for the same medication and test context."
        : "Within the patient's usual range for the same medication and test context.";
  }

  await tx.insert(patientSessionComparisons).values({
    sessionId: input.sessionId,
    baselineId: baseline.id,
    status,
    deviationPercent,
    robustZScore,
    baselineSessionCount: priorValues.length,
    explanation,
  });
  return { status };
}

function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
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

async function updatePersonalTrendAlert(
  patientProfileId: string,
  sessionId: string,
  medicationId: string,
  context: "before_medication" | "after_medication",
  algorithmVersion: string,
) {
  const db = getDb();
  const recent = await db
    .select({ status: patientSessionComparisons.status, baselineSessionCount: patientSessionComparisons.baselineSessionCount })
    .from(patientSessionComparisons)
    .innerJoin(tremorTestSessions, eq(tremorTestSessions.id, patientSessionComparisons.sessionId))
    .innerJoin(tremorResults, eq(tremorResults.sessionId, tremorTestSessions.id))
    .where(and(
      eq(tremorTestSessions.patientProfileId, patientProfileId),
      eq(tremorTestSessions.medicationId, medicationId),
      eq(tremorTestSessions.context, context),
      eq(tremorResults.algorithmVersion, algorithmVersion),
    ))
    .orderBy(desc(tremorTestSessions.startedAt))
    .limit(3);
  if (!hasRepeatedAboveBaseline(recent)) return;
  const existing = await db.query.alerts.findFirst({ where: and(eq(alerts.patientProfileId, patientProfileId), eq(alerts.type, "worsening_response"), eq(alerts.status, "open")) });
  if (existing) return;
  const relationship = await db.query.careRelationships.findFirst({ columns: { doctorProfileId: true }, where: and(eq(careRelationships.patientProfileId, patientProfileId), eq(careRelationships.status, "active")) });
  await db.insert(alerts).values({
    patientProfileId,
    doctorProfileId: relationship?.doctorProfileId ?? null,
    type: "worsening_response",
    title: "Repeated change from personal range",
    message: "Three recent valid tests were higher than this patient's established personal range. Clinical review may be helpful.",
    triggeredBySessionId: sessionId,
  });
}
