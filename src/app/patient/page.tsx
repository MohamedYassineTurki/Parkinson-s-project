import { Activity, ArrowRight, BarChart3, CheckCircle2, ClipboardList, Pill, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { getPatientProfileForUser } from "@/features/patient/data";
import { getPatientHistory } from "@/features/patient/history/data";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function PatientDashboardPage() {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) redirect(routes.patient.onboarding);
  const history = await getPatientHistory(patient.id);

  return (
    <DashboardShell
      description="Track standardized accelerometer tremor tests around medication timing."
      navItems={[
        { href: routes.patient.root, label: "Dashboard" },
        { href: routes.patient.medications, label: "Medications" },
        { href: routes.patient.test, label: "Run test" },
        { href: routes.patient.history, label: "History" },
        { href: routes.patient.onboarding, label: "Profile" },
      ]}
      title="Patient dashboard"
    >
      {history.sessions.length === 0 ? <EmptyState description="Run your first standardized accelerometer test to begin building a history." icon={ClipboardList} title="No tremor tests recorded yet" /> : (
        <div className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <Link className="group rounded-2xl bg-[#004349] p-6 text-white shadow-[0_10px_30px_rgba(0,67,73,0.14)] transition hover:bg-[#0d5c63]" href={routes.patient.test}>
              <div className="flex items-start justify-between"><span className="flex size-12 items-center justify-center rounded-full bg-white/15"><Activity className="size-6" aria-hidden="true" /></span><ArrowRight className="size-5 transition group-hover:translate-x-1" aria-hidden="true" /></div>
              <h2 className="mt-6 text-2xl font-bold tracking-tight">Start a tremor test</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#d7eff0]">Hold your phone steady for 10 seconds to add a new personal measurement.</p>
              <span className="mt-5 inline-flex min-h-12 items-center rounded-full bg-white px-5 text-sm font-bold text-[#004349]">Run test now</span>
            </Link>
            <div className="rounded-2xl bg-white p-6 shadow-[0_4px_18px_rgba(0,67,73,0.06)] ring-1 ring-[#dce7e9]">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Pill className="size-5 text-[#704b23]" aria-hidden="true" /><h2 className="font-bold">Your tracking</h2></div><span className="rounded-full bg-[#bbeacf] px-3 py-1 text-xs font-bold text-[#244f3a]">Active</span></div>
              <div className="mt-6 grid grid-cols-2 gap-4"><div><p className="text-xs text-[#6f797a]">Saved tests</p><p className="mt-1 text-3xl font-bold text-[#004349]">{history.sessions.length}</p></div><div><p className="text-xs text-[#6f797a]">Before / after pairs</p><p className="mt-1 text-3xl font-bold text-[#004349]">{history.pairs.length}</p></div></div>
              <Link className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#6f797a] text-sm font-bold text-[#004349] hover:bg-[#eef5f7]" href={routes.patient.history}>View history <BarChart3 className="size-4" aria-hidden="true" /></Link>
            </div>
          </section>
          <section className="rounded-2xl bg-white p-6 shadow-[0_4px_18px_rgba(0,67,73,0.06)] ring-1 ring-[#dce7e9]"><div className="flex items-center gap-2"><Sparkles className="size-5 text-[#3c6751]" aria-hidden="true" /><h2 className="font-bold">Latest insight</h2></div><div className="mt-4 flex items-start gap-3 rounded-xl bg-[#eef5f7] p-4"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#3c6751]" aria-hidden="true" /><div><p className="font-bold text-[#244f3a]">Keep building your personal baseline</p><p className="mt-1 text-sm leading-6 text-[#3f484a]">Your results become more useful when you test in a similar position and around the same medication context.</p></div></div></section>
        </div>
      )}
    </DashboardShell>
  );
}
