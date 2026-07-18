import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { env } from "@/lib/env";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to initialize the database client.");
  }

  dbInstance ??= drizzle(postgres(env.DATABASE_URL), { schema });

  return dbInstance;
}

export function getAuthDb() {
  if (!dbInstance) {
    const connectionString =
      env.DATABASE_URL ?? "postgres://unused:unused@127.0.0.1:5432/unused";

    dbInstance = drizzle(postgres(connectionString), { schema });
  }

  return dbInstance;
}
