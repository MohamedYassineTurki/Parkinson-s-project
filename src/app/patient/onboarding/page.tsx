import { and, asc, eq } from "drizzle-orm";

import { DashboardShell } from "@/components/dashboard-shell";
import { getDb } from "@/db/client";
import { careRelationships, doctorProfiles, medicationSchedules, medications, profiles } from "@/db/schema";
import { getPatientProfileForUser } from "@/features/patient/data";
import { PatientOnboardingForm } from "@/features/patient/onboarding/patient-onboarding-form";
import { PatientPrivacyControls } from "@/features/patient/privacy/patient-privacy-controls";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

const patientNavigation = [
  { href: routes.patient.root, label: "Dashboard" },
  { href: routes.patient.medications, label: "Medications" },
  { href: routes.patient.test, label: "Run test" },
  { href: routes.patient.history, label: "History" },
  { href: routes.patient.onboarding, label: "Profile" },
];

export default async function PatientOnboardingPage() {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);

  if (!patient) {
    return (
      <DashboardShell
        description="Add the information needed to personalize medication-timed tremor tests."
        navItems={[{ href: routes.patient.onboarding, label: "Onboarding" }]}
        title="Complete your setup"
      >
        <PatientOnboardingForm mode="onboarding" />
      </DashboardShell>
    );
  }

  const db = getDb();
  const medicationRows = await db
    .select({
      id: medications.id,
      name: medications.name,
      dose: medications.dose,
      instructions: medications.instructions,
      scheduledLocalTime: medicationSchedules.scheduledLocalTime,
    })
    .from(medications)
    .leftJoin(medicationSchedules, eq(medicationSchedules.medicationId, medications.id))
    .where(and(eq(medications.patientProfileId, patient.id), eq(medications.isActive, true)))
    .orderBy(asc(medicationSchedules.sortOrder));
  const activeMedication = medicationRows[0];

  const relationshipRows = await db
    .select({
      id: careRelationships.id,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      specialty: doctorProfiles.specialty,
      organization: doctorProfiles.organization,
      status: careRelationships.status,
    })
    .from(careRelationships)
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, careRelationships.doctorProfileId))
    .innerJoin(profiles, eq(profiles.id, doctorProfiles.profileId))
    .where(eq(careRelationships.patientProfileId, patient.id));

  return (
    <DashboardShell
      description="Review and update your saved personal details, medication schedule, and doctor access."
      navItems={patientNavigation}
      title="Edit profile"
    >
      <div className="space-y-8">
        <PatientOnboardingForm
          initialData={{
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth ?? "",
            phoneNumber: patient.phoneNumber ?? "",
            medicationId: activeMedication?.id ?? "",
            medicationName: activeMedication?.name ?? "",
            dose: activeMedication?.dose ?? "",
            instructions: activeMedication?.instructions ?? "",
            scheduleTimes: medicationRows
              .filter((row) => row.id === activeMedication?.id && row.scheduledLocalTime)
              .map((row) => row.scheduledLocalTime!.slice(0, 5)),
          }}
          mode="profile"
        />
        <PatientPrivacyControls
          relationships={relationshipRows.map((row) => ({
            id: row.id,
            name: `${row.firstName} ${row.lastName}`,
            specialty: row.specialty,
            organization: row.organization,
            status: row.status,
          }))}
        />
      </div>
    </DashboardShell>
  );
}
