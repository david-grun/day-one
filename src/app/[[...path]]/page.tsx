import { redirect, notFound } from "next/navigation";
import { getWorkspaceForSession } from "@/lib/server";
import Workspace from "@/components/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  if (path.length && !["hires", "tasks", "analytics"].includes(path[0])) notFound();
  if (path.length > 2 || (path.length === 2 && path[0] !== "hires")) notFound();
  const data = await getWorkspaceForSession();
  if (!data) redirect("/login");
  return <Workspace initialData={data} initialPath={path} />;
}
