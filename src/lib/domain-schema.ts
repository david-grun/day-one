import { boolean, date, integer, jsonb, pgTable, primaryKey, text, timestamp, unique } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import type { Role, TaskStatus, WorkArrangement } from "./types";

const utc = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const teams = pgTable("teams", {
  id: text("id").$type<Role>().primaryKey(),
  name: text("name").notNull(),
});

export const templates = pgTable("templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  version: integer("version").notNull(),
});

export const templateTasks = pgTable("template_tasks", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => templates.id),
  key: text("key").notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  team: text("team").$type<Role>().notNull().references(() => teams.id),
  required: boolean("required").notNull(),
  offsetDays: integer("offset_days").notNull(),
  dependencies: jsonb("dependencies").$type<string[]>().notNull(),
}, (t) => [unique("template_task_key").on(t.templateId, t.key)]);

export type Requirements = {
  equipment: string;
  applications: string[];
  deliveryContext: string;
  confirmedAt: string | null;
};

export const hires = pgTable("hires", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  roleTitle: text("role_title").notNull(),
  department: text("department").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  workArrangement: text("work_arrangement").$type<WorkArrangement>().notNull(),
  managerId: text("manager_id").notNull().references(() => user.id),
  coordinatorId: text("coordinator_id").notNull().references(() => user.id),
  reviewerId: text("reviewer_id").notNull().references(() => user.id),
  templateId: text("template_id").notNull().references(() => templates.id),
  workEmail: text("work_email"),
  lifecycle: text("lifecycle").$type<"active" | "cancelled">().notNull().default("active"),
  cancellationReason: text("cancellation_reason"),
  version: integer("version").notNull().default(1),
  preparationVersion: integer("preparation_version").notNull().default(1),
  requirements: jsonb("requirements").$type<Requirements>(),
  demo: boolean("demo").notNull().default(false),
  demoScenario: text("demo_scenario"),
  createdAt: utc("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  hireId: text("hire_id").notNull().references(() => hires.id, { onDelete: "cascade" }),
  templateTaskId: text("template_task_id").notNull().references(() => templateTasks.id),
  templateKey: text("template_key").notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  team: text("team").$type<Role>().notNull().references(() => teams.id),
  assigneeId: text("assignee_id").references(() => user.id),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  required: boolean("required").notNull(),
  status: text("status").$type<TaskStatus>().notNull().default("pending"),
  version: integer("version").notNull().default(1),
  note: text("note"),
  createdAt: utc("created_at").notNull().defaultNow(),
  completedAt: utc("completed_at"),
  completedById: text("completed_by_id").references(() => user.id),
}, (t) => [unique("hire_task_key").on(t.hireId, t.templateKey)]);

export const taskDependencies = pgTable("task_dependencies", {
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  prerequisiteId: text("prerequisite_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.taskId, t.prerequisiteId] })]);

export const reviewEpisodes = pgTable("review_episodes", {
  id: text("id").primaryKey(),
  hireId: text("hire_id").notNull().references(() => hires.id, { onDelete: "cascade" }),
  preparationVersion: integer("preparation_version").notNull(),
  enteredAt: utc("entered_at").notNull(),
  endedAt: utc("ended_at"),
  outcome: text("outcome").$type<"approved" | "returned" | "superseded" | "cancelled">(),
});

export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  hireId: text("hire_id").notNull().references(() => hires.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id").notNull().references(() => user.id),
  reviewEpisodeId: text("review_episode_id").notNull().references(() => reviewEpisodes.id, { onDelete: "cascade" }),
  preparationVersion: integer("preparation_version").notNull(),
  approvedAt: utc("approved_at").notNull(),
  invalidatedAt: utc("invalidated_at"),
  reason: text("reason"),
});

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  hireId: text("hire_id").notNull().references(() => hires.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  actorId: text("actor_id").notNull().references(() => user.id),
  occurredAt: utc("occurred_at").notNull(),
  description: text("description").notNull(),
});

export const intakeRequests = pgTable("intake_requests", {
  key: text("key").primaryKey(),
  actorId: text("actor_id").notNull().references(() => user.id),
  payloadHash: text("payload_hash").notNull(),
  hireId: text("hire_id").notNull().references(() => hires.id, { onDelete: "cascade" }),
});

export type HireRecord = typeof hires.$inferSelect;
export type TaskRecord = typeof tasks.$inferSelect;
