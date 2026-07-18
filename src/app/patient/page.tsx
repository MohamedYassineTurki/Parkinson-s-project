import { Activity, BarChart3, Clock3, Pill, Play, Smartphone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { DashboardShell } from "@/components/dashboard-shell";
import { getDb } from "@/db/client";
import { medications } from "@/db/schema";
import { getPatientProfileForUser } from "@/features/patient/data";
import { getPatientHistory } from "@/features/patient/history/data";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function trendPoints(values: number[]) {
  if (values.length === 0) return "0,28 200,28";
  if (values.length === 1) return "0,28 200,28";
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 0.001);
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * 200;
    const y = 42 - ((value - minimum) / range) * 28;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export default async function PatientDashboardPage() {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) redirect(routes.patient.onboarding);

  const [history, activeMedicationRows] = await Promise.all([
    getPatientHistory(patient.id),
    getDb()
      .select({ name: medications.name, dose: medications.dose })
      .from(medications)
      .where(and(eq(medications.patientProfileId, patient.id), eq(medications.isActive, true)))
      .limit(1),
  ]);
  const activeMedication = activeMedicationRows[0];
  const latest = history.sessions[0];
  const chartValues = history.sessions
    .filter((session) => session.qualityStatus === "valid")
    .slice(0, 7)
    .reverse()
    .map((session) => session.tremorPower);
  const latestRange = latest?.personalComparison?.message
    ?? (latest ? `${latest.severityLabel} movement pattern` : "No result recorded yet");

  return (
    <DashboardShell
      description="Track standardized accelerometer tremor tests around medication timing."
      hideIntro
      navItems={[
        { href: routes.patient.root, label: "Dashboard" },
        { href: routes.patient.medications, label: "Medications" },
        { href: routes.patient.test, label: "Run test" },
        { href: routes.patient.history, label: "History" },
        { href: routes.patient.onboarding, label: "Profile" },
      ]}
      title="Patient dashboard"
    >
      <div className="space-y-6 sm:space-y-8">
        <section className="relative overflow-hidden rounded-3xl bg-[#eef5f7] p-6 sm:p-8">
          <svg className="pointer-events-none absolute -right-12 top-10 h-36 w-72 text-[#004349] opacity-10" fill="none" viewBox="0 0 300 120" aria-hidden="true">
            <path d="M0 60C50 10 100 110 150 60C200 10 250 110 300 60" stroke="currentColor" strokeLinecap="round" strokeWidth="20" />
          </svg>
          <div className="relative">
            <h1 className="max-w-xl text-[32px] font-bold leading-10 tracking-[-0.03em] text-[#161d1f] sm:text-4xl">
              {greetingForHour(new Date().getHours())}, {patient.firstName}.
            </h1>
            <p className="mt-4 flex items-center gap-3 text-base leading-7 text-[#3f484a] sm:text-lg">
              <Clock3 className="size-5 shrink-0 text-[#704b23]" aria-hidden="true" />
              Your next 10-second check is ready when you are.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <section className="relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#dde4e6] bg-white p-6 text-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] md:col-span-8">
            <div className="flex size-24 items-center justify-center rounded-full bg-[#0d5c63]/15 text-[#004349]">
              <Smartphone className="size-11" aria-hidden="true" />
              <Activity className="-ml-2 size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold leading-8 text-[#161d1f]">Start Tremor Test</h2>
            <p className="mt-3 max-w-sm text-base leading-7 text-[#3f484a]">Hold your phone steady for 10 seconds to record your personal movement pattern.</p>
            <Link className="mt-6 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#004349] px-8 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]" href={routes.patient.test}>
              <Play className="size-5" aria-hidden="true" /> Start Test Now
            </Link>
          </section>

          <div className="flex flex-col gap-4 md:col-span-4">
            <section className="flex-1 rounded-2xl border border-[#dde4e6] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3"><Pill className="size-5 text-[#3c6751]" aria-hidden="true" /><h2 className="text-xl font-semibold">Medication</h2></div>
                <span className="rounded-lg bg-[#bbeacf] px-3 py-1 text-xs font-medium text-[#244f3a]">{activeMedication ? "Active" : "Not set"}</span>
              </div>
              <p className="mt-5 text-base text-[#3f484a]">{activeMedication ? `${activeMedication.name} · ${activeMedication.dose}` : "Add your medication and daily doses."}</p>
              <Link className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#6f797a] text-sm font-semibold text-[#161d1f] transition hover:bg-[#eef5f7]" href={routes.patient.medications}>Manage medication</Link>
            </section>

            <section className="flex-1 rounded-2xl border border-[#dde4e6] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3"><BarChart3 className="size-5 text-[#004349]" aria-hidden="true" /><h2 className="text-xl font-semibold">Latest Result</h2></div>
              <div className="mt-4 rounded-xl bg-[#eef5f7] p-4"><p className="text-sm font-semibold text-[#161d1f]">{latestRange}</p><p className="mt-1 text-xs text-[#6f797a]">{latest ? new Date(latest.testedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }) : "Complete your first test"}</p></div>
              <svg className="mt-4 h-16 w-full" preserveAspectRatio="none" viewBox="0 0 200 56" aria-label="Recent personal tremor trend">
                <polyline fill="none" points={trendPoints(chartValues)} stroke="#0d5c63" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                <circle cx="200" cy={chartValues.length > 1 ? trendPoints(chartValues).split(" ").at(-1)?.split(",")[1] : "28"} fill="#0d5c63" r="4" />
              </svg>
              <div className="flex justify-between text-[10px] text-[#6f797a]"><span>Earlier</span><span>Now</span></div>
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
