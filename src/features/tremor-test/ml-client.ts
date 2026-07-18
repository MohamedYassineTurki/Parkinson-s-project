import { z } from "zod";

import { env } from "@/lib/env";
import type { AccelerationSample } from "./types";

const responseSchema = z.object({
  request_id: z.string(),
  status: z.literal("success"),
  model: z.object({
    version: z.string(),
    model_type: z.string(),
    provenance: z.string(),
    clinically_validated: z.boolean(),
  }),
  preprocessing_version: z.literal("signal-v2"),
  predicted_severity_class: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  predicted_severity_label: z.enum(["none", "low", "medium", "high"]),
  probabilities: z.array(z.number().min(0).max(1)).length(4),
  confidence: z.number().min(0).max(1),
  features: z.record(z.string(), z.number()),
  window_count: z.number().int().nonnegative(),
  inference_duration_ms: z.number().nonnegative(),
});

export type MlInferenceResult =
  | { status: "success"; prediction: z.infer<typeof responseSchema> }
  | { status: "unavailable" | "failed"; reason: string };

export async function analyzeTremorWithMl(
  sessionId: string,
  samples: AccelerationSample[],
): Promise<MlInferenceResult> {
  if (!env.ML_SERVICE_URL) {
    return { status: "unavailable", reason: "ML service is not configured; deterministic analysis was saved." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(new URL("/v1/analyze-session", env.ML_SERVICE_URL), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.ML_SERVICE_API_KEY ? { "X-ML-Service-Key": env.ML_SERVICE_API_KEY } : {}),
      },
      body: JSON.stringify({ session_id: sessionId, samples }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return { status: response.status === 503 ? "unavailable" : "failed", reason: `ML service returned HTTP ${response.status}.` };
    }
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) return { status: "failed", reason: "ML service returned an incompatible response." };
    return { status: "success", prediction: parsed.data };
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError"
      ? "ML inference timed out; deterministic analysis was saved."
      : "ML service could not be reached; deterministic analysis was saved.";
    return { status: "unavailable", reason };
  } finally {
    clearTimeout(timeout);
  }
}
