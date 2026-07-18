import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getAuthDb } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

export const auth = betterAuth({
  appName: "Parkinson Project",
  baseURL: env.BETTER_AUTH_URL ?? (isProductionBuild ? "http://localhost:3000" : undefined),
  secret:
    env.BETTER_AUTH_SECRET ??
    (isProductionBuild ? "build-time-placeholder-secret-value-32" : undefined),
  database: drizzleAdapter(getAuthDb(), {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: ["patient", "doctor"],
        required: true,
        input: true,
      },
    },
  },
  plugins: [nextCookies()],
});
