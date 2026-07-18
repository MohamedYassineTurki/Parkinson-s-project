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
    <main className="relative min-h-screen overflow-hidden bg-[#f4fafd] px-5 py-6 text-[#161d1f] sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-radial-gradient(ellipse at 0 0, transparent 0 22px, #bbeacf 23px 24px, transparent 25px 44px)" }} />
      <section className="relative mx-auto w-full max-w-4xl">
        <Link className="inline-flex min-h-12 items-center gap-3 text-[#004349]" href="/"><span className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm">≋</span><span className="text-xl font-bold">SteadyPath</span></Link>
        <SignUpForm initialRole={initialRole} />
        <p className="mx-auto mt-6 max-w-lg text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-bold text-[#004349] hover:text-[#0d5c63]" href={routes.auth.signIn}>
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
