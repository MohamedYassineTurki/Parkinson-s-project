import { getDb } from "@/db/client";
import { medicationSchedules, medications } from "@/db/schema";
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
  const medicationRows = await getDb().select({ id: medications.id, name: medications.name, dose: medications.dose, scheduledLocalTime: medicationSchedules.scheduledLocalTime }).from(medications).leftJoin(medicationSchedules, eq(medicationSchedules.medicationId, medications.id)).where(and(eq(medications.patientProfileId, patient.id), eq(medications.isActive, true)));
  const medicationOptions = medicationRows.reduce<Array<{ id: string; name: string; dose: string; scheduleTimes: string[] }>>((options, row) => {
    const current = options.find((item) => item.id === row.id);
    if (current) {
      if (row.scheduledLocalTime) current.scheduleTimes.push(row.scheduledLocalTime.slice(0, 5));
    } else {
      options.push({ id: row.id, name: row.name, dose: row.dose, scheduleTimes: row.scheduledLocalTime ? [row.scheduledLocalTime.slice(0, 5)] : [] });
    }
    return options;
  }, []);

  return <TremorTestWorkflow medications={medicationOptions} />;
}
