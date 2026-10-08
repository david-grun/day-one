import { getWorkspaceForSession } from "@/lib/server";
import { errorResponse, HttpError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const data = await getWorkspaceForSession(request.headers);
    if (!data) throw new HttpError(401, "AUTHENTICATION_REQUIRED", "Sign in to view DayOne.");
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error, "read workspace"); }
}
