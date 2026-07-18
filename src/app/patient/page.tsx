import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { getPatientProfileForUser } from "@/features/patient/data";
import { getPatientHistory } from "@/features/patient/history/data";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function PatientDashboardPage() {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) redirect(routes.patient.onboarding);
  const history = await getPatientHistory(patient.id);

  return (
    <DashboardShell
      description="Track standardized accelerometer tremor tests around medication timing."
      navItems={[
        { href: routes.patient.onboarding, label: "Onboarding" },
        { href: routes.patient.privacy, label: "Privacy" },
        { href: routes.patient.medications, label: "Medications" },
        { href: routes.patient.test, label: "Run test" },
        { href: routes.patient.history, label: "History" },
      ]}
      title="Patient dashboard"
    >
      {history.sessions.length === 0 ? <EmptyState description="Run your first standardized accelerometer test to begin building a history." icon={ClipboardList} title="No tremor tests recorded yet" /> : <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Recent activity</h2><p className="mt-2 text-sm text-slate-600">{history.sessions.length} saved test session{history.sessions.length === 1 ? "" : "s"} and {history.pairs.length} before/after pair{history.pairs.length === 1 ? "" : "s"}.</p></section>}
    </DashboardShell>
  );
}
