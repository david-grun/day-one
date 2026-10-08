import type { Role, UserSummary } from "./types";

export function rolesForSeed(user: { id: string; name: string; email: string; role: string }): UserSummary {
  if (!["HR", "IT", "MANAGER"].includes(user.role)) throw new Error("Account has an unsupported role.");
  return { ...user, role: user.role as Role };
}
