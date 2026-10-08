import { loadEnvironment } from "../src/lib/env";
loadEnvironment();
process.env.DAYONE_SEED_PROCESS = "1";

async function main() {
  const { auth } = await import("../src/lib/auth");
  const { db, closeDb } = await import("../src/lib/db");
  const { user } = await import("../src/lib/auth-schema");
  const { eq } = await import("drizzle-orm");
  const { seedDemoWorkflow } = await import("../src/lib/seed-workflow");
  const profiles = [
    ["Mara Santos", "mara", "HR"], ["Bea Lim", "bea", "HR"],
    ["Nico Reyes", "nico", "IT"], ["Sam Cruz", "sam", "IT"],
    ["Alex Chen", "alex", "MANAGER"], ["Jamie Flores", "jamie", "MANAGER"],
  ] as const;
  try {
    for (const [name, handle, role] of profiles) {
      const email = `${handle}@demo.dayone.test`;
      let [existing] = await db.select().from(user).where(eq(user.email, email));
      if (!existing) {
        const result = await auth.api.signUpEmail({ body: { name, email, password: "DayOneDemo!2026" } });
        await db.update(user).set({ role, emailVerified: true }).where(eq(user.id, result.user.id));
        [existing] = await db.select().from(user).where(eq(user.id, result.user.id));
      }
      if (existing.role !== role) throw new Error(`Existing demo account ${email} has a different role; refusing to overwrite it.`);
    }
    const users = await db.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user);
    const { rolesForSeed } = await import("../src/lib/server-utils");
    await seedDemoWorkflow(users.filter(row => row.email.endsWith("@demo.dayone.test")).map(rolesForSeed), process.argv.includes("--reset-demo"));
    console.log("Fictional demo accounts and workflow records are ready. Password: DayOneDemo!2026");
  } finally {
    await closeDb();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
