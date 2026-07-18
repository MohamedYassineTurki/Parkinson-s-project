import { z } from "zod";

export const medicationSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    dose: z.string().trim().min(1).max(80),
    frequencyPerDay: z.coerce.number().int().min(1).max(12),
    scheduleTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(12),
    instructions: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.scheduleTimes.length === value.frequencyPerDay, {
    message: "The number of schedule times must match the daily frequency.",
    path: ["scheduleTimes"],
  });
