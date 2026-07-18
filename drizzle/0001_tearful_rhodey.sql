CREATE TYPE "public"."alert_status" AS ENUM('open', 'reviewed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('worsening_response', 'missed_tests', 'low_quality_tests');--> statement-breakpoint
CREATE TYPE "public"."audit_actor_type" AS ENUM('patient', 'doctor', 'system');--> statement-breakpoint
CREATE TYPE "public"."care_relationship_status" AS ENUM('pending', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."test_context" AS ENUM('before_medication', 'after_medication', 'unpaired');--> statement-breakpoint
CREATE TYPE "public"."test_quality_status" AS ENUM('pending', 'valid', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."tremor_severity_label" AS ENUM('none', 'low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_profile_id" uuid NOT NULL,
	"doctor_profile_id" uuid,
	"type" "alert_type" NOT NULL,
	"status" "alert_status" DEFAULT 'open' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"triggered_by_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_profile_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_profile_id" uuid NOT NULL,
	"doctor_profile_id" uuid NOT NULL,
	"status" "care_relationship_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"invite_code" text NOT NULL,
	"specialty" text,
	"organization" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_profiles_profile_id_unique" UNIQUE("profile_id"),
	CONSTRAINT "doctor_profiles_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "medication_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_profile_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"dose" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medication_id" uuid NOT NULL,
	"scheduled_local_time" time NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dose" text NOT NULL,
	"frequency_per_day" integer NOT NULL,
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"date_of_birth" date,
	"phone_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_profiles_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tremor_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"severity_class" integer NOT NULL,
	"severity_label" "tremor_severity_label" NOT NULL,
	"rms_intensity" double precision NOT NULL,
	"dominant_frequency_hz" double precision,
	"tremor_power" double precision NOT NULL,
	"confidence_score" double precision,
	"algorithm_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tremor_results_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "tremor_test_pairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_profile_id" uuid NOT NULL,
	"medication_id" uuid,
	"before_session_id" uuid NOT NULL,
	"after_session_id" uuid NOT NULL,
	"improvement_percent" double precision,
	"response_window_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tremor_test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_profile_id" uuid NOT NULL,
	"medication_id" uuid,
	"medication_intake_id" uuid,
	"context" "test_context" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"sample_count" integer,
	"sample_rate_hz" double precision,
	"device_info" jsonb,
	"quality_status" "test_quality_status" DEFAULT 'pending' NOT NULL,
	"quality_notes" text,
	"raw_samples" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_patient_profile_id_patient_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_doctor_profile_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_profile_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_triggered_by_session_id_tremor_test_sessions_id_fk" FOREIGN KEY ("triggered_by_session_id") REFERENCES "public"."tremor_test_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_relationships" ADD CONSTRAINT "care_relationships_patient_profile_id_patient_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_relationships" ADD CONSTRAINT "care_relationships_doctor_profile_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_profile_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_intakes" ADD CONSTRAINT "medication_intakes_patient_profile_id_patient_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_intakes" ADD CONSTRAINT "medication_intakes_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_profile_id_patient_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tremor_results" ADD CONSTRAINT "tremor_results_session_id_tremor_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tremor_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tremor_test_pairs" ADD CONSTRAINT "tremor_test_pairs_patient_profile_id_patient_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tremor_test_pairs" ADD CONSTRAINT "tremor_test_pairs_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tremor_test_pairs" ADD CONSTRAINT "tremor_test_pairs_before_session_id_tremor_test_sessions_id_fk" FOREIGN KEY ("before_session_id") REFERENCES "public"."tremor_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tremor_test_pairs" ADD CONSTRAINT "tremor_test_pairs_after_session_id_tremor_test_sessions_id_fk" FOREIGN KEY ("after_session_id") REFERENCES "public"."tremor_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tremor_test_sessions" ADD CONSTRAINT "tremor_test_sessions_patient_profile_id_patient_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tremor_test_sessions" ADD CONSTRAINT "tremor_test_sessions_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tremor_test_sessions" ADD CONSTRAINT "tremor_test_sessions_medication_intake_id_medication_intakes_id_fk" FOREIGN KEY ("medication_intake_id") REFERENCES "public"."medication_intakes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "alerts_patient_idx" ON "alerts" USING btree ("patient_profile_id");--> statement-breakpoint
CREATE INDEX "alerts_doctor_idx" ON "alerts" USING btree ("doctor_profile_id");--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_profile_id");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "care_relationship_patient_idx" ON "care_relationships" USING btree ("patient_profile_id");--> statement-breakpoint
CREATE INDEX "care_relationship_doctor_idx" ON "care_relationships" USING btree ("doctor_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "care_relationship_pair_unique" ON "care_relationships" USING btree ("patient_profile_id","doctor_profile_id");--> statement-breakpoint
CREATE INDEX "doctor_profiles_invite_code_idx" ON "doctor_profiles" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "medication_intakes_patient_idx" ON "medication_intakes" USING btree ("patient_profile_id");--> statement-breakpoint
CREATE INDEX "medication_intakes_medication_idx" ON "medication_intakes" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "medication_intakes_taken_at_idx" ON "medication_intakes" USING btree ("taken_at");--> statement-breakpoint
CREATE INDEX "medication_schedules_medication_idx" ON "medication_schedules" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "medications_patient_idx" ON "medications" USING btree ("patient_profile_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tremor_results_session_idx" ON "tremor_results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "tremor_results_severity_idx" ON "tremor_results" USING btree ("severity_class");--> statement-breakpoint
CREATE INDEX "tremor_pairs_patient_idx" ON "tremor_test_pairs" USING btree ("patient_profile_id");--> statement-breakpoint
CREATE INDEX "tremor_pairs_medication_idx" ON "tremor_test_pairs" USING btree ("medication_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tremor_pairs_sessions_unique" ON "tremor_test_pairs" USING btree ("before_session_id","after_session_id");--> statement-breakpoint
CREATE INDEX "tremor_sessions_patient_idx" ON "tremor_test_sessions" USING btree ("patient_profile_id");--> statement-breakpoint
CREATE INDEX "tremor_sessions_medication_idx" ON "tremor_test_sessions" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "tremor_sessions_started_at_idx" ON "tremor_test_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "tremor_sessions_context_idx" ON "tremor_test_sessions" USING btree ("context");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");