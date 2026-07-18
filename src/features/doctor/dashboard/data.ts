import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { alerts, careRelationships, medicationSchedules, medications, patientProfiles, profiles } from "@/db/schema";
import { getPatientHistory } from "@/features/patient/history/data";
import { calculateTrendSummary } from "@/features/patient/history/trends";
import type { DoctorPatientSummary } from "./types";

export async function getDoctorPatients(doctorProfileId: string) {
  const db = getDb();
  const connected = await db.select({ patientId: patientProfiles.id, firstName: profiles.firstName, lastName: profiles.lastName, dateOfBirth: patientProfiles.dateOfBirth }).from(careRelationships).innerJoin(patientProfiles, eq(patientProfiles.id, careRelationships.patientProfileId)).innerJoin(profiles, eq(profiles.id, patientProfiles.profileId)).where(and(eq(careRelationships.doctorProfileId, doctorProfileId), eq(careRelationships.status, "active")));
  const patients: DoctorPatientSummary[] = [];
  for (const row of connected) {
    const medication = await db.query.medications.findFirst({ where: and(eq(medications.patientProfileId, row.patientId), eq(medications.isActive, true)) });
    const schedules = medication ? await db.select().from(medicationSchedules).where(eq(medicationSchedules.medicationId, medication.id)).orderBy(asc(medicationSchedules.sortOrder)) : [];
    const history = await getPatientHistory(row.patientId);
    const summary = calculateTrendSummary(history.sessions, history.pairs);
    const latest = history.sessions[0];
    const latestPair = history.pairs[0];
    const openAlert = await db.query.alerts.findFirst({ where: and(eq(alerts.patientProfileId, row.patientId), eq(alerts.doctorProfileId, doctorProfileId), eq(alerts.status, "open")) });
    patients.push({ id: row.patientId, name: `${row.firstName} ${row.lastName}`, age: calculateAge(row.dateOfBirth), medicationName: medication ? `${medication.name} ${medication.dose}` : "No active medication", medicationSchedule: schedules.map((item) => item.scheduledLocalTime.slice(0, 5)), latestTestAt: latest?.testedAt ?? new Date(0).toISOString(), latestSeverityClass: latest?.severityClass ?? 0, latestTremorPower: latest?.tremorPower ?? 0, latestImprovementPercent: latestPair?.improvementPercent ?? 0, latestPersonalRange: summary.latestPersonalComparison?.status ?? "no_baseline", latestPersonalDeviationPercent: summary.latestPersonalComparison?.deviationPercent ?? null, status: openAlert || summary.alertCandidate ? "review_suggested" : "stable", alertMessage: openAlert?.message, trend: history.pairs.map((pair) => ({ date: pair.testedAt, beforePower: pair.beforePower, afterPower: pair.afterPower, improvementPercent: pair.improvementPercent })) });
  }
  return patients;
}

export function getDoctorDashboardSummary(patients: DoctorPatientSummary[]) {
  return { connectedPatients: patients.length, openAlerts: patients.filter((patient) => patient.status === "review_suggested").length, averageImprovementPercent: patients.length ? patients.reduce((sum, patient) => sum + patient.latestImprovementPercent, 0) / patients.length : 0 };
}

function calculateAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return 0;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age;
}
