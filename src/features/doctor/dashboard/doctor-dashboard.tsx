"use client";

import { format } from "date-fns";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { routes } from "@/lib/routes";
import { DOCTOR_REVIEW_NOTICE } from "@/lib/safety";
import type { DoctorPatientSummary } from "./types";

type DoctorDashboardProps = {
  patients: DoctorPatientSummary[];
  summary: {
    connectedPatients: number;
    openAlerts: number;
    averageImprovementPercent: number;
  };
};

export function DoctorDashboard({ patients, summary }: DoctorDashboardProps) {
  const primaryPatient = patients[0];
  const trendRows =
    primaryPatient?.trend.map((item) => ({
      date: format(new Date(item.date), "MMM d"),
      before: item.beforePower,
      after: item.afterPower,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        {DOCTOR_REVIEW_NOTICE}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Connected patients" value={String(summary.connectedPatients)} />
        <SummaryCard label="Open alerts" value={String(summary.openAlerts)} />
        <SummaryCard
          label="Avg response"
          value={`${summary.averageImprovementPercent.toFixed(1)}%`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <UsersRound className="size-5 text-teal-700" aria-hidden="true" />
              <h2 className="text-lg font-semibold tracking-normal">
                Connected patients
              </h2>
            </div>
          </div>
          <PatientTable patients={patients} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal">
            Flagged trend preview
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {primaryPatient
              ? `${primaryPatient.name} - before vs after medication`
              : "No connected patients"}
          </p>
          <div className="mt-4">
            <ResponsiveContainer height={260} width="100%">
              <LineChart data={trendRows} margin={{ left: 0, right: 12, top: 12 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  dataKey="before"
                  name="Before"
                  stroke="#0f766e"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="after"
                  name="After"
                  stroke="#334155"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

export function PatientTable({ patients }: { patients: DoctorPatientSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-5 py-3 font-medium">Patient</th>
            <th className="px-5 py-3 font-medium">Medication</th>
            <th className="px-5 py-3 font-medium">Latest result</th>
            <th className="px-5 py-3 font-medium">Improvement</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {patients.map((patient) => (
            <tr key={patient.id}>
              <td className="px-5 py-3">
                <p className="font-semibold text-slate-950">{patient.name}</p>
                <p className="mt-1 text-slate-500">{patient.age} years</p>
              </td>
              <td className="px-5 py-3 text-slate-700">{patient.medicationName}</td>
              <td className="px-5 py-3">
                <p className="font-semibold text-slate-950">
                  Severity {patient.latestSeverityClass}
                </p>
                <p className="mt-1 text-slate-500">
                  Power {patient.latestTremorPower.toFixed(1)}
                </p>
              </td>
              <td className="px-5 py-3 font-semibold text-slate-950">
                {patient.latestImprovementPercent.toFixed(1)}%
              </td>
              <td className="px-5 py-3">
                <StatusBadge status={patient.status} />
              </td>
              <td className="px-5 py-3">
                <Link
                  className="inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-700"
                  href={routes.doctor.patientDetail(patient.id)}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ status }: { status: DoctorPatientSummary["status"] }) {
  if (status === "review_suggested") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
        <AlertTriangle className="size-3" aria-hidden="true" />
        Review
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
      <CheckCircle2 className="size-3" aria-hidden="true" />
      Stable
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <ClipboardCheck className="size-5 text-teal-700" aria-hidden="true" />
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
    </div>
  );
}
