import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { patientProfiles, profiles } from "@/db/schema";

export async function getPatientProfileForUser(userId: string) {
  const db = getDb();
  const [patient] = await db
    .select({
      id: patientProfiles.id,
      profileId: profiles.id,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      dateOfBirth: patientProfiles.dateOfBirth,
      phoneNumber: patientProfiles.phoneNumber,
    })
    .from(profiles)
    .innerJoin(patientProfiles, eq(patientProfiles.profileId, profiles.id))
    .where(eq(profiles.userId, userId))
    .limit(1);

  return patient ?? null;
}
