import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getDoctorProfileForUser } from "@/features/doctor/data";
import { DoctorPatientDetail } from "@/features/doctor/dashboard/doctor-patient-detail";
import { getDoctorPatients } from "@/features/doctor/dashboard/data";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

type DoctorPatientDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DoctorPatientDetailPage({
  params,
}: DoctorPatientDetailPageProps) {
  const user = await requireRole("doctor");
  const doctor = await getDoctorProfileForUser(user.id);
  if (!doctor) notFound();
  const { id } = await params;
  const patient = (await getDoctorPatients(doctor.id)).find((item) => item.id === id) ?? null;

  if (!patient) {
    notFound();
  }

  return (
    <DashboardShell
      description="Review tremor history, medication response, alerts, and quality notes for one connected patient."
      navItems={[
        { href: routes.doctor.root, label: "Dashboard" },
        { href: routes.doctor.patients, label: "Patients" },
      ]}
      title="Patient detail"
    >
      <DoctorPatientDetail patient={patient} />
    </DashboardShell>
  );
}
