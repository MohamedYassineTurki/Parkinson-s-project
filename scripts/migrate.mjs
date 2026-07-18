import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required when RUN_DB_MIGRATIONS=true.");
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });

  const [userTable] = await client`
    select to_regclass('public."user"') as table_name
  `;

  if (!userTable?.table_name) {
    throw new Error('Database migrations completed, but public."user" was not created.');
  }

  console.log('Database migrations completed. Found public."user".');
} finally {
  await client.end();
}
