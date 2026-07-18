import {
  Activity,
  ClipboardList,
  Pill,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { routes } from "@/lib/routes";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Activity className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Parkinson Project</p>
              <h1 className="text-xl font-semibold tracking-normal">
                Tremor response monitor
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
            <ShieldCheck className="size-4 text-teal-700" aria-hidden="true" />
            Patient-controlled doctor access
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">Patient workflow</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                Standardized smartphone accelerometer test
              </h2>
            </div>
            <Smartphone className="size-8 text-slate-500" aria-hidden="true" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Before medication",
                value: "Not recorded",
                icon: ClipboardList,
              },
              {
                label: "After medication",
                value: "Not recorded",
                icon: Pill,
              },
              {
                label: "Response trend",
                value: "Waiting for data",
                icon: TrendingUp,
              },
            ].map((item) => (
              <div
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                key={item.label}
              >
                <item.icon className="mb-4 size-5 text-teal-700" aria-hidden="true" />
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-1 text-base font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">Test protocol</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <p>Arm extended forward, palm facing upward.</p>
              <p>Phone flat on palm for a 10-second recording.</p>
              <p>Three-axis accelerometer signal captured as x, y, z.</p>
              <p>Result compared with medication timing and prior tests.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
              href={routes.auth.signUp}
            >
              Create account
            </Link>
            <Link
              className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-700"
              href={routes.auth.signIn}
            >
              Sign in
            </Link>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Stethoscope className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Doctor dashboard</p>
              <h2 className="text-lg font-semibold tracking-normal">Clinical review queue</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {[
              ["Connected patients", "0"],
              ["Open alerts", "0"],
              ["Valid test pairs", "0"],
            ].map(([label, value]) => (
              <div
                className="flex items-center justify-between border-b border-slate-100 pb-3"
                key={label}
              >
                <span className="text-sm text-slate-600">{label}</span>
                <span className="text-lg font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
