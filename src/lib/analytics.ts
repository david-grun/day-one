import type { HireView, Readiness, Role, TaskView } from "./types";

export const TEAM_NAMES: Record<Role, string> = { HR: "HR", IT: "IT", MANAGER: "Hiring Manager" };
export const READINESS_NAMES: Record<Readiness, string> = {
  preparing: "Preparing", awaiting_review: "Awaiting HR review", ready: "Ready for first day",
};
export interface CohortFilter { department?: string; startFrom?: string; startTo?: string }

export function manilaDate(instant: string | Date): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid timestamp");
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-");
}

export function daysBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

export function taskOverdue(task: Pick<TaskView, "status" | "dueDate">, businessDate: string): boolean {
  return task.status !== "completed" && task.dueDate < businessDate;
}

export function taskBlocked(task: TaskView, tasks: TaskView[]): boolean {
  return task.status !== "completed" && task.dependencies.some((id) => tasks.find((item) => item.id === id)?.status !== "completed");
}

export function currentApproval(hire: HireView) {
  return hire.approvals.filter((approval) => !approval.invalidatedAt && approval.preparationVersion === hire.preparationVersion)
    .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))[0] ?? null;
}

export function hireReadiness(hire: HireView): Readiness {
  const required = hire.tasks.filter((task) => task.required);
  if (!required.length || required.some((task) => task.status !== "completed")) return "preparing";
  return currentApproval(hire) ? "ready" : "awaiting_review";
}

export function hireAtRisk(hire: HireView, businessDate: string): boolean {
  return hire.lifecycle === "active" && hireReadiness(hire) !== "ready" && daysBetween(businessDate, hire.startDate) <= 3;
}

export function filterCohort(hires: HireView[], filter: CohortFilter = {}): HireView[] {
  return hires.filter((hire) => hire.lifecycle === "active"
    && (!filter.department || hire.department === filter.department)
    && (!filter.startFrom || hire.startDate >= filter.startFrom)
    && (!filter.startTo || hire.startDate <= filter.startTo));
}

export function elapsedHours(from: string, to: string): number | null {
  const hours = (Date.parse(to) - Date.parse(from)) / 3_600_000;
  return Number.isFinite(hours) && hours >= 0 ? hours : null;
}

const average = (values: number[]): number | null => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export function cohortMetrics(hires: HireView[], now: string, businessDate = manilaDate(now)) {
  const cohort = filterCohort(hires);
  const tasks = cohort.flatMap((hire) => hire.tasks);
  const required = tasks.filter((task) => task.required);
  const ready = cohort.filter((hire) => hireReadiness(hire) === "ready");
  const awaiting = cohort.filter((hire) => hireReadiness(hire) === "awaiting_review");
  const waiting = awaiting.map((hire) => {
    const episode = hire.reviewEpisodes.filter((item) => !item.endedAt && item.preparationVersion === hire.preparationVersion)
      .sort((a, b) => b.enteredAt.localeCompare(a.enteredAt))[0];
    return { hire, enteredAt: episode?.enteredAt ?? null, hours: episode ? elapsedHours(episode.enteredAt, now) : null };
  });
  const signoffs = cohort.flatMap((hire) => hire.reviewEpisodes.filter((episode) => episode.outcome === "approved" && episode.endedAt)
    .map((episode) => ({ hire, episode, hours: elapsedHours(episode.enteredAt, episode.endedAt!) })))
    .filter((item) => item.hours !== null);
  const byTeam = (Object.keys(TEAM_NAMES) as Role[]).map((team) => {
    const teamTasks = tasks.filter((task) => task.team === team);
    const durations = teamTasks.filter((task) => task.status === "completed" && task.completedAt && task.completedAt <= now)
      .map((task) => elapsedHours(task.createdAt, task.completedAt!)).filter((hours): hours is number => hours !== null);
    return { team, name: TEAM_NAMES[team], tasks: teamTasks.length, overdue: teamTasks.filter((task) => taskOverdue(task, businessDate)).length,
      completed: teamTasks.filter((task) => task.status === "completed").length, durationSamples: durations.length, averageHours: average(durations) };
  });
  const byDepartment = [...new Set(cohort.map((hire) => hire.department))].sort().map((department) => {
    const departmentTasks = cohort.filter((hire) => hire.department === department).flatMap((hire) => hire.tasks).filter((task) => task.required);
    const completed = departmentTasks.filter((task) => task.status === "completed").length;
    return { department, required: departmentTasks.length, completed, rate: departmentTasks.length ? completed / departmentTasks.length : null };
  });
  const bottlenecks = cohort.flatMap((hire) => hire.tasks.filter((task) => taskOverdue(task, businessDate) || taskBlocked(task, hire.tasks))
    .map((task) => ({ hire, task, overdue: taskOverdue(task, businessDate), blocked: taskBlocked(task, hire.tasks) })))
    .sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));
  return { hires: cohort, tasks, required, ready, awaiting, waiting, signoffs, byTeam, byDepartment, bottlenecks,
    atRisk: cohort.filter((hire) => hireAtRisk(hire, businessDate)),
    readinessRate: cohort.length ? ready.length / cohort.length : null,
    requiredCompleted: required.filter((task) => task.status === "completed").length,
    requiredCompletionRate: required.length ? required.filter((task) => task.status === "completed").length / required.length : null,
    overdue: tasks.filter((task) => taskOverdue(task, businessDate)).length,
    averageWaitingHours: average(waiting.map((item) => item.hours).filter((hours): hours is number => hours !== null)),
    averageSignoffHours: average(signoffs.map((item) => item.hours!)) };
}
