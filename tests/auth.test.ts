import { test } from "node:test";
import assert from "node:assert/strict";
import type { PGlite } from "@electric-sql/pglite";

test("real password sessions, closed public signup, server-owned roles, and account deactivation", async () => {
  process.env.DAYONE_DB_PATH = ":memory:";
  process.env.DATABASE_URL = "";
  process.env.BETTER_AUTH_SECRET = "test-secret-with-at-least-32-characters-never-deployed";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  delete process.env.DAYONE_SEED_PROCESS;
  const { db, databaseClient, closeDb } = await import("../src/lib/db");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await migrate(drizzle(databaseClient() as PGlite), { migrationsFolder: "drizzle" });
  const { auth } = await import("../src/lib/auth");
  const { betterAuth } = await import("better-auth");
  const { user } = await import("../src/lib/auth-schema");
  const { eq } = await import("drizzle-orm");
  const { getActor } = await import("../src/lib/server");
  const { checkOrigin } = await import("../src/lib/http");
  try {
    const blocked = await auth.handler(new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({ name: "Unapproved", email: "unapproved@demo.dayone.test", password: "DayOneDemo!2026", role: "HR" }),
    }));
    assert.ok(blocked.status >= 400, "runtime signup must be closed");
    const seedAuth = betterAuth({ ...auth.options, emailAndPassword: { enabled: true, disableSignUp: false }, rateLimit: { enabled: false } });
    const createdResponse = await seedAuth.handler(new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({ name: "Test reviewer", email: "reviewer@demo.dayone.test", password: "DayOneDemo!2026", role: "HR" }),
    }));
    assert.equal(createdResponse.status, 200);
    const result = await createdResponse.json();
    const [created] = await db.select().from(user).where(eq(user.id, result.user.id));
    assert.equal(created.role, "MANAGER", "API input cannot elevate a role");
    await db.update(user).set({ role: "HR", emailVerified: true }).where(eq(user.id, created.id));
    const wrong = await auth.handler(new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({ email: created.email, password: "wrong-password-value" }),
    }));
    assert.equal(wrong.status, 401);
    const signedIn = await auth.api.signInEmail({ body: { email: created.email, password: "DayOneDemo!2026" }, asResponse: true });
    assert.equal(signedIn.status, 200);
    const cookie = signedIn.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    assert.ok(cookie.includes("session_token"));
    const requestHeaders = new Headers({ Cookie: cookie });
    assert.equal((await getActor(requestHeaders))?.role, "HR");
    assert.equal(await getActor(new Headers()), null);
    await db.update(user).set({ active: false }).where(eq(user.id, created.id));
    assert.equal(await getActor(requestHeaders), null, "server checks account activity beyond the cookie");
    assert.throws(() => checkOrigin(new Request("http://localhost:3000/api/commands", { headers: { Origin: "https://untrusted.example" } })), /must come from/);
  } finally { await closeDb(); }
});
