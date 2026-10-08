import { mkdir, writeFile, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import { loadEnvironment } from "../src/lib/env";
import { createSnapshot, SNAPSHOT_TABLES, snapshotCsv } from "../src/lib/reporting";
import type { UserSummary } from "../src/lib/types";

loadEnvironment();

async function main() {
  const { db, closeDb } = await import("../src/lib/db");
  try {
    const { user } = await import("../src/lib/auth-schema");
    const { and, eq } = await import("drizzle-orm");
    const { getWorkspace } = await import("../src/lib/workflow");
    const [reviewer] = await db.select().from(user).where(and(eq(user.role, "HR"), eq(user.active, true))).limit(1);
    if (!reviewer) throw new Error("No HR user found. Run npm run setup or seed the demo first.");
    const actor: UserSummary = { id: reviewer.id, name: reviewer.name, email: reviewer.email, role: "HR" };
    const snapshot = createSnapshot(await getWorkspace(actor));
    const output = resolve(process.argv[2] || process.env.ANALYTICS_EXPORT_DIR || "bi/export");
    await mkdir(output, { recursive: true });
    for (const table of SNAPSHOT_TABLES) {
      const target = join(output, `${table}.csv`);
      const temporary = `${target}.${process.pid}.tmp`;
      await writeFile(temporary, snapshotCsv(snapshot, table), "utf8");
      await rename(temporary, target);
    }
    await writeFile(join(output, "snapshot.json"), JSON.stringify(snapshot, null, 2), "utf8");
    console.log(`Exported ${snapshot.tables.hires.length} hires and ${snapshot.tables.tasks.length} tasks to ${output}`);
    console.log(`Snapshot: ${snapshot.snapshotAt} (business date ${snapshot.businessDate}, Asia/Manila)`);
    console.log("Refresh Power BI only after this command finishes successfully. Local exports do not update a published report automatically.");
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Export failed"); process.exitCode = 1; });
