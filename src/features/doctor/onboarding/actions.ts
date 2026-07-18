"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db/client";
import { auditLogs, doctorProfiles, profiles } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import {
  doctorOnboardingSchema,
  type DoctorOnboardingField,
} from "./validation";

export type DoctorOnboardingState = {
  status: "idle" | "success" | "error";
  message: string;
  inviteCode?: string;
  errors: Partial<Record<DoctorOnboardingField, string>>;
};

export async function saveDoctorOnboarding(
  _previousState: DoctorOnboardingState,
  formData: FormData,
): Promise<DoctorOnboardingState> {
  const user = await requireRole("doctor");
  const parsed = doctorOnboardingSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    specialty: formData.get("specialty"),
    organization: formData.get("organization"),
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
    const inviteCode = await db.transaction(async (tx) => {
      const [profile] = await tx
        .insert(profiles)
        .values({
          userId: user.id,
          role: "doctor",
          firstName: input.firstName,
          lastName: input.lastName,
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            role: "doctor",
            firstName: input.firstName,
            lastName: input.lastName,
            updatedAt: new Date(),
          },
        })
        .returning();

      const existingDoctorProfile = await tx.query.doctorProfiles.findFirst({
        columns: {
          id: true,
          inviteCode: true,
        },
        where: eq(doctorProfiles.profileId, profile.id),
      });

      const inviteCode =
        existingDoctorProfile?.inviteCode ?? (await createUniqueDoctorInviteCode(tx));

      const [doctorProfile] = await tx
        .insert(doctorProfiles)
        .values({
          profileId: profile.id,
          inviteCode,
          specialty: input.specialty,
          organization: input.organization,
        })
        .onConflictDoUpdate({
          target: doctorProfiles.profileId,
          set: {
            specialty: input.specialty,
            organization: input.organization,
            updatedAt: new Date(),
          },
        })
        .returning();

      await tx.insert(auditLogs).values({
        actorProfileId: profile.id,
        actorType: "doctor",
        action: "doctor_onboarding_saved",
        targetType: "doctor_profile",
        targetId: doctorProfile.id,
        metadata: {
          hasSpecialty: Boolean(input.specialty),
          hasOrganization: Boolean(input.organization),
        },
      });

      return inviteCode;
    });

    revalidatePath(routes.doctor.root);
    revalidatePath(routes.doctor.onboarding);

    return {
      status: "success",
      message: "Doctor onboarding saved. Share your invite code with patients.",
      inviteCode,
      errors: {},
    };
  } catch (error) {
    console.error("Failed to save doctor onboarding", error);

    return {
      status: "error",
      message: "Onboarding could not be saved. Check the database connection.",
      errors: {
        form: "Database write failed.",
      },
    };
  }
}

type DoctorInviteTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

async function createUniqueDoctorInviteCode(tx: DoctorInviteTransaction) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateDoctorInviteCode();
    const existing = await tx.query.doctorProfiles.findFirst({
      columns: {
        id: true,
      },
      where: eq(doctorProfiles.inviteCode, code),
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Could not generate a unique doctor invite code.");
}

function generateDoctorInviteCode() {
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();

  return `DR-${randomPart}`;
}

function mapZodErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const errors: DoctorOnboardingState["errors"] = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !(field in errors)) {
      errors[field as DoctorOnboardingField] = issue.message;
    }
  }

  return errors;
}
