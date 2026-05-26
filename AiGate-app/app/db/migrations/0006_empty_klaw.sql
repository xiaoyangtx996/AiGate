CREATE TYPE "public"."alert_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('quota_warning', 'key_expiring', 'error_spike', 'rate_limit', 'system');--> statement-breakpoint
CREATE TYPE "public"."api_key_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."channel_health" AS ENUM('healthy', 'degraded', 'down');--> statement-breakpoint
CREATE TYPE "public"."channel_status" AS ENUM('enabled', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."org_level" AS ENUM('group', 'company', 'department', 'team');--> statement-breakpoint
CREATE TABLE "agent" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"organization_id" text,
	"builtin" boolean DEFAULT false,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"system_prompt" text,
	"model" text DEFAULT 'gpt-4o',
	"temperature" integer DEFAULT 30,
	"max_tokens" integer DEFAULT 4096,
	"tools" jsonb DEFAULT '[]'::jsonb,
	"knowledge_bases" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_model" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"type" text DEFAULT 'chat' NOT NULL,
	"context_window" integer DEFAULT 4096,
	"input_price" integer DEFAULT 0,
	"output_price" integer DEFAULT 0,
	"features" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'available' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "alert_type" NOT NULL,
	"severity" "alert_severity" DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"organization_id" text,
	"user_id" text,
	"resource_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"scopes" jsonb DEFAULT '["read","write"]'::jsonb,
	"env" text DEFAULT 'PROD',
	"expires_at" timestamp,
	"last_used" timestamp,
	"status" "api_key_status" DEFAULT 'active' NOT NULL,
	"calls" integer DEFAULT 0,
	"cost" integer DEFAULT 0,
	"daily_limit" integer,
	"ip_whitelist" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_key_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "api_log" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"api_key_id" text,
	"organization_id" text,
	"model" text NOT NULL,
	"provider" text,
	"type" text DEFAULT 'chat',
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"total_tokens" integer DEFAULT 0,
	"cached_tokens" integer DEFAULT 0,
	"cost" integer DEFAULT 0,
	"latency" integer DEFAULT 0,
	"status_code" integer DEFAULT 200,
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"prompt" text,
	"response" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_record" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text,
	"period" text NOT NULL,
	"token_usage" integer DEFAULT 0,
	"cost" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"vendor" text NOT NULL,
	"vendor_tag" text NOT NULL,
	"endpoint" text NOT NULL,
	"api_key" text,
	"models" jsonb DEFAULT '[]'::jsonb,
	"priority" integer DEFAULT 1 NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL,
	"qps" integer DEFAULT 10 NOT NULL,
	"status" "channel_status" DEFAULT 'enabled' NOT NULL,
	"health" "channel_health" DEFAULT 'healthy' NOT NULL,
	"rate_limit_qps" integer DEFAULT 10,
	"rate_limit_tpm" integer DEFAULT 50000,
	"rate_limit_rpm" integer DEFAULT 1000,
	"rate_limit_strategy" text DEFAULT 'queue',
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'document' NOT NULL,
	"organization_id" text,
	"status" text DEFAULT 'indexing' NOT NULL,
	"document_count" integer DEFAULT 0,
	"size" integer DEFAULT 0,
	"embedding_model" text DEFAULT 'text-embedding-3-large',
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_tool" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'custom' NOT NULL,
	"organization_id" text,
	"config" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"health_status" text DEFAULT 'healthy',
	"last_health_check" timestamp,
	"usage_count" integer DEFAULT 0,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"level" "org_level" DEFAULT 'company' NOT NULL,
	"token_limit" integer DEFAULT 0 NOT NULL,
	"token_used" integer DEFAULT 0 NOT NULL,
	"reset_date" timestamp,
	"allowed_models" jsonb DEFAULT '[]'::jsonb,
	"rate_limits" integer DEFAULT 100,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"organization_id" text,
	"usage_count" integer DEFAULT 0,
	"created_by" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_log" ADD CONSTRAINT "api_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_log" ADD CONSTRAINT "api_log_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_log" ADD CONSTRAINT "api_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_record" ADD CONSTRAINT "billing_record_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_tool" ADD CONSTRAINT "mcp_tool_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "org_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_org_idx" ON "agent" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "api_key_user_idx" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_org_idx" ON "api_key" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "api_log_user_idx" ON "api_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_log_model_idx" ON "api_log" USING btree ("model");--> statement-breakpoint
CREATE INDEX "api_log_created_idx" ON "api_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kb_org_idx" ON "knowledge_base" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "mcp_tool_org_idx" ON "mcp_tool" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_parent_idx" ON "organization" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "prompt_org_idx" ON "prompt" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "menu" DROP COLUMN "permissions";