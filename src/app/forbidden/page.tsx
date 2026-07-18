import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { routes } from "@/lib/routes";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <ShieldAlert className="size-7 text-red-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold tracking-normal">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your account role does not have permission to open this workspace.
        </p>
        <Link
          className="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          href={routes.home}
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
