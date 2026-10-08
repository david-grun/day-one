import type { Role, WorkArrangement } from "./types";

export interface TemplateTask {
  key: string;
  title: string;
  instructions: string;
  team: Role;
  required: boolean;
  offsetDays: number;
  dependencies: string[];
}

export interface PreparationTemplate {
  id: string;
  name: string;
  version: number;
  tasks: TemplateTask[];
}

const baseline: TemplateTask[] = [
  { key: "requirements", title: "Confirm equipment and application needs", team: "MANAGER", required: true, offsetDays: -7, dependencies: [], instructions: "Record the equipment, application list, and collection or delivery arrangement. IT works from this confirmation." },
  { key: "arrival", title: "Confirm joining instructions", team: "HR", required: true, offsetDays: -2, dependencies: [], instructions: "Confirm the start date, joining location or meeting link, and contact person in the external joining message. Record a brief confirmation; do not store personal contact details." },
  { key: "administration", title: "Confirm hire details and administrative preparation", team: "HR", required: true, offsetDays: -2, dependencies: [], instructions: "Check the recorded name, role, manager, start date, and arrangement. Confirm the fictional company's external administrative process is complete. No underlying documents belong here." },
  { key: "access", title: "Prepare work account and required access", team: "IT", required: true, offsetDays: -2, dependencies: ["requirements"], instructions: "Confirm the work email and that every manager-approved application is ready. Add a short confirmation naming the prepared access. Never enter passwords or access tokens." },
  { key: "equipment", title: "Prepare equipment and confirm handoff", team: "IT", required: true, offsetDays: -1, dependencies: ["requirements"], instructions: "Verify the confirmed equipment is ready and record the agreed collection or delivery arrangement. Onsite readiness does not require an employee to collect equipment before starting." },
  { key: "schedule", title: "Confirm first-day schedule and contact", team: "MANAGER", required: true, offsetDays: -1, dependencies: [], instructions: "Prepare a first-day schedule and identify the team's arrival contact. Scheduling orientation is preparation; attendance is outside this release." },
  { key: "workspace", title: "Arrange workspace or remote delivery", team: "HR", required: true, offsetDays: -1, dependencies: ["requirements"], instructions: "Confirm the workspace or delivery arrangement matches the manager's requirements. Record where the hire will join and who coordinates arrival." },
  { key: "buddy", title: "Assign a welcome buddy", team: "MANAGER", required: false, offsetDays: -1, dependencies: [], instructions: "Optionally identify a team contact for informal first-day support. This task does not delay readiness approval." },
];

function variant(id: string, name: string, requirements: string, access: string): PreparationTemplate {
  return { id, name, version: 1, tasks: baseline.map((t) => ({ ...t, dependencies: [...t.dependencies], instructions: t.instructions + (t.key === "requirements" ? ` ${requirements}` : t.key === "access" ? ` ${access}` : "") })) };
}

export const preparationTemplates: PreparationTemplate[] = [
  variant("engineer-v1", "Software Engineer", "Confirm development laptop, repository access, and approved development tools.", "For this fictional role, confirm approved repository and development-tool access."),
  variant("sales-v1", "Sales Associate", "Confirm sales equipment, CRM access, and approved customer communication tools.", "For this fictional role, confirm approved CRM and communication-tool access."),
  variant("general-v1", "General", "Confirm the tools required for this role; do not guess from the job title.", "Prepare only the applications explicitly confirmed by the manager."),
];

export function selectTemplate(roleTitle: string): PreparationTemplate {
  const role = roleTitle.trim().toLowerCase();
  return preparationTemplates.find((t) => t.name.toLowerCase() === role) ?? preparationTemplates[2];
}

export function taskInstructions(task: TemplateTask, arrangement: WorkArrangement): string {
  return `${task.instructions} Work arrangement: ${arrangement}. ${arrangement === "Remote" ? "Use remote joining and delivery arrangements." : arrangement === "Hybrid" ? "Confirm both the first-day location and remote access." : "Confirm onsite arrival and equipment collection."}`;
}

export function validateTemplate(template: PreparationTemplate): void {
  const map = new Map(template.tasks.map((t) => [t.key, t]));
  if (map.size !== template.tasks.length || !template.tasks.some((t) => t.required)) throw new Error("Template requires unique tasks and at least one required task.");
  function visit(key: string, path: Set<string>) {
    const task = map.get(key);
    if (!task) throw new Error(`Unknown prerequisite: ${key}`);
    if (path.has(key)) throw new Error("Template dependency cycle.");
    for (const dependency of task.dependencies) {
      if (task.required && !map.get(dependency)?.required) throw new Error("Required work cannot depend on optional work.");
      visit(dependency, new Set([...path, key]));
    }
  }
  template.tasks.forEach((t) => visit(t.key, new Set()));
}

preparationTemplates.forEach(validateTemplate);
