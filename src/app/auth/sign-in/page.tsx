import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "@/features/auth/sign-in-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getDefaultRouteForRole, routes } from "@/lib/routes";

export default async function SignInPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultRouteForRole(user.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-teal-700">Parkinson Project</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Access your protected patient or doctor workspace.
        </p>
        <SignInForm />
        <p className="mt-5 text-center text-sm text-slate-600">
          New here?{" "}
          <Link className="font-semibold text-teal-700 hover:text-teal-800" href={routes.auth.signUp}>
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
