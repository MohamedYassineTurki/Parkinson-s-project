import { DashboardShell } from "@/components/dashboard-shell";
import { DoctorOnboardingForm } from "@/features/doctor/onboarding/doctor-onboarding-form";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function DoctorOnboardingPage() {
  await requireRole("doctor");

  return (
    <DashboardShell
      description="Create a doctor profile and generate the invite code patients use to request access."
      navItems={[
        { href: routes.doctor.root, label: "Dashboard" },
        { href: routes.doctor.patients, label: "Patients" },
      ]}
      title="Doctor onboarding"
    >
      <DoctorOnboardingForm />
    </DashboardShell>
  );
}
