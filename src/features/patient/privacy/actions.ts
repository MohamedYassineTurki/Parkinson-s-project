"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db/client";
import { auditLogs, careRelationships, doctorProfiles } from "@/db/schema";
import { getPatientProfileForUser } from "@/features/patient/data";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export type SharingState = { status: "idle" | "success" | "error"; message: string };
export async function requestDoctorAccess(_state: SharingState, formData: FormData): Promise<SharingState> {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) return { status: "error", message: "Complete onboarding first." };
  const inviteCode = String(formData.get("inviteCode") ?? "").trim().toUpperCase();
  if (!/^DR-[A-Z0-9]{8}$/.test(inviteCode) || formData.get("consent") !== "on") return { status: "error", message: "Enter a valid invite code and confirm consent." };
  const db = getDb();
  const doctor = await db.query.doctorProfiles.findFirst({ columns: { id: true }, where: eq(doctorProfiles.inviteCode, inviteCode) });
  if (!doctor) return { status: "error", message: "Doctor invite code not found." };
  const [relationship] = await db.insert(careRelationships).values({ patientProfileId: patient.id, doctorProfileId: doctor.id, status: "pending" }).onConflictDoUpdate({ target: [careRelationships.patientProfileId, careRelationships.doctorProfileId], set: { status: "pending", acceptedAt: null, revokedAt: null, updatedAt: new Date() } }).returning({ id: careRelationships.id });
  await db.insert(auditLogs).values({ actorProfileId: patient.profileId, actorType: "patient", action: "doctor_access_requested", targetType: "care_relationship", targetId: relationship.id, metadata: { consent: true } });
  revalidatePath(routes.patient.privacy);
  revalidatePath(routes.patient.onboarding);
  return { status: "success", message: "Connection request sent to the doctor." };
}

export async function revokeDoctorAccess(relationshipId: string) {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) return;
  const db = getDb();
  const [relationship] = await db.update(careRelationships).set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(careRelationships.id, relationshipId), eq(careRelationships.patientProfileId, patient.id))).returning({ id: careRelationships.id });
  if (relationship) await db.insert(auditLogs).values({ actorProfileId: patient.profileId, actorType: "patient", action: "doctor_access_revoked", targetType: "care_relationship", targetId: relationship.id });
  revalidatePath(routes.patient.privacy);
  revalidatePath(routes.patient.onboarding);
}
