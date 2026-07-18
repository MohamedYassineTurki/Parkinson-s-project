import { DashboardShell } from "@/components/dashboard-shell";
import { PatientOnboardingForm } from "@/features/patient/onboarding/patient-onboarding-form";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function PatientOnboardingPage() {
  await requireRole("patient");

  return (
    <DashboardShell
      description="Collect patient profile, medication schedule, and optional doctor connection."
      navItems={[
        { href: routes.patient.root, label: "Dashboard" },
        { href: routes.patient.privacy, label: "Privacy" },
        { href: routes.patient.test, label: "Run test" },
        { href: routes.patient.history, label: "History" },
      ]}
      title="Patient onboarding"
    >
      <PatientOnboardingForm />
    </DashboardShell>
  );
}
