import { DashboardShell } from "@/components/dashboard-shell";
import { getDb } from "@/db/client";
import { careRelationships, doctorProfiles, profiles } from "@/db/schema";
import { getPatientProfileForUser } from "@/features/patient/data";
import { PatientPrivacyControls } from "@/features/patient/privacy/patient-privacy-controls";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function PatientPrivacyPage() {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) redirect(routes.patient.onboarding);
  const relationships = await getDb().select({ id: careRelationships.id, firstName: profiles.firstName, lastName: profiles.lastName, specialty: doctorProfiles.specialty, organization: doctorProfiles.organization, status: careRelationships.status }).from(careRelationships).innerJoin(doctorProfiles, eq(doctorProfiles.id, careRelationships.doctorProfileId)).innerJoin(profiles, eq(profiles.id, doctorProfiles.profileId)).where(eq(careRelationships.patientProfileId, patient.id));

  return (
    <DashboardShell
      description="Control doctor access and review the safety boundaries for tremor monitoring."
      navItems={[
        { href: routes.patient.root, label: "Dashboard" },
        { href: routes.patient.medications, label: "Medications" },
        { href: routes.patient.test, label: "Run test" },
        { href: routes.patient.history, label: "History" },
        { href: routes.patient.onboarding, label: "Profile" },
      ]}
      title="Privacy and sharing"
    >
      <PatientPrivacyControls relationships={relationships.map((row) => ({ id: row.id, name: `${row.firstName} ${row.lastName}`, specialty: row.specialty, organization: row.organization, status: row.status }))} />
    </DashboardShell>
  );
}
