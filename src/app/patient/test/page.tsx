import { DashboardShell } from "@/components/dashboard-shell";
import { getDb } from "@/db/client";
import { medications } from "@/db/schema";
import { getPatientProfileForUser } from "@/features/patient/data";
import { TremorTestWorkflow } from "@/features/tremor-test/tremor-test-workflow";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function PatientTestPage() {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) redirect(routes.patient.onboarding);
  const medicationOptions = await getDb().select({ id: medications.id, name: medications.name, dose: medications.dose }).from(medications).where(and(eq(medications.patientProfileId, patient.id), eq(medications.isActive, true)));

  return (
    <DashboardShell
      description="Run a before or after medication test using the phone accelerometer."
      navItems={[
        { href: routes.patient.root, label: "Dashboard" },
        { href: routes.patient.onboarding, label: "Onboarding" },
        { href: routes.patient.medications, label: "Medications" },
        { href: routes.patient.privacy, label: "Privacy" },
        { href: routes.patient.history, label: "History" },
      ]}
      title="Run tremor test"
    >
      <TremorTestWorkflow medications={medicationOptions} />
    </DashboardShell>
  );
}
