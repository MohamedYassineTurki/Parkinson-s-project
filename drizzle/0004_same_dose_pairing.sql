ALTER TABLE "tremor_test_sessions" ADD COLUMN "dose_slot" integer;
--> statement-breakpoint
CREATE INDEX "tremor_sessions_dose_slot_idx" ON "tremor_test_sessions" USING btree ("dose_slot");
