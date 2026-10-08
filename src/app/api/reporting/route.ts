import { getWorkspaceForSession } from "@/lib/server";
import { createSnapshot, snapshotCsv } from "@/lib/reporting";
import { errorResponse, HttpError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const data = await getWorkspaceForSession(request.headers);
    if (!data) throw new HttpError(401, "AUTHENTICATION_REQUIRED", "Sign in to export reporting data.");
    if (data.actor.role !== "HR") throw new HttpError(403, "HR_REQUIRED", "Only HR can export the reporting dataset.");
    const snapshot = createSnapshot(data);
    const table = new URL(request.url).searchParams.get("table");
    if (table) {
      if (!["hires", "tasks", "teams", "review_episodes", "approval_history", "metadata"].includes(table)) throw new HttpError(400, "INVALID_TABLE", "Choose a documented reporting table.");
      return new Response(snapshotCsv(snapshot, table as Parameters<typeof snapshotCsv>[1]), { headers: {
        "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${table}.csv"`, "Cache-Control": "private, no-store",
      } });
    }
    return Response.json(snapshot, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error, "reporting export"); }
}
