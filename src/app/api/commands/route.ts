import { getActor } from "@/lib/server";
import { executeCommand } from "@/lib/workflow";
import { checkOrigin, errorResponse, HttpError, limitCommands } from "@/lib/http";
import type { Command } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const actor = await getActor(request.headers);
    if (!actor) throw new HttpError(401, "AUTHENTICATION_REQUIRED", "Sign in before changing preparation.");
    await limitCommands(actor.id);
    if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "JSON_REQUIRED", "Send a JSON request.");
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 64_000) throw new HttpError(413, "REQUEST_TOO_LARGE", "This request is too large.");
    let command: Command;
    try { command = JSON.parse(body); } catch { throw new HttpError(400, "INVALID_JSON", "The request could not be read."); }
    const result = await executeCommand(actor, command);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error, "workflow command"); }
}
