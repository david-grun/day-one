import { randomUUID } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { db } from "./db";
import { commandLimits } from "./auth-schema";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000").origin;
  if (origin !== expected) throw new HttpError(403, "INVALID_ORIGIN", "This request must come from the DayOne website.");
}

export async function limitCommands(actorId: string) {
  const now = new Date();
  const minute = Math.floor(now.getTime() / 60_000);
  await db.delete(commandLimits).where(lt(commandLimits.expiresAt, new Date(now.getTime() - 86_400_000)));
  const [result] = await db.insert(commandLimits).values({ key: `${actorId}:${minute}`, count: 1, expiresAt: new Date((minute + 1) * 60_000) })
    .onConflictDoUpdate({ target: commandLimits.key, set: { count: sql`${commandLimits.count} + 1` } }).returning();
  if (result.count > 60) throw new HttpError(429, "TOO_MANY_REQUESTS", "Too many changes in a short time. Wait a minute and try again.");
}

export function errorResponse(error: unknown, operation: string) {
  const requestId = randomUUID();
  const record = error as { status?: number; code?: string; message?: string; name?: string };
  const status = Number.isInteger(record.status) && record.status! >= 400 && record.status! < 600 ? record.status! : 500;
  if (status >= 500) console.error({ requestId, operation, errorType: record.name || "Error", code: record.code || "INTERNAL_ERROR" });
  return Response.json({ error: {
    code: status < 500 ? record.code || "REQUEST_FAILED" : "SERVER_ERROR",
    message: status < 500 ? record.message || "This action could not be completed." : "DayOne could not complete the request. Your changes were not saved. Check the server and retry.",
  }, requestId }, { status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
}
