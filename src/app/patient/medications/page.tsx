import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getDb } from "@/db/client";
import { medicationSchedules, medications } from "@/db/schema";
import { getPatientProfileForUser } from "@/features/patient/data";
import { MedicationManager } from "@/features/patient/medications/medication-manager";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function PatientMedicationsPage() {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) redirect(routes.patient.onboarding);
  const db = getDb();
  const rows = await db.select().from(medications).where(eq(medications.patientProfileId, patient.id)).orderBy(medications.createdAt);
  const schedules = await db.select().from(medicationSchedules).orderBy(asc(medicationSchedules.sortOrder));
  const views = rows.map((row) => ({ ...row, scheduleTimes: schedules.filter((schedule) => schedule.medicationId === row.id).map((schedule) => schedule.scheduledLocalTime.slice(0, 5)) }));

  return <DashboardShell description="Add, update, archive, or restore medications and their daily schedules." navItems={[{ href: routes.patient.root, label: "Dashboard" }, { href: routes.patient.test, label: "Run test" }, { href: routes.patient.history, label: "History" }]} title="Medications"><MedicationManager medications={views} /></DashboardShell>;
}
