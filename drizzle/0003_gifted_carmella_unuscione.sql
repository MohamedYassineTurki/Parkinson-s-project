CREATE TYPE "public"."ml_model_status" AS ENUM('active', 'inactive', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ml_prediction_status" AS ENUM('success', 'unavailable', 'failed');--> statement-breakpoint
CREATE TYPE "public"."personal_comparison_status" AS ENUM('building_baseline', 'within_usual', 'above_usual', 'below_usual', 'not_comparable');--> statement-breakpoint
CREATE TABLE "ml_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" text NOT NULL,
	"model_type" text NOT NULL,
	"preprocessing_version" text NOT NULL,
	"provenance" text NOT NULL,
	"clinically_validated" boolean DEFAULT false NOT NULL,
	"status" "ml_model_status" DEFAULT 'active' NOT NULL,
	"metrics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ml_models_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "patient_session_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"baseline_id" uuid,
	"status" "personal_comparison_status" NOT NULL,
	"deviation_percent" double precision,
	"robust_z_score" double precision,
	"baseline_session_count" integer NOT NULL,
	"explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_session_comparisons_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "patient_tremor_baselines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_profile_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"context" "test_context" NOT NULL,
	"algorithm_version" text NOT NULL,
	"median_tremor_power" double precision,
	"median_absolute_deviation" double precision,
	"session_count" integer DEFAULT 0 NOT NULL,
	"status" "personal_comparison_status" DEFAULT 'building_baseline' NOT NULL,
	"first_session_at" timestamp with time zone,
	"last_session_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tremor_ml_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"model_id" uuid,
	"status" "ml_prediction_status" NOT NULL,
	"severity_class" integer,
	"severity_label" "tremor_severity_label",
	"probabilities" jsonb,
	"confidence" double precision,
	"window_count" integer,
	"inference_duration_ms" double precision,
	"request_id" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tremor_ml_predictions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "patient_session_comparisons" ADD CONSTRAINT "patient_session_comparisons_session_id_tremor_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tremor_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_session_comparisons" ADD CONSTRAINT "patient_session_comparisons_baseline_id_patient_tremor_baselines_id_fk" FOREIGN KEY ("baseline_id") REFERENCES "public"."patient_tremor_baselines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_tremor_baselines" ADD CONSTRAINT "patient_tremor_baselines_patient_profile_id_patient_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_tremor_baselines" ADD CONSTRAINT "patient_tremor_baselines_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tremor_ml_predictions" ADD CONSTRAINT "tremor_ml_predictions_session_id_tremor_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tremor_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tremor_ml_predictions" ADD CONSTRAINT "tremor_ml_predictions_model_id_ml_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ml_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ml_models_status_idx" ON "ml_models" USING btree ("status");--> statement-breakpoint
CREATE INDEX "patient_session_comparisons_baseline_idx" ON "patient_session_comparisons" USING btree ("baseline_id");--> statement-breakpoint
CREATE INDEX "patient_session_comparisons_status_idx" ON "patient_session_comparisons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "patient_tremor_baselines_patient_idx" ON "patient_tremor_baselines" USING btree ("patient_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_tremor_baselines_scope_unique" ON "patient_tremor_baselines" USING btree ("patient_profile_id","medication_id","context","algorithm_version");--> statement-breakpoint
CREATE INDEX "tremor_ml_predictions_model_idx" ON "tremor_ml_predictions" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "tremor_ml_predictions_status_idx" ON "tremor_ml_predictions" USING btree ("status");