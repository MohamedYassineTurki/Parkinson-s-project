import { z } from "zod";

export const doctorOnboardingSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  specialty: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  organization: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((value) => value || undefined),
});

export type DoctorOnboardingInput = z.infer<typeof doctorOnboardingSchema>;

export type DoctorOnboardingField = keyof DoctorOnboardingInput | "form";
