import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["patient", "doctor"]);
export const careRelationshipStatus = pgEnum("care_relationship_status", [
  "pending",
  "active",
  "revoked",
]);
export const testContext = pgEnum("test_context", [
  "before_medication",
  "after_medication",
  "unpaired",
]);
export const testQualityStatus = pgEnum("test_quality_status", [
  "pending",
  "valid",
  "invalid",
]);
export const tremorSeverityLabel = pgEnum("tremor_severity_label", [
  "none",
  "low",
  "medium",
  "high",
]);
export const alertType = pgEnum("alert_type", [
  "worsening_response",
  "missed_tests",
  "low_quality_tests",
]);
export const alertStatus = pgEnum("alert_status", [
  "open",
  "reviewed",
  "dismissed",
]);
export const auditActorType = pgEnum("audit_actor_type", [
  "patient",
  "doctor",
  "system",
]);

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: userRole("role").default("patient").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRole("role").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("profiles_role_idx").on(table.role)],
);

export const patientProfiles = pgTable("patient_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  dateOfBirth: date("date_of_birth"),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const doctorProfiles = pgTable(
  "doctor_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: "cascade" }),
    inviteCode: text("invite_code").notNull().unique(),
    specialty: text("specialty"),
    organization: text("organization"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("doctor_profiles_invite_code_idx").on(table.inviteCode)],
);

export const careRelationships = pgTable(
  "care_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientProfileId: uuid("patient_profile_id")
      .notNull()
      .references(() => patientProfiles.id, { onDelete: "cascade" }),
    doctorProfileId: uuid("doctor_profile_id")
      .notNull()
      .references(() => doctorProfiles.id, { onDelete: "cascade" }),
    status: careRelationshipStatus("status").default("pending").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("care_relationship_patient_idx").on(table.patientProfileId),
    index("care_relationship_doctor_idx").on(table.doctorProfileId),
    uniqueIndex("care_relationship_pair_unique").on(
      table.patientProfileId,
      table.doctorProfileId,
    ),
  ],
);

export const medications = pgTable(
  "medications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientProfileId: uuid("patient_profile_id")
      .notNull()
      .references(() => patientProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dose: text("dose").notNull(),
    frequencyPerDay: integer("frequency_per_day").notNull(),
    instructions: text("instructions"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("medications_patient_idx").on(table.patientProfileId)],
);

export const medicationSchedules = pgTable(
  "medication_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    scheduledLocalTime: time("scheduled_local_time").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("medication_schedules_medication_idx").on(table.medicationId)],
);

export const medicationIntakes = pgTable(
  "medication_intakes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientProfileId: uuid("patient_profile_id")
      .notNull()
      .references(() => patientProfiles.id, { onDelete: "cascade" }),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull(),
    dose: text("dose").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("medication_intakes_patient_idx").on(table.patientProfileId),
    index("medication_intakes_medication_idx").on(table.medicationId),
    index("medication_intakes_taken_at_idx").on(table.takenAt),
  ],
);

export const tremorTestSessions = pgTable(
  "tremor_test_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientProfileId: uuid("patient_profile_id")
      .notNull()
      .references(() => patientProfiles.id, { onDelete: "cascade" }),
    medicationId: uuid("medication_id").references(() => medications.id, {
      onDelete: "set null",
    }),
    medicationIntakeId: uuid("medication_intake_id").references(
      () => medicationIntakes.id,
      { onDelete: "set null" },
    ),
    context: testContext("context").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    sampleCount: integer("sample_count"),
    sampleRateHz: doublePrecision("sample_rate_hz"),
    deviceInfo: jsonb("device_info").$type<Record<string, unknown>>(),
    qualityStatus: testQualityStatus("quality_status").default("pending").notNull(),
    qualityNotes: text("quality_notes"),
    rawSamples: jsonb("raw_samples").$type<
      Array<{ t: number; x: number; y: number; z: number }>
    >(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("tremor_sessions_patient_idx").on(table.patientProfileId),
    index("tremor_sessions_medication_idx").on(table.medicationId),
    index("tremor_sessions_started_at_idx").on(table.startedAt),
    index("tremor_sessions_context_idx").on(table.context),
  ],
);

export const tremorResults = pgTable(
  "tremor_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .unique()
      .references(() => tremorTestSessions.id, { onDelete: "cascade" }),
    severityClass: integer("severity_class").notNull(),
    severityLabel: tremorSeverityLabel("severity_label").notNull(),
    rmsIntensity: doublePrecision("rms_intensity").notNull(),
    dominantFrequencyHz: doublePrecision("dominant_frequency_hz"),
    tremorPower: doublePrecision("tremor_power").notNull(),
    confidenceScore: doublePrecision("confidence_score"),
    algorithmVersion: text("algorithm_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("tremor_results_session_idx").on(table.sessionId),
    index("tremor_results_severity_idx").on(table.severityClass),
  ],
);

export const tremorTestPairs = pgTable(
  "tremor_test_pairs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientProfileId: uuid("patient_profile_id")
      .notNull()
      .references(() => patientProfiles.id, { onDelete: "cascade" }),
    medicationId: uuid("medication_id").references(() => medications.id, {
      onDelete: "set null",
    }),
    beforeSessionId: uuid("before_session_id")
      .notNull()
      .references(() => tremorTestSessions.id, { onDelete: "cascade" }),
    afterSessionId: uuid("after_session_id")
      .notNull()
      .references(() => tremorTestSessions.id, { onDelete: "cascade" }),
    improvementPercent: doublePrecision("improvement_percent"),
    responseWindowMinutes: integer("response_window_minutes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("tremor_pairs_patient_idx").on(table.patientProfileId),
    index("tremor_pairs_medication_idx").on(table.medicationId),
    uniqueIndex("tremor_pairs_sessions_unique").on(
      table.beforeSessionId,
      table.afterSessionId,
    ),
  ],
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientProfileId: uuid("patient_profile_id")
      .notNull()
      .references(() => patientProfiles.id, { onDelete: "cascade" }),
    doctorProfileId: uuid("doctor_profile_id").references(() => doctorProfiles.id, {
      onDelete: "set null",
    }),
    type: alertType("type").notNull(),
    status: alertStatus("status").default("open").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    triggeredBySessionId: uuid("triggered_by_session_id").references(
      () => tremorTestSessions.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    index("alerts_patient_idx").on(table.patientProfileId),
    index("alerts_doctor_idx").on(table.doctorProfileId),
    index("alerts_status_idx").on(table.status),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorProfileId: uuid("actor_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    actorType: auditActorType("actor_type").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_actor_idx").on(table.actorProfileId),
    index("audit_logs_target_idx").on(table.targetType, table.targetId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ many, one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  patientProfile: one(patientProfiles, {
    fields: [profiles.id],
    references: [patientProfiles.profileId],
  }),
  doctorProfile: one(doctorProfiles, {
    fields: [profiles.id],
    references: [doctorProfiles.profileId],
  }),
  auditLogs: many(auditLogs),
}));

export const patientProfilesRelations = relations(patientProfiles, ({ many, one }) => ({
  profile: one(profiles, {
    fields: [patientProfiles.profileId],
    references: [profiles.id],
  }),
  careRelationships: many(careRelationships),
  medications: many(medications),
  medicationIntakes: many(medicationIntakes),
  tremorTestSessions: many(tremorTestSessions),
  tremorTestPairs: many(tremorTestPairs),
  alerts: many(alerts),
}));

export const doctorProfilesRelations = relations(doctorProfiles, ({ many, one }) => ({
  profile: one(profiles, {
    fields: [doctorProfiles.profileId],
    references: [profiles.id],
  }),
  careRelationships: many(careRelationships),
  alerts: many(alerts),
}));

export const careRelationshipsRelations = relations(careRelationships, ({ one }) => ({
  patientProfile: one(patientProfiles, {
    fields: [careRelationships.patientProfileId],
    references: [patientProfiles.id],
  }),
  doctorProfile: one(doctorProfiles, {
    fields: [careRelationships.doctorProfileId],
    references: [doctorProfiles.id],
  }),
}));

export const medicationsRelations = relations(medications, ({ many, one }) => ({
  patientProfile: one(patientProfiles, {
    fields: [medications.patientProfileId],
    references: [patientProfiles.id],
  }),
  schedules: many(medicationSchedules),
  intakes: many(medicationIntakes),
  tremorTestSessions: many(tremorTestSessions),
  tremorTestPairs: many(tremorTestPairs),
}));

export const medicationSchedulesRelations = relations(
  medicationSchedules,
  ({ one }) => ({
    medication: one(medications, {
      fields: [medicationSchedules.medicationId],
      references: [medications.id],
    }),
  }),
);

export const medicationIntakesRelations = relations(
  medicationIntakes,
  ({ many, one }) => ({
    patientProfile: one(patientProfiles, {
      fields: [medicationIntakes.patientProfileId],
      references: [patientProfiles.id],
    }),
    medication: one(medications, {
      fields: [medicationIntakes.medicationId],
      references: [medications.id],
    }),
    tremorTestSessions: many(tremorTestSessions),
  }),
);

export const tremorTestSessionsRelations = relations(
  tremorTestSessions,
  ({ many, one }) => ({
    patientProfile: one(patientProfiles, {
      fields: [tremorTestSessions.patientProfileId],
      references: [patientProfiles.id],
    }),
    medication: one(medications, {
      fields: [tremorTestSessions.medicationId],
      references: [medications.id],
    }),
    medicationIntake: one(medicationIntakes, {
      fields: [tremorTestSessions.medicationIntakeId],
      references: [medicationIntakes.id],
    }),
    result: one(tremorResults),
    beforePairs: many(tremorTestPairs, { relationName: "beforeSession" }),
    afterPairs: many(tremorTestPairs, { relationName: "afterSession" }),
    alerts: many(alerts),
  }),
);

export const tremorResultsRelations = relations(tremorResults, ({ one }) => ({
  session: one(tremorTestSessions, {
    fields: [tremorResults.sessionId],
    references: [tremorTestSessions.id],
  }),
}));

export const tremorTestPairsRelations = relations(tremorTestPairs, ({ one }) => ({
  patientProfile: one(patientProfiles, {
    fields: [tremorTestPairs.patientProfileId],
    references: [patientProfiles.id],
  }),
  medication: one(medications, {
    fields: [tremorTestPairs.medicationId],
    references: [medications.id],
  }),
  beforeSession: one(tremorTestSessions, {
    fields: [tremorTestPairs.beforeSessionId],
    references: [tremorTestSessions.id],
    relationName: "beforeSession",
  }),
  afterSession: one(tremorTestSessions, {
    fields: [tremorTestPairs.afterSessionId],
    references: [tremorTestSessions.id],
    relationName: "afterSession",
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  patientProfile: one(patientProfiles, {
    fields: [alerts.patientProfileId],
    references: [patientProfiles.id],
  }),
  doctorProfile: one(doctorProfiles, {
    fields: [alerts.doctorProfileId],
    references: [doctorProfiles.id],
  }),
  triggeredBySession: one(tremorTestSessions, {
    fields: [alerts.triggeredBySessionId],
    references: [tremorTestSessions.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actorProfile: one(profiles, {
    fields: [auditLogs.actorProfileId],
    references: [profiles.id],
  }),
}));
