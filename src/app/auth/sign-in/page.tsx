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
    <main className="flex min-h-screen items-center justify-center bg-[#f4fafd] px-5 py-8 text-[#161d1f] sm:px-6 sm:py-10">
      <section className="w-full max-w-md rounded-3xl border border-[#dce7e9] bg-white p-6 shadow-[0_12px_40px_rgba(0,67,73,0.08)] sm:p-8">
        <div className="mb-7 flex items-center gap-2.5"><span className="flex size-10 items-center justify-center rounded-full bg-[#004349] text-white">⌁</span><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3f686b]">Parkinson Project</p><p className="font-bold text-[#004349]">SteadyPath</p></div></div>
        <h1 className="text-[28px] font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Access your protected patient or doctor workspace.
        </p>
        <SignInForm />
        <p className="mt-5 text-center text-sm text-slate-600">
          New here?{" "}
          <Link className="font-bold text-[#004349] hover:text-[#0d5c63]" href={routes.auth.signUp}>
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
