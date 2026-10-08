import { existsSync } from "node:fs";

export function loadEnvironment() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
}
