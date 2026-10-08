CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'MANAGER' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"hire_id" text NOT NULL,
	"task_id" text,
	"type" text NOT NULL,
	"actor_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"hire_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"review_episode_id" text NOT NULL,
	"preparation_version" integer NOT NULL,
	"approved_at" timestamp with time zone NOT NULL,
	"invalidated_at" timestamp with time zone,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "hires" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role_title" text NOT NULL,
	"department" text NOT NULL,
	"start_date" date NOT NULL,
	"work_arrangement" text NOT NULL,
	"manager_id" text NOT NULL,
	"coordinator_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"template_id" text NOT NULL,
	"work_email" text,
	"lifecycle" text DEFAULT 'active' NOT NULL,
	"cancellation_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"preparation_version" integer DEFAULT 1 NOT NULL,
	"requirements" jsonb,
	"demo" boolean DEFAULT false NOT NULL,
	"demo_scenario" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_requests" (
	"key" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"hire_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"hire_id" text NOT NULL,
	"preparation_version" integer NOT NULL,
	"entered_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"outcome" text
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"task_id" text NOT NULL,
	"prerequisite_id" text NOT NULL,
	CONSTRAINT "task_dependencies_task_id_prerequisite_id_pk" PRIMARY KEY("task_id","prerequisite_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"hire_id" text NOT NULL,
	"template_task_id" text NOT NULL,
	"template_key" text NOT NULL,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"team" text NOT NULL,
	"assignee_id" text,
	"due_date" date NOT NULL,
	"required" boolean NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by_id" text,
	CONSTRAINT "hire_task_key" UNIQUE("hire_id","template_key")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"team" text NOT NULL,
	"required" boolean NOT NULL,
	"offset_days" integer NOT NULL,
	"dependencies" jsonb NOT NULL,
	CONSTRAINT "template_task_key" UNIQUE("template_id","key")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_hire_id_hires_id_fk" FOREIGN KEY ("hire_id") REFERENCES "public"."hires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_auth_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_hire_id_hires_id_fk" FOREIGN KEY ("hire_id") REFERENCES "public"."hires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_reviewer_id_auth_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_review_episode_id_review_episodes_id_fk" FOREIGN KEY ("review_episode_id") REFERENCES "public"."review_episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hires" ADD CONSTRAINT "hires_manager_id_auth_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hires" ADD CONSTRAINT "hires_coordinator_id_auth_user_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hires" ADD CONSTRAINT "hires_reviewer_id_auth_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hires" ADD CONSTRAINT "hires_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_requests" ADD CONSTRAINT "intake_requests_actor_id_auth_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_requests" ADD CONSTRAINT "intake_requests_hire_id_hires_id_fk" FOREIGN KEY ("hire_id") REFERENCES "public"."hires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_episodes" ADD CONSTRAINT "review_episodes_hire_id_hires_id_fk" FOREIGN KEY ("hire_id") REFERENCES "public"."hires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_prerequisite_id_tasks_id_fk" FOREIGN KEY ("prerequisite_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_hire_id_hires_id_fk" FOREIGN KEY ("hire_id") REFERENCES "public"."hires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_task_id_template_tasks_id_fk" FOREIGN KEY ("template_task_id") REFERENCES "public"."template_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_team_teams_id_fk" FOREIGN KEY ("team") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_auth_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_id_auth_user_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_tasks" ADD CONSTRAINT "template_tasks_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_tasks" ADD CONSTRAINT "template_tasks_team_teams_id_fk" FOREIGN KEY ("team") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_account_user_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_session_user_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");