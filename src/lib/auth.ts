import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./auth-schema";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32 || secret.startsWith("replace-with")) {
  throw new Error("Run npm run setup to create a local authentication secret, or set BETTER_AUTH_SECRET to at least 32 random characters in Vercel.");
}

export const auth = betterAuth({
  appName: "DayOne",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.DAYONE_SEED_PROCESS !== "1",
    minPasswordLength: 12,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "MANAGER", input: false },
      active: { type: "boolean", required: true, defaultValue: true, input: false },
    },
  },
  rateLimit: {
    enabled: process.env.DAYONE_SEED_PROCESS !== "1",
    storage: "database",
    window: 60,
    max: 60,
    customRules: { "/sign-in/email": { window: 60, max: 10 } },
  },
});
