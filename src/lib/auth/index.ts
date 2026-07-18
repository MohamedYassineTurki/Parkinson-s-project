import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getAuthDb } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

export const auth = betterAuth({
  appName: "Parkinson Project",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
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
