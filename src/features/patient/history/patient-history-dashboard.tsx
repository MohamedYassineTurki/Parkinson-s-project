"use client";

import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
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

import type {
  HistoricalTestPair,
  HistoricalTestSession,
  TrendSummary,
} from "./types";

type PatientHistoryDashboardProps = {
  sessions: HistoricalTestSession[];
  pairs: HistoricalTestPair[];
  summary: TrendSummary;
};

export function PatientHistoryDashboard({
  sessions,
  pairs,
  summary,
}: PatientHistoryDashboardProps) {
  const trendRows = pairs.map((pair) => ({
    date: format(new Date(pair.testedAt), "MMM d"),
    before: Number(pair.beforePower.toFixed(1)),
    after: Number(pair.afterPower.toFixed(1)),
    improvement: Number(pair.improvementPercent.toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Latest severity"
          value={summary.latestSeverityClass == null ? "No data" : String(summary.latestSeverityClass)}
        />
        <SummaryCard
          label="Latest tremor power"
          value={formatMetric(summary.latestTremorPower)}
        />
        <SummaryCard
          label="7-day avg power"
          value={formatMetric(summary.last7DayAveragePower)}
        />
        <SummaryCard
          label="Personal range"
          value={formatPersonalStatus(summary.latestPersonalComparison?.status)}
        />
        <SummaryCard
          label="Avg medication response"
          value={
            summary.averageImprovementPercent == null
              ? "No data"
              : `${summary.averageImprovementPercent.toFixed(1)}%`
          }
        />
      </div>

      {summary.alertCandidate ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Review suggested
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                Recent after-medication tremor results are higher than the earlier
                baseline across 3 valid pairs. Consider sharing this with your doctor.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
          <div className="flex gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-teal-700" aria-hidden="true" />
            <p className="text-sm leading-6 text-teal-900">
              No trend alert is currently triggered. Alerts require repeated valid
              comparable pairs, not a single recording.
            </p>
          </div>
        </div>
      )}

      {summary.latestPersonalComparison ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Latest personal comparison</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {summary.latestPersonalComparison.message}
            {summary.latestPersonalComparison.deviationPercent != null
              ? ` (${formatSignedPercent(summary.latestPersonalComparison.deviationPercent)} from the median of ${summary.latestPersonalComparison.baselineSessionCount} earlier valid tests.)`
              : ""}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Tremor power over time">
          <ResponsiveContainer height={280} width="100%">
            <LineChart data={trendRows} margin={{ left: 0, right: 12, top: 12 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                dataKey="before"
                name="Before medication"
                stroke="#0f766e"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="after"
                name="After medication"
                stroke="#334155"
                strokeWidth={2}
                type="monotone"
              />
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
              <Bar
                dataKey="improvement"
                fill="#0f766e"
                name="Improvement %"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <TrendingUp className="size-5 text-teal-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold tracking-normal">All test sessions</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Context</th>
                <th className="px-5 py-3 font-medium">Medication</th>
                <th className="px-5 py-3 font-medium">Power</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Processing</th>
                <th className="px-5 py-3 font-medium">Personal range</th>
                <th className="px-5 py-3 font-medium">Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-5 py-3 text-slate-700">
                    {format(new Date(session.testedAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {session.context === "before_medication" ? "Before" : "After"}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{session.medicationName}</td>
                  <td className="px-5 py-3 font-semibold text-slate-950">
                    {session.tremorPower.toFixed(1)}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {session.severityClass} - {session.severityLabel}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{session.algorithmVersion}</td>
                  <td className="px-5 py-3 text-slate-700">
                    {session.personalComparison
                      ? formatPersonalStatus(session.personalComparison.status)
                      : "Not available"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                      {session.qualityStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
    </div>
  );
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

function formatMetric(value: number | null) {
  return value == null ? "No data" : value.toFixed(1);
}

function formatPersonalStatus(
  status: "building_baseline" | "within_usual" | "above_usual" | "below_usual" | undefined,
) {
  switch (status) {
    case "within_usual": return "Within usual range";
    case "above_usual": return "Above usual range";
    case "below_usual": return "Below usual range";
    case "building_baseline": return "Building baseline";
    default: return "No baseline";
  }
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
