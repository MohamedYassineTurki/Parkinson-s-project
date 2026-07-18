import { DashboardShell } from "@/components/dashboard-shell";
import { redirect } from "next/navigation";

import { getPatientProfileForUser } from "@/features/patient/data";
import { getPatientHistory } from "@/features/patient/history/data";
import { PatientHistoryDashboard } from "@/features/patient/history/patient-history-dashboard";
import { calculateTrendSummary } from "@/features/patient/history/trends";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function PatientHistoryPage() {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) redirect(routes.patient.onboarding);
  const { sessions, pairs } = await getPatientHistory(patient.id);
  const summary = calculateTrendSummary(sessions, pairs);

  return (
    <DashboardShell
      description="Review tremor severity, signal quality, and medication response over time."
      navItems={[
        { href: routes.patient.root, label: "Dashboard" },
        { href: routes.patient.onboarding, label: "Onboarding" },
        { href: routes.patient.medications, label: "Medications" },
        { href: routes.patient.privacy, label: "Privacy" },
        { href: routes.patient.test, label: "Run test" },
      ]}
      title="Patient history"
    >
      <PatientHistoryDashboard
        pairs={pairs}
        sessions={sessions}
        summary={summary}
      />
    </DashboardShell>
  );
}
