import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { doctorProfiles, profiles } from "@/db/schema";

export async function getDoctorProfileForUser(userId: string) {
  const db = getDb();
  const [doctor] = await db
    .select({
      id: doctorProfiles.id,
      profileId: profiles.id,
      inviteCode: doctorProfiles.inviteCode,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
    })
    .from(profiles)
    .innerJoin(doctorProfiles, eq(doctorProfiles.profileId, profiles.id))
    .where(eq(profiles.userId, userId))
    .limit(1);

  return doctor ?? null;
}
