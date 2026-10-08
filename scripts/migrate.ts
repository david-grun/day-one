import { loadEnvironment } from "../src/lib/env";
import type { PGlite } from "@electric-sql/pglite";
loadEnvironment();

async function main() {
  const { db, databaseClient, closeDb, isHostedDatabase } = await import("../src/lib/db");
  const client = databaseClient();
  try {
    if (!isHostedDatabase()) {
      const { drizzle } = await import("drizzle-orm/pglite");
      const { migrate } = await import("drizzle-orm/pglite/migrator");
      await migrate(drizzle(client as PGlite), { migrationsFolder: "drizzle" });
    } else {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: "drizzle" });
    }
    console.log("DayOne database migrations applied. Existing records preserved.");
  } finally {
    await closeDb();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
