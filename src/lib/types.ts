export type Role = "HR" | "IT" | "MANAGER";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type Readiness = "preparing" | "awaiting_review" | "ready";
export type WorkArrangement = "Onsite" | "Hybrid" | "Remote";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TaskView {
  id: string;
  hireId: string;
  templateKey: string;
  title: string;
  instructions: string;
  team: Role;
  assigneeId: string | null;
  assigneeName: string;
  dueDate: string;
  required: boolean;
  status: TaskStatus;
  version: number;
  dependencies: string[];
  blocked: boolean;
  blocker: string | null;
  overdue: boolean;
  note: string | null;
  createdAt: string;
  completedAt: string | null;
  completedByName: string | null;
}

export interface ActivityView {
  id: string;
  type: string;
  actorName: string;
  occurredAt: string;
  description: string;
}

export interface ApprovalView {
  id: string;
  reviewerId: string;
  reviewerName: string;
  approvedAt: string;
  preparationVersion: number;
  invalidatedAt: string | null;
  reason: string | null;
}

export interface ReviewEpisodeView {
  id: string;
  preparationVersion: number;
  enteredAt: string;
  endedAt: string | null;
  outcome: string | null;
}

export interface HireView {
  id: string;
  name: string;
  roleTitle: string;
  department: string;
  startDate: string;
  workArrangement: WorkArrangement;
  managerId: string;
  managerName: string;
  coordinatorId: string;
  coordinatorName: string;
  reviewerId: string;
  reviewerName: string;
  workEmail: string | null;
  lifecycle: "active" | "cancelled";
  cancellationReason: string | null;
  readiness: Readiness;
  atRisk: boolean;
  version: number;
  preparationVersion: number;
  demo: boolean;
  demoScenario: string | null;
  createdAt: string;
  tasks: TaskView[];
  requirements: {
    equipment: string;
    applications: string[];
    deliveryContext: string;
    confirmedAt: string | null;
  } | null;
  approvals: ApprovalView[];
  reviewEpisodes: ReviewEpisodeView[];
  history: ActivityView[];
}

export interface WorkspacePayload {
  actor: UserSummary;
  users: UserSummary[];
  hires: HireView[];
  now: string;
  businessDate: string;
  powerBi: {
    url: string | null;
    mode: "public" | "secure";
    snapshotAt: string | null;
    configurationError: string | null;
  };
}

export interface HireIntake {
  name: string;
  roleTitle: string;
  department: string;
  startDate: string;
  workArrangement: WorkArrangement;
  managerId: string;
  coordinatorId: string;
  reviewerId: string;
  note?: string;
}

export type Command =
  | { action: "createHire"; idempotencyKey: string; intake: HireIntake }
  | { action: "transitionTask"; taskId: string; expectedVersion: number; status: TaskStatus; note?: string; workEmail?: string }
  | { action: "confirmRequirements"; hireId: string; expectedVersion: number; equipment: string; applications: string[]; deliveryContext: string }
  | { action: "reassignTask"; taskId: string; expectedVersion: number; assigneeId: string; reason: string }
  | { action: "approveHire"; hireId: string; expectedVersion: number; expectedPreparationVersion: number }
  | { action: "requestCorrection"; hireId: string; taskId: string; expectedVersion: number; reason: string }
  | { action: "updateHire"; hireId: string; expectedVersion: number; changes: Partial<HireIntake>; reason: string }
  | { action: "previewHireChange"; hireId: string; expectedVersion: number; changes: Partial<HireIntake> }
  | { action: "cancelHire"; hireId: string; expectedVersion: number; reason: string }
  | { action: "noteHire"; hireId: string; note: string };

export interface ChangeImpact {
  taskIds: string[];
  taskTitles: string[];
  invalidatesApproval: boolean;
  changesDeadlines: boolean;
  message: string;
}

export interface CommandResult {
  hireId?: string;
  impact?: ChangeImpact;
  message: string;
}
