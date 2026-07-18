import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/auth/roles";
import { routes } from "@/lib/routes";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(routes.auth.signIn);
  }

  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireUser();

  if (user.role !== role) {
    redirect(routes.forbidden);
  }

  return user;
}
