"use client";

import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, MessageSquareText } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DoctorPatientSummary } from "./types";
import { DOCTOR_REVIEW_NOTICE } from "@/lib/safety";

export function DoctorPatientDetail({ patient }: { patient: DoctorPatientSummary }) {
  const trendRows = patient.trend.map((item) => ({
    date: format(new Date(item.date), "MMM d"),
    before: item.beforePower,
    after: item.afterPower,
    improvement: item.improvementPercent,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        {DOCTOR_REVIEW_NOTICE}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">{patient.name}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {patient.age} years - latest test {format(new Date(patient.latestTestAt), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-700">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Mark reviewed
            </button>
            <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-700">
              <MessageSquareText className="size-4" aria-hidden="true" />
              Add note
            </button>
          </div>
        </div>

        {patient.alertMessage ? (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
              <p className="text-sm leading-6 text-amber-900">{patient.alertMessage}</p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal">Medication schedule</h2>
          <p className="mt-2 text-sm font-medium text-slate-700">
            {patient.medicationName}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {patient.medicationSchedule.map((time) => (
              <span
                className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
                key={time}
              >
                {time}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal">Recent result</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Severity" value={String(patient.latestSeverityClass)} />
            <Metric label="Tremor power" value={patient.latestTremorPower.toFixed(1)} />
            <Metric
              label="Improvement"
              value={`${patient.latestImprovementPercent.toFixed(1)}%`}
            />
            <Metric
              label="Personal range"
              value={formatPersonalRange(patient.latestPersonalRange, patient.latestPersonalDeviationPercent)}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Tremor trend">
          <ResponsiveContainer height={280} width="100%">
            <LineChart data={trendRows} margin={{ left: 0, right: 12, top: 12 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line dataKey="before" name="Before" stroke="#0f766e" strokeWidth={2} type="monotone" />
              <Line dataKey="after" name="After" stroke="#334155" strokeWidth={2} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Medication response">
          <ResponsiveContainer height={280} width="100%">
            <BarChart data={trendRows} margin={{ left: 0, right: 12, top: 12 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="improvement" fill="#0f766e" name="Improvement %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
    </div>
  );
}

function formatPersonalRange(
  status: DoctorPatientSummary["latestPersonalRange"],
  deviation: number | null,
) {
  const label = {
    building_baseline: "Building baseline",
    within_usual: "Within usual range",
    above_usual: "Above usual range",
    below_usual: "Below usual range",
    no_baseline: "No baseline",
  }[status];
  return deviation == null ? label : `${label} (${deviation >= 0 ? "+" : ""}${deviation.toFixed(1)}%)`;
}

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
