"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db/client";
import { auditLogs, medicationSchedules, medications } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { getPatientProfileForUser } from "@/features/patient/data";
import { medicationSchema } from "./validation";

export type MedicationActionState = { status: "idle" | "success" | "error"; message: string };
export async function saveMedication(
  _state: MedicationActionState,
  formData: FormData,
): Promise<MedicationActionState> {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);

  if (!patient) {
    return { status: "error", message: "Complete patient onboarding first." };
  }

  const idValue = String(formData.get("id") ?? "").trim();
  const parsed = medicationSchema.safeParse({
    id: idValue || undefined,
    name: formData.get("name"),
    dose: formData.get("dose"),
    frequencyPerDay: formData.get("frequencyPerDay"),
    scheduleTimes: String(formData.get("scheduleTimes") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    instructions: formData.get("instructions"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid medication details." };
  }

  const db = getDb();
  const input = parsed.data;

  try {
    await db.transaction(async (tx) => {
      let medicationId = input.id;

      if (medicationId) {
        const [updated] = await tx
          .update(medications)
          .set({ name: input.name, dose: input.dose, frequencyPerDay: input.frequencyPerDay, instructions: input.instructions || null, updatedAt: new Date() })
          .where(and(eq(medications.id, medicationId), eq(medications.patientProfileId, patient.id)))
          .returning({ id: medications.id });

        if (!updated) throw new Error("Medication not found.");
        await tx.delete(medicationSchedules).where(eq(medicationSchedules.medicationId, medicationId));
      } else {
        const [created] = await tx
          .insert(medications)
          .values({ patientProfileId: patient.id, name: input.name, dose: input.dose, frequencyPerDay: input.frequencyPerDay, instructions: input.instructions || null })
          .returning({ id: medications.id });
        medicationId = created.id;
      }

      await tx.insert(medicationSchedules).values(
        input.scheduleTimes.map((scheduledLocalTime, sortOrder) => ({ medicationId: medicationId!, scheduledLocalTime, sortOrder })),
      );
      await tx.insert(auditLogs).values({ actorProfileId: patient.profileId, actorType: "patient", action: input.id ? "medication_updated" : "medication_created", targetType: "medication", targetId: medicationId });
    });
  } catch (error) {
    console.error("Failed to save medication", error);
    return { status: "error", message: "Medication could not be saved." };
  }

  revalidatePath(routes.patient.medications);
  return { status: "success", message: input.id ? "Medication updated." : "Medication added." };
}

export async function setMedicationActive(id: string, isActive: boolean) {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) return;
  const db = getDb();
  const [updated] = await db.update(medications).set({ isActive, updatedAt: new Date() }).where(and(eq(medications.id, id), eq(medications.patientProfileId, patient.id))).returning({ id: medications.id });
  if (updated) {
    await db.insert(auditLogs).values({ actorProfileId: patient.profileId, actorType: "patient", action: isActive ? "medication_restored" : "medication_archived", targetType: "medication", targetId: id });
  }
  revalidatePath(routes.patient.medications);
}
