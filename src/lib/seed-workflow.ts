import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { approvals, hires, reviewEpisodes, tasks } from "./domain-schema";
import type { HireIntake, UserSummary } from "./types";
import { addDays, businessDate, ensureWorkflowTemplates, instantiateHire, recordActivity } from "./workflow";

const fictionalNames = ["Sofia Dela Cruz", "Eli Ramos", "Amara Villanueva", "Noah Tan", "Isla Mendoza", "Luca Bautista", "Mika Navarro", "Theo Castillo", "Ava Mercado", "Kai Soriano", "Lia Fernandez", "Zane Pascual", "Maya Aquino", "Leo Santiago", "Nina Valdez", "Dylan Flores", "Iris Gonzales", "Rafi Torres", "Cleo Morales", "Enzo Rivera", "Tala Garcia", "Finn Lim", "Aria Domingo", "Jules Cruz", "Sage Reyes"];

function daysBefore(now: Date, days: number): Date { return new Date(now.getTime() - days * 86_400_000); }

/** Explicit seed/reset only. Real hires and auth users are never removed. */
export async function seedDemoWorkflow(users: UserSummary[], reset = false): Promise<{ count: number; skipped: boolean }> {
  const hr = users.filter((u) => u.role === "HR");
  const managers = users.filter((u) => u.role === "MANAGER");
  const it = users.filter((u) => u.role === "IT");
  const coordinator = users.find((u) => u.email === "mara@demo.dayone.test") ?? hr[0];
  if (!coordinator || !managers.length || !it.length) throw new Error("Seed HR, IT, and manager demo accounts before workflow records.");
  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: hires.id }).from(hires).where(eq(hires.demo, true));
    if (existing.length && !reset) return { count: existing.length, skipped: true };
    if (reset) await tx.delete(hires).where(eq(hires.demo, true));
    await ensureWorkflowTemplates(tx);
    const now = new Date();
    const today = businessDate(now);
    for (let index = 0; index < fictionalNames.length; index++) {
      const kind = index === 0 ? "walkthrough" : index === 1 ? "blocked" : index === 2 ? "reopened" : index === 24 ? "cancelled" : index % 3 === 0 ? "ready" : index % 3 === 1 ? "review" : "preparing";
      const manager = managers[index % managers.length];
      const selectedIT = it[index % it.length];
      const reviewer = index > 5 && index % 5 === 0 ? hr[1] ?? coordinator : coordinator;
      const roleTitle = index % 3 === 0 ? "Software Engineer" : index % 3 === 1 ? "Sales Associate" : "Operations Specialist";
      const startOffset = index === 0 ? 2 : index === 1 ? -1 : index === 2 ? 4 : (index * 3) % 35 - 4;
      const intake: HireIntake = { name: fictionalNames[index], roleTitle, department: roleTitle === "Software Engineer" ? "Engineering" : roleTitle === "Sales Associate" ? "Sales" : "Operations", startDate: addDays(today, startOffset), workArrangement: ["Onsite", "Hybrid", "Remote"][index % 3] as HireIntake["workArrangement"], managerId: manager.id, coordinatorId: coordinator.id, reviewerId: reviewer.id };
      const createdAt = daysBefore(now, 21 + index % 4);
      const scenario = kind === "walkthrough" ? "HR walkthrough: finish joining instructions, then approve" : kind === "blocked" ? "Overdue IT preparation waiting for manager requirements" : kind === "reopened" ? "Previous HR approval invalidated by equipment correction" : kind === "ready" ? "Approved readiness with optional buddy unfinished" : kind === "review" ? "Required preparation complete, awaiting assigned HR review" : kind === "cancelled" ? "Cancelled intake retained for audit history" : "Preparation underway across teams";
      const id = await instantiateHire(tx, intake, users, coordinator.id, createdAt, true, scenario);
      const taskList = await tx.select().from(tasks).where(eq(tasks.hireId, id));
      await tx.update(tasks).set({ assigneeId: selectedIT.id }).where(and(eq(tasks.hireId, id), eq(tasks.team, "IT")));
      const applications = roleTitle === "Software Engineer" ? ["Repository", "Development tools"] : roleTitle === "Sales Associate" ? ["CRM", "Teams"] : ["Operations workspace", "Teams"];
      const confirmed = kind !== "blocked" && !(kind === "preparing" && index % 2 === 0);
      if (confirmed) await tx.update(hires).set({ requirements: { equipment: "Company laptop and headset", applications, deliveryContext: intake.workArrangement === "Remote" ? "Delivery appointment confirmed through company coordinator" : "Equipment available at the assigned first-day workspace", confirmedAt: new Date(createdAt.getTime() + 2 * 86_400_000).toISOString() } }).where(eq(hires.id, id));
      let requiredComplete = 0;
      let totalComplete = 0;
      for (const task of taskList) {
        let complete = task.required && ["ready", "review", "reopened", "cancelled", "walkthrough"].includes(kind);
        if (kind === "walkthrough" && task.templateKey === "arrival") complete = false;
        if (kind === "blocked") complete = ["administration", "arrival", "schedule"].includes(task.templateKey);
        if (kind === "preparing") complete = ["administration", "arrival", "requirements"].includes(task.templateKey) && (task.templateKey !== "requirements" || confirmed);
        if (!complete) continue;
        const completedAt = new Date(createdAt.getTime() + (task.templateKey === "requirements" ? 2 : task.team === "IT" ? 5 : 6) * 86_400_000 + index * 60_000);
        const actor = task.team === "IT" ? selectedIT : task.team === "MANAGER" ? manager : coordinator;
        const completionNote = task.templateKey === "access" ? `Confirmed ${applications.join(" and ")} access. Fictional seeded preparation.` : task.templateKey === "requirements" ? `Laptop and headset; ${applications.join(", ")}; ${intake.workArrangement} arrangement confirmed.` : "Fictional seeded preparation completed and checked.";
        await tx.update(tasks).set({ status: "completed", completedAt, completedById: actor.id, version: 2, note: completionNote }).where(eq(tasks.id, task.id));
        await recordActivity(tx, id, actor.id, "task_status_changed", `${task.title}: completed. ${completionNote}`, completedAt, task.id);
        if (task.templateKey === "requirements") await recordActivity(tx, id, actor.id, "requirements_confirmed", `Manager confirmed laptop, approved ${applications.join(", ")}, and ${intake.workArrangement} preparation.`, completedAt, task.id);
        if (task.templateKey === "access") await tx.update(hires).set({ workEmail: `${fictionalNames[index].toLowerCase().replaceAll(" ", ".")}@demo.dayone.test` }).where(eq(hires.id, id));
        totalComplete++;
        if (task.required) requiredComplete++;
      }
      const preparationVersion = requiredComplete + 1;
      await tx.update(hires).set({ preparationVersion, version: totalComplete + 1 }).where(eq(hires.id, id));
      if (["ready", "review", "reopened", "cancelled"].includes(kind)) {
        const enteredAt = new Date(createdAt.getTime() + 6 * 86_400_000 + index * 60_000);
        const episodeId = randomUUID();
        await tx.insert(reviewEpisodes).values({ id: episodeId, hireId: id, preparationVersion, enteredAt });
        await recordActivity(tx, id, coordinator.id, "review_entered", "All required preparation complete; assigned HR review requested.", enteredAt);
        if (kind !== "review") {
          const approvedAt = new Date(enteredAt.getTime() + (3 + index % 4) * 3_600_000);
          const approvalId = randomUUID();
          await tx.insert(approvals).values({ id: approvalId, hireId: id, reviewerId: reviewer.id, reviewEpisodeId: episodeId, preparationVersion, approvedAt });
          await tx.update(reviewEpisodes).set({ endedAt: approvedAt, outcome: "approved" }).where(eq(reviewEpisodes.id, episodeId));
          await recordActivity(tx, id, reviewer.id, "readiness_approved", `HR approved first-day readiness for preparation version ${preparationVersion}.`, approvedAt);
          await tx.update(hires).set({ version: totalComplete + 2 }).where(eq(hires.id, id));
          if (kind === "reopened") {
            const reopenedAt = daysBefore(now, 2);
            const equipment = taskList.find((t) => t.templateKey === "equipment")!;
            await tx.update(tasks).set({ status: "pending", version: 3, completedAt: null, completedById: null, note: "Check replacement equipment before the employee starts." }).where(eq(tasks.id, equipment.id));
            await tx.update(approvals).set({ invalidatedAt: reopenedAt, reason: "Equipment replacement requires revalidation" }).where(eq(approvals.id, approvalId));
            await tx.update(hires).set({ version: totalComplete + 3, preparationVersion: preparationVersion + 1 }).where(eq(hires.id, id));
            await recordActivity(tx, id, coordinator.id, "task_reopened", "Equipment preparation returned for a replacement check; previous completion remains in history.", reopenedAt, equipment.id);
            await recordActivity(tx, id, coordinator.id, "approval_invalidated", "Earlier HR approval invalidated: equipment replacement requires revalidation.", reopenedAt);
          }
          if (kind === "cancelled") {
            const cancelledAt = daysBefore(now, 1);
            await tx.update(hires).set({ lifecycle: "cancelled", cancellationReason: "Fictional hire will no longer start", version: totalComplete + 3, preparationVersion: preparationVersion + 1 }).where(eq(hires.id, id));
            await tx.update(approvals).set({ invalidatedAt: cancelledAt, reason: "Hire cancelled" }).where(and(eq(approvals.hireId, id), isNull(approvals.invalidatedAt)));
            await recordActivity(tx, id, coordinator.id, "hire_cancelled", "Fictional hire cancelled; history preserved and active preparation closed.", cancelledAt);
          }
        }
      }
    }
    return { count: fictionalNames.length, skipped: false };
  });
}
