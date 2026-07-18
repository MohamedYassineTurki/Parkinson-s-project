import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/features/auth/sign-up-form";
import { getCurrentUser } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/roles";
import { getDefaultRouteForRole, routes } from "@/lib/routes";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultRouteForRole(user.role));
  }

  const params = await searchParams;
  const initialRole: UserRole = params.role === "doctor" ? "doctor" : "patient";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10 text-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-teal-700">Parkinson Project</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">Create an account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose the role that matches how you will use the platform.
        </p>
        <SignUpForm initialRole={initialRole} />
        <p className="mt-5 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-semibold text-teal-700 hover:text-teal-800" href={routes.auth.signIn}>
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
