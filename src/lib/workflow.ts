import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { user } from "./auth-schema";
import { db } from "./db";
import { activities, approvals, hires, intakeRequests, reviewEpisodes, taskDependencies, tasks, teams, templates, templateTasks, type HireRecord, type TaskRecord } from "./domain-schema";
import { preparationTemplates, selectTemplate, taskInstructions } from "./templates";
import type { ChangeImpact, Command, CommandResult, HireIntake, HireView, Readiness, UserSummary, WorkspacePayload } from "./types";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DomainError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); this.name = "DomainError"; }
}

export function businessDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function isTaskOverdue(dueDate: string, status: TaskRecord["status"], now = new Date()): boolean {
  return status !== "completed" && dueDate < businessDate(now);
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function deriveReadiness(
  taskList: Pick<TaskRecord, "required" | "status">[],
  approvalList: { preparationVersion: number; invalidatedAt: unknown }[],
  preparationVersion: number,
): Readiness {
  const required = taskList.filter((t) => t.required);
  if (!required.length || required.some((t) => t.status !== "completed")) return "preparing";
  return approvalList.some((a) => a.preparationVersion === preparationVersion && !a.invalidatedAt) ? "ready" : "awaiting_review";
}

const shortText = z.string().trim().min(1).max(120);
const reason = z.string().trim().min(3, "Give a reason of at least three characters.").max(1000);
const note = z.string().trim().max(1000);
const version = z.number().int().positive();
const intakeSchema = z.object({
  name: shortText,
  roleTitle: shortText,
  department: z.enum(["Engineering", "Sales", "Operations"]),
  startDate: z.string().refine(validDate, "Use a valid start date in YYYY-MM-DD format."),
  workArrangement: z.enum(["Onsite", "Hybrid", "Remote"]),
  managerId: shortText,
  coordinatorId: shortText,
  reviewerId: shortText,
  note: note.optional(),
}).strict();
const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createHire"), idempotencyKey: z.string().min(8).max(160), intake: intakeSchema }).strict(),
  z.object({ action: z.literal("transitionTask"), taskId: shortText, expectedVersion: version, status: z.enum(["pending", "in_progress", "completed"]), note: note.optional(), workEmail: z.string().trim().email().max(254).optional() }).strict(),
  z.object({ action: z.literal("confirmRequirements"), hireId: shortText, expectedVersion: version, equipment: z.string().trim().min(3).max(500), applications: z.array(z.string().trim().min(1).max(100)).min(1).max(20), deliveryContext: z.string().trim().min(3).max(500) }).strict(),
  z.object({ action: z.literal("reassignTask"), taskId: shortText, expectedVersion: version, assigneeId: shortText, reason }).strict(),
  z.object({ action: z.literal("approveHire"), hireId: shortText, expectedVersion: version, expectedPreparationVersion: version }).strict(),
  z.object({ action: z.literal("requestCorrection"), hireId: shortText, taskId: shortText, expectedVersion: version, reason }).strict(),
  z.object({ action: z.literal("updateHire"), hireId: shortText, expectedVersion: version, changes: intakeSchema.partial(), reason }).strict(),
  z.object({ action: z.literal("previewHireChange"), hireId: shortText, expectedVersion: version, changes: intakeSchema.partial() }).strict(),
  z.object({ action: z.literal("cancelHire"), hireId: shortText, expectedVersion: version, reason }).strict(),
  z.object({ action: z.literal("noteHire"), hireId: shortText, note: z.string().trim().min(1).max(1000) }).strict(),
]);

function conflict(actual: number, expected: number): void {
  if (actual !== expected) throw new DomainError("CONFLICT", "This record changed. Refresh it and review the latest information before saving.", 409);
}

function requireHR(actor: UserSummary): void {
  if (actor.role !== "HR") throw new DomainError("FORBIDDEN", "Only HR can perform this action.", 403);
}

async function activeUsers(tx: Transaction): Promise<UserSummary[]> {
  return await tx.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user).where(eq(user.active, true)) as UserSummary[];
}

async function validateActor(tx: Transaction, actor: UserSummary): Promise<UserSummary[]> {
  const users = await activeUsers(tx);
  const actual = users.find((u) => u.id === actor.id);
  if (!actual || actual.role !== actor.role) throw new DomainError("UNAUTHORIZED", "Sign in with an active demo account.", 401);
  return users;
}

function validateIntakeUsers(intake: HireIntake, users: UserSummary[]): void {
  for (const [id, role, label] of [[intake.managerId, "MANAGER", "Manager"], [intake.coordinatorId, "HR", "Coordinator"], [intake.reviewerId, "HR", "Reviewer"]] as const) {
    if (!users.some((u) => u.id === id && u.role === role)) throw new DomainError("INVALID_OWNER", `${label} must be an active ${role === "MANAGER" ? "manager" : "HR user"}.`);
  }
}

export async function ensureWorkflowTemplates(tx: Transaction): Promise<void> {
  await tx.insert(teams).values([{ id: "HR", name: "HR" }, { id: "IT", name: "IT" }, { id: "MANAGER", name: "Hiring Manager" }]).onConflictDoNothing();
  for (const template of preparationTemplates) {
    await tx.insert(templates).values({ id: template.id, name: template.name, version: template.version }).onConflictDoNothing();
    await tx.insert(templateTasks).values(template.tasks.map((t) => ({ ...t, id: `${template.id}:${t.key}`, templateId: template.id }))).onConflictDoNothing();
  }
}

export async function recordActivity(tx: Transaction, hireId: string, actorId: string, type: string, description: string, now: Date, taskId?: string): Promise<void> {
  await tx.insert(activities).values({ id: randomUUID(), hireId, actorId, type, description, occurredAt: now, taskId });
}

export async function instantiateHire(tx: Transaction, intake: HireIntake, users: UserSummary[], actorId: string, now: Date, demo = false, demoScenario: string | null = null): Promise<string> {
  validateIntakeUsers(intake, users);
  const template = selectTemplate(intake.roleTitle);
  const id = randomUUID();
  await tx.insert(hires).values({ id, ...intake, templateId: template.id, demo, demoScenario, createdAt: now });
  const assignedIT = users.find((u) => u.role === "IT");
  const ids = new Map(template.tasks.map((t) => [t.key, randomUUID()]));
  await tx.insert(tasks).values(template.tasks.map((t) => ({
    id: ids.get(t.key)!, hireId: id, templateTaskId: `${template.id}:${t.key}`, templateKey: t.key,
    title: t.title, instructions: taskInstructions(t, intake.workArrangement), team: t.team,
    assigneeId: t.team === "HR" ? intake.coordinatorId : t.team === "MANAGER" ? intake.managerId : assignedIT?.id ?? null,
    dueDate: addDays(intake.startDate, t.offsetDays), required: t.required, createdAt: now,
  })));
  const dependencies = template.tasks.flatMap((t) => t.dependencies.map((key) => ({ taskId: ids.get(t.key)!, prerequisiteId: ids.get(key)! })));
  if (dependencies.length) await tx.insert(taskDependencies).values(dependencies);
  await recordActivity(tx, id, actorId, "hire_created", `Created ${intake.name}'s ${template.name} preparation plan (version ${template.version}).${intake.note ? ` Coordination note: ${intake.note}` : ""}`, now);
  return id;
}

async function loadLockedHire(tx: Transaction, id: string, actor: UserSummary): Promise<HireRecord> {
  const [hire] = await tx.select().from(hires).where(eq(hires.id, id)).for("update");
  if (!hire) throw new DomainError("NOT_FOUND", "Hire not found.", 404);
  if (actor.role === "MANAGER" && hire.managerId !== actor.id) throw new DomainError("NOT_FOUND", "Hire not found.", 404);
  if (actor.role === "IT") {
    const [assignment] = await tx.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.hireId, id), eq(tasks.assigneeId, actor.id), eq(tasks.team, "IT"))).limit(1);
    if (!assignment) throw new DomainError("NOT_FOUND", "Hire not found.", 404);
  }
  if (hire.lifecycle !== "active") throw new DomainError("CANCELLED", "This hire is cancelled. Its history is preserved and active work is closed.", 409);
  return hire;
}

function ownerOnly(actor: UserSummary, task: TaskRecord): void {
  if (task.assigneeId !== actor.id || task.team !== actor.role) throw new DomainError("FORBIDDEN", "Only this task's assigned team member can update its work.", 403);
}

async function requirePrerequisites(tx: Transaction, task: TaskRecord): Promise<void> {
  const dependencies = await tx.select({ title: tasks.title, status: tasks.status }).from(taskDependencies).innerJoin(tasks, eq(tasks.id, taskDependencies.prerequisiteId)).where(eq(taskDependencies.taskId, task.id));
  const unfinished = dependencies.filter((d) => d.status !== "completed");
  if (unfinished.length) throw new DomainError("BLOCKED", `Complete the prerequisite first: ${unfinished.map((t) => t.title).join(", ")}.`, 409);
}

async function changeHireVersion(tx: Transaction, hire: HireRecord, actorId: string, now: Date, material: boolean, explanation: string): Promise<HireRecord> {
  const [updated] = await tx.update(hires).set({ version: hire.version + 1, preparationVersion: hire.preparationVersion + (material ? 1 : 0) }).where(eq(hires.id, hire.id)).returning();
  if (material) {
    const invalidated = await tx.update(approvals).set({ invalidatedAt: now, reason: explanation }).where(and(eq(approvals.hireId, hire.id), isNull(approvals.invalidatedAt))).returning({ id: approvals.id });
    if (invalidated.length) await recordActivity(tx, hire.id, actorId, "approval_invalidated", `Previous readiness approval invalidated: ${explanation}`, now);
  }
  return updated;
}

export async function synchronizeReview(tx: Transaction, hire: HireRecord, actorId: string, now: Date): Promise<void> {
  const taskList = await tx.select().from(tasks).where(eq(tasks.hireId, hire.id));
  const approvalList = await tx.select().from(approvals).where(eq(approvals.hireId, hire.id));
  const readiness = deriveReadiness(taskList, approvalList, hire.preparationVersion);
  const open = await tx.select().from(reviewEpisodes).where(and(eq(reviewEpisodes.hireId, hire.id), isNull(reviewEpisodes.endedAt)));
  for (const episode of open) {
    if (hire.lifecycle !== "active" || readiness !== "awaiting_review" || episode.preparationVersion !== hire.preparationVersion) {
      await tx.update(reviewEpisodes).set({ endedAt: now, outcome: hire.lifecycle !== "active" ? "cancelled" : readiness === "preparing" ? "returned" : "superseded" }).where(eq(reviewEpisodes.id, episode.id));
    }
  }
  if (hire.lifecycle === "active" && readiness === "awaiting_review" && !open.some((e) => e.preparationVersion === hire.preparationVersion)) {
    await tx.insert(reviewEpisodes).values({ id: randomUUID(), hireId: hire.id, preparationVersion: hire.preparationVersion, enteredAt: now });
    await recordActivity(tx, hire.id, actorId, "review_entered", "All required preparation is complete. Awaiting the assigned HR review.", now);
  }
}

async function affectedTaskIds(tx: Transaction, hireId: string, initial: string[]): Promise<string[]> {
  const hireTasks = await tx.select().from(tasks).where(eq(tasks.hireId, hireId));
  const dependencyRows = hireTasks.length ? await tx.select().from(taskDependencies).where(inArray(taskDependencies.taskId, hireTasks.map((t) => t.id))) : [];
  const affected = new Set(initial);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of dependencyRows) if (affected.has(edge.prerequisiteId) && !affected.has(edge.taskId)) { affected.add(edge.taskId); changed = true; }
  }
  return [...affected];
}

async function reopenTasks(tx: Transaction, hire: HireRecord, initial: string[], actorId: string, explanation: string, now: Date): Promise<TaskRecord[]> {
  const ids = await affectedTaskIds(tx, hire.id, initial);
  const all = ids.length ? await tx.select().from(tasks).where(inArray(tasks.id, ids)) : [];
  const reopened: TaskRecord[] = [];
  for (const task of all) {
    if (task.status === "completed" || initial.includes(task.id)) {
      await tx.update(tasks).set({ status: "pending", version: task.version + 1, note: explanation, completedAt: null, completedById: null }).where(eq(tasks.id, task.id));
      await recordActivity(tx, hire.id, actorId, "task_reopened", `${task.title} returned for revalidation: ${explanation}`, now, task.id);
      reopened.push(task);
    }
  }
  if (all.some((t) => t.templateKey === "requirements") && hire.requirements) await tx.update(hires).set({ requirements: { ...hire.requirements, confirmedAt: null } }).where(eq(hires.id, hire.id));
  return reopened;
}

async function previewChange(tx: Transaction, hire: HireRecord, changes: Partial<HireIntake>): Promise<ChangeImpact> {
  const keys = Object.keys(changes).filter((key) => key !== "note" && changes[key as keyof HireIntake] !== hire[key as keyof HireRecord]);
  const materialKeys = keys.filter((key) => key !== "name" && key !== "coordinatorId");
  const selected = new Set<string>();
  if (keys.includes("startDate")) ["arrival", "equipment", "workspace", "schedule"].forEach((key) => selected.add(key));
  if (keys.some((k) => ["managerId", "roleTitle", "department"].includes(k))) ["requirements", "schedule"].forEach((key) => selected.add(key));
  if (keys.includes("workArrangement")) ["requirements", "arrival", "workspace", "schedule"].forEach((key) => selected.add(key));
  const all = await tx.select().from(tasks).where(eq(tasks.hireId, hire.id));
  const ids = await affectedTaskIds(tx, hire.id, all.filter((t) => selected.has(t.templateKey)).map((t) => t.id));
  const affected = all.filter((t) => ids.includes(t.id) && (t.status === "completed" || selected.has(t.templateKey)));
  return { taskIds: affected.map((t) => t.id), taskTitles: affected.map((t) => t.title), invalidatesApproval: materialKeys.length > 0, changesDeadlines: keys.includes("startDate"), message: materialKeys.length ? "Affected preparation returns for checking and any current HR approval becomes invalid. Earlier completions and approvals remain in history." : "Name spelling and coordination changes preserve readiness approval." };
}

export async function executeCommand(actor: UserSummary, input: Command): Promise<CommandResult> {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("VALIDATION", parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(" "));
  const command = parsed.data as Command;
  return db.transaction(async (tx) => {
    const users = await validateActor(tx, actor);
    let now = new Date();
    if (command.action === "createHire") {
      requireHR(actor);
      validateIntakeUsers(command.intake, users);
      const key = `${actor.id}:${command.idempotencyKey}`;
      const payloadHash = createHash("sha256").update(JSON.stringify(command.intake)).digest("hex");
      const [existing] = await tx.select().from(intakeRequests).where(eq(intakeRequests.key, key));
      if (existing) {
        if (existing.payloadHash !== payloadHash) throw new DomainError("IDEMPOTENCY_CONFLICT", "This submitted request was already used with different information. Begin a new submission.", 409);
        return { hireId: existing.hireId, message: "Hire already saved. The original preparation plan has been returned." };
      }
      await ensureWorkflowTemplates(tx);
      const hireId = await instantiateHire(tx, command.intake, users, actor.id, now);
      const inserted = await tx.insert(intakeRequests).values({ key, actorId: actor.id, payloadHash, hireId }).onConflictDoNothing().returning();
      if (!inserted.length) {
        const [original] = await tx.select().from(intakeRequests).where(eq(intakeRequests.key, key));
        if (original.payloadHash !== payloadHash) throw new DomainError("IDEMPOTENCY_CONFLICT", "This submitted request was already used with different information.", 409);
        await tx.delete(hires).where(eq(hires.id, hireId));
        return { hireId: original.hireId, message: "Hire already saved. The original preparation plan has been returned." };
      }
      return { hireId, message: "Hire saved and preparation tasks generated." };
    }

    let task: TaskRecord | undefined;
    let hireId: string;
    if (command.action === "transitionTask" || command.action === "reassignTask") {
      [task] = await tx.select().from(tasks).where(eq(tasks.id, command.taskId));
      if (!task) throw new DomainError("NOT_FOUND", "Task not found.", 404);
      hireId = task.hireId;
    } else hireId = command.hireId;
    const hire = await loadLockedHire(tx, hireId, actor);
    // Stamp the change after its row lock: a waiting request must not predate the change it follows.
    now = new Date();
    if (task) [task] = await tx.select().from(tasks).where(eq(tasks.id, task.id));

    if (command.action === "noteHire") {
      await recordActivity(tx, hire.id, actor.id, "note_added", command.note, now);
      await changeHireVersion(tx, hire, actor.id, now, false, "Coordination note added");
      return { hireId, message: "Coordination note saved. Readiness approval is unchanged." };
    }

    if (command.action === "transitionTask") {
      ownerOnly(actor, task!);
      conflict(task!.version, command.expectedVersion);
      if (command.status === "completed" && task!.templateKey === "requirements" && task!.status !== "completed") throw new DomainError("REQUIREMENTS_REQUIRED", "Confirm the structured equipment and application requirements to complete this task.");
      const changedStatus = command.status !== task!.status;
      if (changedStatus && command.status !== "pending") await requirePrerequisites(tx, task!);
      if (task!.status === "completed" && changedStatus && command.status !== "pending") throw new DomainError("INVALID_TRANSITION", "Reopen completed work to Pending with a reason first.");
      if (command.status === "completed" && task!.templateKey === "access" && changedStatus) {
        if (!command.workEmail && !hire.workEmail) throw new DomainError("EVIDENCE_REQUIRED", "Confirm the prepared work email before completing access preparation.");
        if (!command.note || command.note.length < 3) throw new DomainError("EVIDENCE_REQUIRED", "Confirm which approved application access is ready in a short completion note.");
      }
      if (command.workEmail && task!.templateKey !== "access") throw new DomainError("FORBIDDEN", "Work email is confirmed only through the IT access task.", 403);
      if (!changedStatus && command.note === undefined && !command.workEmail) return { hireId, message: "No changes to save." };
      if (task!.status === "completed" && command.status === "pending") {
        if (!command.note || command.note.length < 3) throw new DomainError("REASON_REQUIRED", "Give a reason for reopening completed preparation.");
        await reopenTasks(tx, hire, [task!.id], actor.id, command.note, now);
      } else {
        await tx.update(tasks).set({ status: command.status, note: command.note ?? task!.note, version: task!.version + 1, completedAt: changedStatus && command.status === "completed" ? now : task!.completedAt, completedById: changedStatus && command.status === "completed" ? actor.id : task!.completedById }).where(eq(tasks.id, task!.id));
        await recordActivity(tx, hire.id, actor.id, changedStatus ? "task_status_changed" : "task_note_added", `${task!.title}: ${changedStatus ? command.status.replaceAll("_", " ") : "note updated"}${command.note ? `. ${command.note}` : ""}`, now, task!.id);
      }
      if (command.workEmail) await tx.update(hires).set({ workEmail: command.workEmail }).where(eq(hires.id, hire.id));
      const evidenceChanged = task!.required && task!.status === "completed" && ((command.note !== undefined && command.note !== task!.note) || (command.workEmail !== undefined && command.workEmail !== hire.workEmail));
      const material = task!.required && changedStatus || evidenceChanged;
      const updated = await changeHireVersion(tx, hire, actor.id, now, material, `${task!.title} updated`);
      await synchronizeReview(tx, updated, actor.id, now);
      return { hireId, message: command.status === "completed" && changedStatus ? "Task completed. Readiness and team queues updated." : "Task updated." };
    }

    if (command.action === "reassignTask") {
      requireHR(actor);
      conflict(task!.version, command.expectedVersion);
      if (task!.team === "MANAGER") throw new DomainError("MANAGER_ASSIGNMENT", "Manager tasks follow the hire's manager. Change the manager with an impact preview.");
      const assignee = users.find((u) => u.id === command.assigneeId && u.role === task!.team);
      if (!assignee) throw new DomainError("INVALID_OWNER", "Choose an active user from the task's responsible team.");
      await tx.update(tasks).set({ assigneeId: assignee.id, version: task!.version + 1 }).where(eq(tasks.id, task!.id));
      await changeHireVersion(tx, hire, actor.id, now, false, "Task reassigned");
      await recordActivity(tx, hire.id, actor.id, "task_reassigned", `${task!.title} assigned to ${assignee.name}: ${command.reason}`, now, task!.id);
      return { hireId, message: "Task reassigned within its responsible team." };
    }

    conflict(hire.version, command.expectedVersion);
    if (command.action === "confirmRequirements") {
      if (actor.role !== "MANAGER" || actor.id !== hire.managerId) throw new DomainError("FORBIDDEN", "Only this hire's manager can confirm requirements.", 403);
      const [requirementsTask] = await tx.select().from(tasks).where(and(eq(tasks.hireId, hire.id), eq(tasks.templateKey, "requirements")));
      ownerOnly(actor, requirementsTask);
      const requirements = { equipment: command.equipment, applications: [...new Set(command.applications)], deliveryContext: command.deliveryContext, confirmedAt: now.toISOString() };
      const changed = !hire.requirements || hire.requirements.equipment !== requirements.equipment || hire.requirements.deliveryContext !== requirements.deliveryContext || JSON.stringify(hire.requirements.applications) !== JSON.stringify(requirements.applications);
      if (requirementsTask.status === "completed" && !changed) return { hireId, message: "These requirements are already confirmed." };
      if (requirementsTask.status === "completed") await reopenTasks(tx, hire, [requirementsTask.id], actor.id, "Manager requirements changed", now);
      await tx.update(hires).set({ requirements }).where(eq(hires.id, hire.id));
      await tx.update(tasks).set({ status: "completed", version: requirementsTask.version + 1 + (requirementsTask.status === "completed" ? 1 : 0), completedAt: now, completedById: actor.id, note: `${requirements.equipment}; applications: ${requirements.applications.join(", ")}; ${requirements.deliveryContext}` }).where(eq(tasks.id, requirementsTask.id));
      const updated = await changeHireVersion(tx, hire, actor.id, now, true, "Manager equipment/application requirements confirmed or changed");
      await recordActivity(tx, hire.id, actor.id, "requirements_confirmed", `Manager confirmed equipment (${requirements.equipment}), applications (${requirements.applications.join(", ")}), and arrangement (${requirements.deliveryContext}).`, now, requirementsTask.id);
      await synchronizeReview(tx, updated, actor.id, now);
      return { hireId, message: "Requirements confirmed. Dependent tasks can proceed when their other prerequisites are complete." };
    }

    requireHR(actor);
    if (command.action === "approveHire") {
      if (hire.reviewerId !== actor.id) throw new DomainError("FORBIDDEN", "Only this hire's assigned HR reviewer can approve readiness.", 403);
      conflict(hire.preparationVersion, command.expectedPreparationVersion);
      const list = await tx.select().from(tasks).where(eq(tasks.hireId, hire.id));
      if (!list.some((t) => t.required) || list.some((t) => t.required && t.status !== "completed")) throw new DomainError("NOT_READY", "All required preparation must be complete before HR sign-off.", 409);
      const existing = await tx.select().from(approvals).where(and(eq(approvals.hireId, hire.id), isNull(approvals.invalidatedAt), eq(approvals.preparationVersion, hire.preparationVersion)));
      if (existing.length) return { hireId, message: "This preparation already has a valid HR sign-off." };
      await synchronizeReview(tx, hire, actor.id, now);
      const [episode] = await tx.select().from(reviewEpisodes).where(and(eq(reviewEpisodes.hireId, hire.id), isNull(reviewEpisodes.endedAt), eq(reviewEpisodes.preparationVersion, hire.preparationVersion)));
      await tx.insert(approvals).values({ id: randomUUID(), hireId, reviewerId: actor.id, reviewEpisodeId: episode.id, preparationVersion: hire.preparationVersion, approvedAt: now });
      await tx.update(reviewEpisodes).set({ endedAt: now, outcome: "approved" }).where(eq(reviewEpisodes.id, episode.id));
      await changeHireVersion(tx, hire, actor.id, now, false, "HR approval");
      await recordActivity(tx, hire.id, actor.id, "readiness_approved", `HR approved first-day readiness for preparation version ${hire.preparationVersion}.`, now);
      return { hireId, message: "HR sign-off saved. Ready for first day." };
    }

    if (command.action === "requestCorrection") {
      const [selected] = await tx.select().from(tasks).where(and(eq(tasks.id, command.taskId), eq(tasks.hireId, hire.id)));
      if (!selected) throw new DomainError("NOT_FOUND", "Task not found for this hire.", 404);
      const reopened = await reopenTasks(tx, hire, [selected.id], actor.id, command.reason, now);
      const updated = await changeHireVersion(tx, hire, actor.id, now, reopened.some((t) => t.required), command.reason);
      await synchronizeReview(tx, updated, actor.id, now);
      return { hireId, message: "Correction returned to the owner. Affected preparation and approval were re-evaluated." };
    }

    if (command.action === "cancelHire") {
      await tx.update(hires).set({ lifecycle: "cancelled", cancellationReason: command.reason }).where(eq(hires.id, hire.id));
      const updated = await changeHireVersion(tx, { ...hire, lifecycle: "cancelled" }, actor.id, now, true, `Hire cancelled: ${command.reason}`);
      await synchronizeReview(tx, { ...updated, lifecycle: "cancelled" }, actor.id, now);
      await recordActivity(tx, hire.id, actor.id, "hire_cancelled", `Hire cancelled: ${command.reason}`, now);
      return { hireId, message: "Hire cancelled. Records and history retained; active work closed." };
    }

    if (command.action === "previewHireChange" || command.action === "updateHire") {
      const combined = { ...hire, ...command.changes };
      validateIntakeUsers(combined, users);
      const impact = await previewChange(tx, hire, command.changes);
      if (command.action === "previewHireChange") return { hireId, impact, message: impact.message };
      if (!Object.keys(command.changes).length) return { hireId, impact, message: "No changes to save." };
      const selectedTemplate = selectTemplate(combined.roleTitle);
      const all = await tx.select().from(tasks).where(eq(tasks.hireId, hire.id));
      const changes = { ...command.changes };
      delete changes.note;
      await tx.update(hires).set({ ...changes, templateId: selectedTemplate.id }).where(eq(hires.id, hire.id));
      if (impact.taskIds.length) await reopenTasks(tx, hire, impact.taskIds, actor.id, command.reason, now);
      for (const task of all) {
        const definition = selectedTemplate.tasks.find((t) => t.key === task.templateKey);
        if (!definition) throw new DomainError("TEMPLATE_CHANGE", "This role needs a checklist change that is not supported by the shared baseline.");
        const update: Partial<typeof tasks.$inferInsert> = {};
        if (command.changes.startDate && command.changes.startDate !== hire.startDate && (task.status !== "completed" || impact.taskIds.includes(task.id))) update.dueDate = addDays(combined.startDate, definition.offsetDays);
        if ((command.changes.roleTitle && command.changes.roleTitle !== hire.roleTitle) || (command.changes.workArrangement && command.changes.workArrangement !== hire.workArrangement)) {
          update.instructions = taskInstructions(definition, combined.workArrangement);
          update.templateTaskId = `${selectedTemplate.id}:${definition.key}`;
        }
        if (task.team === "MANAGER" && combined.managerId !== hire.managerId) update.assigneeId = combined.managerId;
        if (task.team === "HR" && combined.coordinatorId !== hire.coordinatorId && task.status !== "completed") update.assigneeId = combined.coordinatorId;
        if (Object.keys(update).length) await tx.update(tasks).set({ ...update, version: task.version + 1 + (impact.taskIds.includes(task.id) ? 1 : 0) }).where(eq(tasks.id, task.id));
      }
      if (command.changes.note) await recordActivity(tx, hire.id, actor.id, "note_added", command.changes.note, now);
      const updated = await changeHireVersion(tx, hire, actor.id, now, impact.invalidatesApproval, command.reason);
      await recordActivity(tx, hire.id, actor.id, "hire_updated", `Updated ${Object.keys(changes).join(", ")}: ${command.reason}`, now);
      await synchronizeReview(tx, updated, actor.id, now);
      return { hireId, impact, message: "Hire updated. Preparation, deadlines, and review reflect the change." };
    }
    throw new DomainError("UNKNOWN_ACTION", "Unsupported action.");
  });
}

export async function getWorkspace(actor: UserSummary): Promise<WorkspacePayload> {
  return db.transaction(async (tx) => {
    const users = await validateActor(tx, actor);
    const now = new Date();
    const today = businessDate(now);
    const [hireRows, taskRows, dependencyRows, approvalRows, episodeRows, activityRows, people] = await Promise.all([
      tx.select().from(hires), tx.select().from(tasks), tx.select().from(taskDependencies), tx.select().from(approvals), tx.select().from(reviewEpisodes), tx.select().from(activities),
      tx.select({ id: user.id, name: user.name }).from(user),
    ]);
    const userMap = new Map(people.map((u) => [u.id, u]));
    const name = (id: string | null) => id ? userMap.get(id)?.name ?? "Inactive user" : "Unassigned";
    const taskMap = new Map(taskRows.map((t) => [t.id, t]));
    const visible = hireRows.filter((h) => actor.role === "HR" || actor.role === "MANAGER" && h.managerId === actor.id || actor.role === "IT" && taskRows.some((t) => t.hireId === h.id && t.team === "IT" && t.assigneeId === actor.id));
    const hireViews: HireView[] = visible.map((h) => {
      const currentTasks = taskRows.filter((t) => t.hireId === h.id);
      const currentApprovals = approvalRows.filter((a) => a.hireId === h.id);
      const readiness = deriveReadiness(currentTasks, currentApprovals, h.preparationVersion);
      return {
        ...h, createdAt: h.createdAt.toISOString(), managerName: name(h.managerId), coordinatorName: name(h.coordinatorId), reviewerName: name(h.reviewerId), readiness,
        atRisk: h.lifecycle === "active" && readiness !== "ready" && h.startDate <= addDays(today, 3),
        tasks: currentTasks.map((t) => {
          const dependencies = dependencyRows.filter((d) => d.taskId === t.id).map((d) => d.prerequisiteId);
          const unfinished = dependencies.map((id) => taskMap.get(id)).filter((d) => !d || d.status !== "completed");
          return { ...t, dependencies, assigneeName: name(t.assigneeId), blocked: t.status !== "completed" && unfinished.length > 0, blocker: unfinished.length ? `Waiting for ${unfinished.map((d) => d?.title ?? "missing prerequisite").join(", ")}` : null, overdue: h.lifecycle === "active" && isTaskOverdue(t.dueDate, t.status, now), createdAt: t.createdAt.toISOString(), completedAt: t.completedAt?.toISOString() ?? null, completedByName: t.completedById ? name(t.completedById) : null };
        }),
        approvals: currentApprovals.sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime()).map((a) => ({ id: a.id, reviewerId: a.reviewerId, reviewerName: name(a.reviewerId), approvedAt: a.approvedAt.toISOString(), preparationVersion: a.preparationVersion, invalidatedAt: a.invalidatedAt?.toISOString() ?? null, reason: a.reason })),
        reviewEpisodes: episodeRows.filter((e) => e.hireId === h.id).sort((a, b) => b.enteredAt.getTime() - a.enteredAt.getTime()).map((e) => ({ id: e.id, preparationVersion: e.preparationVersion, enteredAt: e.enteredAt.toISOString(), endedAt: e.endedAt?.toISOString() ?? null, outcome: e.outcome })),
        history: activityRows.filter((e) => e.hireId === h.id).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).map((e) => ({ id: e.id, type: e.type, actorName: name(e.actorId), occurredAt: e.occurredAt.toISOString(), description: e.description })),
      };
    });
    hireViews.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
    return { actor, users, hires: hireViews, now: now.toISOString(), businessDate: today, powerBi: { url: null, mode: "public", snapshotAt: null, configurationError: null } };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
