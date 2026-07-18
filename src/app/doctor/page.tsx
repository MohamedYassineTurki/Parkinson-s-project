import { DashboardShell } from "@/components/dashboard-shell";
import { getDb } from "@/db/client";
import { careRelationships, patientProfiles, profiles } from "@/db/schema";
import { getDoctorProfileForUser } from "@/features/doctor/data";
import { DoctorDashboard } from "@/features/doctor/dashboard/doctor-dashboard";
import { getDoctorDashboardSummary, getDoctorPatients } from "@/features/doctor/dashboard/data";
import { PendingRequests } from "@/features/doctor/dashboard/pending-requests";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function DoctorDashboardPage() {
  const user = await requireRole("doctor");
  const doctor = await getDoctorProfileForUser(user.id);
  if (!doctor) redirect(routes.doctor.onboarding);
  const patients = await getDoctorPatients(doctor.id);
  const summary = getDoctorDashboardSummary(patients);
  const requests = await getDb().select({ id: careRelationships.id, firstName: profiles.firstName, lastName: profiles.lastName }).from(careRelationships).innerJoin(patientProfiles, eq(patientProfiles.id, careRelationships.patientProfileId)).innerJoin(profiles, eq(profiles.id, patientProfiles.profileId)).where(and(eq(careRelationships.doctorProfileId, doctor.id), eq(careRelationships.status, "pending")));

  return (
    <DashboardShell
      description="Review connected patients, longitudinal tremor trends, and medication-response alerts."
      navItems={[
        { href: routes.doctor.onboarding, label: "Onboarding" },
        { href: routes.doctor.patients, label: "Patients" },
      ]}
      title="Doctor dashboard"
    >
      <div className="mb-6 rounded-lg border border-teal-200 bg-teal-50 p-4"><p className="text-sm text-teal-800">Your patient invite code</p><p className="mt-1 text-xl font-semibold tracking-wider text-teal-950">{doctor.inviteCode}</p></div>
      <PendingRequests requests={requests.map((request) => ({ id: request.id, patientName: `${request.firstName} ${request.lastName}` }))} />
      <div className="mt-6"><DoctorDashboard patients={patients} summary={summary} /></div>
    </DashboardShell>
  );
}
