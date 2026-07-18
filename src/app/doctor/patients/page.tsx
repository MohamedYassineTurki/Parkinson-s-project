import { DashboardShell } from "@/components/dashboard-shell";
import { getDoctorProfileForUser } from "@/features/doctor/data";
import { getDoctorPatients } from "@/features/doctor/dashboard/data";
import { PatientTable } from "@/features/doctor/dashboard/doctor-dashboard";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { redirect } from "next/navigation";

export default async function DoctorPatientsPage() {
  const user = await requireRole("doctor");
  const doctor = await getDoctorProfileForUser(user.id);
  if (!doctor) redirect(routes.doctor.onboarding);
  const patients = await getDoctorPatients(doctor.id);

  return (
    <DashboardShell
      description="Only patients with an active care relationship should be visible here."
      navItems={[
        { href: routes.doctor.root, label: "Dashboard" },
        { href: routes.doctor.onboarding, label: "Onboarding" },
      ]}
      title="Connected patients"
    >
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <PatientTable patients={patients} />
      </section>
    </DashboardShell>
  );
}
