import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (!existsSync(".env.local")) {
  const example = readFileSync(".env.example", "utf8");
  writeFileSync(".env.local", example.replace("replace-with-a-random-secret-of-at-least-32-characters", randomBytes(32).toString("hex")), { mode: 0o600 });
  console.log("Created .env.local with a random authentication secret. It is excluded from Git.");
} else {
  console.log("Using existing .env.local; its settings were preserved.");
}
mkdirSync(".dayone", { recursive: true });
console.log("Next: npm run db:migrate, npm run demo:seed, npm run dev. Stop the local app before migration, seeding, or export commands that open its embedded database.");
