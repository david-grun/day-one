import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { user } from "./auth-schema";
import { rolesForSeed } from "./server-utils";
import { getWorkspace } from "./workflow";
import { validatePowerBiUrl } from "./reporting";
import type { UserSummary, WorkspacePayload } from "./types";

export async function getActor(requestHeaders?: Headers): Promise<UserSummary | null> {
  const session = await auth.api.getSession({ headers: requestHeaders || await headers() });
  if (!session) return null;
  const [record] = await db.select().from(user).where(eq(user.id, session.user.id));
  if (!record?.active) return null;
  return rolesForSeed(record);
}

export async function getWorkspaceForSession(requestHeaders?: Headers): Promise<WorkspacePayload | null> {
  const actor = await getActor(requestHeaders);
  if (!actor) return null;
  return workspaceForActor(actor);
}

export async function workspaceForActor(actor: UserSummary): Promise<WorkspacePayload> {
  const data = await getWorkspace(actor);
  const mode = process.env.POWER_BI_EMBED_MODE === "secure" ? "secure" : "public";
  const configured = validatePowerBiUrl(process.env.POWER_BI_EMBED_URL || "", mode);
  const timestamp = process.env.POWER_BI_SNAPSHOT_AT;
  return { ...data, powerBi: {
    url: configured.url,
    mode,
    snapshotAt: timestamp && Number.isFinite(Date.parse(timestamp)) ? new Date(timestamp).toISOString() : null,
    configurationError: configured.error,
  } };
}
