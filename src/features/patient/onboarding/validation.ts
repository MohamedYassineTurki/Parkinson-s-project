import { z } from "zod";

const timeValueSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM time format.");

export const patientOnboardingSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required.").max(80),
    lastName: z.string().trim().min(1, "Last name is required.").max(80),
    dateOfBirth: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    phoneNumber: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => value || undefined),
    medicationName: z.string().trim().min(1, "Medication name is required.").max(120),
    dose: z.string().trim().min(1, "Dose is required.").max(80),
    frequencyPerDay: z.coerce
      .number()
      .int()
      .min(1, "Frequency must be at least once per day.")
      .max(12, "Frequency cannot be more than 12 times per day."),
    scheduleTimes: z.array(timeValueSchema).min(1).max(12),
    instructions: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => value || undefined),
    doctorInviteCode: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => value?.toUpperCase() || undefined),
    doctorSharingConsent: z.coerce.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.scheduleTimes.length !== value.frequencyPerDay) {
      context.addIssue({
        code: "custom",
        message: "Number of schedule times must match the daily frequency.",
        path: ["scheduleTimes"],
      });
    }

    if (new Set(value.scheduleTimes).size !== value.scheduleTimes.length) {
      context.addIssue({
        code: "custom",
        message: "Schedule times must be unique.",
        path: ["scheduleTimes"],
      });
    }

    if (value.doctorInviteCode && !value.doctorSharingConsent) {
      context.addIssue({
        code: "custom",
        message: "Consent is required to share data with a selected doctor.",
        path: ["doctorSharingConsent"],
      });
    }
  });

export type PatientOnboardingInput = z.infer<typeof patientOnboardingSchema>;

export type PatientOnboardingField = keyof PatientOnboardingInput | "form";
