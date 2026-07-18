"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db/client";
import {
  auditLogs,
  careRelationships,
  doctorProfiles,
  medicationSchedules,
  medications,
  patientProfiles,
  profiles,
} from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import {
  patientOnboardingSchema,
  type PatientOnboardingField,
} from "./validation";

export type PatientOnboardingState = {
  status: "idle" | "success" | "error";
  message: string;
  errors: Partial<Record<PatientOnboardingField, string>>;
};

export async function savePatientOnboarding(
  _previousState: PatientOnboardingState,
  formData: FormData,
): Promise<PatientOnboardingState> {
  const user = await requireRole("patient");
  const parsed = patientOnboardingSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    phoneNumber: formData.get("phoneNumber"),
    medicationName: formData.get("medicationName"),
    dose: formData.get("dose"),
    frequencyPerDay: formData.get("frequencyPerDay"),
    scheduleTimes: formData.getAll("scheduleTimes"),
    instructions: formData.get("instructions"),
    doctorInviteCode: formData.get("doctorInviteCode"),
    doctorSharingConsent: formData.get("doctorSharingConsent") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: mapZodErrors(parsed.error),
    };
  }

  const input = parsed.data;
  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const [profile] = await tx
        .insert(profiles)
        .values({
          userId: user.id,
          role: "patient",
          firstName: input.firstName,
          lastName: input.lastName,
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            role: "patient",
            firstName: input.firstName,
            lastName: input.lastName,
            updatedAt: new Date(),
          },
        })
        .returning();

      const [patientProfile] = await tx
        .insert(patientProfiles)
        .values({
          profileId: profile.id,
          dateOfBirth: input.dateOfBirth,
          phoneNumber: input.phoneNumber,
        })
        .onConflictDoUpdate({
          target: patientProfiles.profileId,
          set: {
            dateOfBirth: input.dateOfBirth,
            phoneNumber: input.phoneNumber,
            updatedAt: new Date(),
          },
        })
        .returning();

      await tx
        .update(medications)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(medications.patientProfileId, patientProfile.id));

      const [medication] = await tx
        .insert(medications)
        .values({
          patientProfileId: patientProfile.id,
          name: input.medicationName,
          dose: input.dose,
          frequencyPerDay: input.frequencyPerDay,
          instructions: input.instructions,
          isActive: true,
        })
        .returning();

      await tx.insert(medicationSchedules).values(
        input.scheduleTimes.map((scheduledLocalTime, sortOrder) => ({
          medicationId: medication.id,
          scheduledLocalTime,
          sortOrder,
        })),
      );

      if (input.doctorInviteCode) {
        const [doctorProfile] = await tx
          .select({ id: doctorProfiles.id })
          .from(doctorProfiles)
          .where(eq(doctorProfiles.inviteCode, input.doctorInviteCode))
          .limit(1);

        if (!doctorProfile) {
          throw new DoctorInviteCodeError();
        }

        await tx
          .insert(careRelationships)
          .values({
            patientProfileId: patientProfile.id,
            doctorProfileId: doctorProfile.id,
            status: "pending",
          })
          .onConflictDoUpdate({
            target: [
              careRelationships.patientProfileId,
              careRelationships.doctorProfileId,
            ],
            set: {
              status: "pending",
              revokedAt: null,
              updatedAt: new Date(),
            },
            where: and(
              eq(careRelationships.status, "revoked"),
              eq(careRelationships.patientProfileId, patientProfile.id),
              eq(careRelationships.doctorProfileId, doctorProfile.id),
            ),
          });
      }

      await tx.insert(auditLogs).values({
        actorProfileId: profile.id,
        actorType: "patient",
        action: "patient_onboarding_saved",
        targetType: "patient_profile",
        targetId: patientProfile.id,
        metadata: {
          medicationName: input.medicationName,
          hasDoctorInviteCode: Boolean(input.doctorInviteCode),
          doctorSharingConsent: input.doctorSharingConsent,
        },
      });
    });
  } catch (error) {
    if (error instanceof DoctorInviteCodeError) {
      return {
        status: "error",
        message: "The doctor invite code was not found.",
        errors: {
          doctorInviteCode: "Enter a valid doctor invite code or leave it empty.",
        },
      };
    }

    console.error("Failed to save patient onboarding", error);

    return {
      status: "error",
      message: "Onboarding could not be saved. Check the database connection.",
      errors: {
        form: "Database write failed.",
      },
    };
  }

  revalidatePath(routes.patient.root);
  revalidatePath(routes.patient.onboarding);

  return {
    status: "success",
    message: "Patient onboarding saved. You can run a tremor test next.",
    errors: {},
  };
}

function mapZodErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const errors: PatientOnboardingState["errors"] = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !(field in errors)) {
      errors[field as PatientOnboardingField] = issue.message;
    }
  }

  return errors;
}

class DoctorInviteCodeError extends Error {
  constructor() {
    super("Doctor invite code not found.");
  }
}
