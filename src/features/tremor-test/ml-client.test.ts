import { afterEach, describe, expect, it, vi } from "vitest";

import { env } from "@/lib/env";
import { analyzeTremorWithMl } from "./ml-client";

const originalUrl = env.ML_SERVICE_URL;
const originalKey = env.ML_SERVICE_API_KEY;

afterEach(() => {
  env.ML_SERVICE_URL = originalUrl;
  env.ML_SERVICE_API_KEY = originalKey;
  vi.unstubAllGlobals();
});

describe("ML service client", () => {
  it("falls back safely when the service is not configured", async () => {
    env.ML_SERVICE_URL = undefined;
    expect((await analyzeTremorWithMl("session", [])).status).toBe("unavailable");
  });

  it("validates and returns an authenticated inference response", async () => {
    env.ML_SERVICE_URL = "http://ml.internal:8000";
    env.ML_SERVICE_API_KEY = "internal-test-key-value";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request_id: "request-1",
      status: "success",
      model: { version: "feature-v1", model_type: "feature-logistic-regression", provenance: "test", clinically_validated: false },
      preprocessing_version: "signal-v2",
      predicted_severity_class: 1,
      predicted_severity_label: "low",
      probabilities: [0.1, 0.7, 0.15, 0.05],
      confidence: 0.7,
      features: { median_tremor_power: 1.2 },
      window_count: 10,
      inference_duration_ms: 3.2,
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeTremorWithMl("session", [{ t: 0, x: 0, y: 0, z: 9.81 }]);
    expect(result.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://ml.internal:8000/v1/analyze-session"),
      expect.objectContaining({ headers: expect.objectContaining({ "X-ML-Service-Key": "internal-test-key-value" }) }),
    );
  });
});
