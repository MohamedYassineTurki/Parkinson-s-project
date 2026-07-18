"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db/client";
import { auditLogs, careRelationships } from "@/db/schema";
import { getDoctorProfileForUser } from "@/features/doctor/data";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export async function setCareRequestStatus(relationshipId: string, accept: boolean) {
  const user = await requireRole("doctor");
  const doctor = await getDoctorProfileForUser(user.id);
  if (!doctor) return;
  const db = getDb();
  const [updated] = await db.update(careRelationships).set({ status: accept ? "active" : "revoked", acceptedAt: accept ? new Date() : null, revokedAt: accept ? null : new Date(), updatedAt: new Date() }).where(and(eq(careRelationships.id, relationshipId), eq(careRelationships.doctorProfileId, doctor.id), eq(careRelationships.status, "pending"))).returning({ id: careRelationships.id });
  if (updated) await db.insert(auditLogs).values({ actorProfileId: doctor.profileId, actorType: "doctor", action: accept ? "care_request_accepted" : "care_request_declined", targetType: "care_relationship", targetId: updated.id });
  revalidatePath(routes.doctor.root);
  revalidatePath(routes.doctor.patients);
}
