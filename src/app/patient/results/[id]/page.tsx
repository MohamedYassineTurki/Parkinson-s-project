import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getDb } from "@/db/client";
import { medications, tremorResults, tremorTestSessions } from "@/db/schema";
import { getPatientProfileForUser } from "@/features/patient/data";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function PatientResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("patient");
  const patient = await getPatientProfileForUser(user.id);
  if (!patient) redirect(routes.patient.onboarding);
  const { id } = await params;
  const [result] = await getDb()
    .select({ sessionId: tremorTestSessions.id, context: tremorTestSessions.context, startedAt: tremorTestSessions.startedAt, qualityStatus: tremorTestSessions.qualityStatus, qualityNotes: tremorTestSessions.qualityNotes, sampleCount: tremorTestSessions.sampleCount, sampleRateHz: tremorTestSessions.sampleRateHz, medicationName: medications.name, medicationDose: medications.dose, severityClass: tremorResults.severityClass, severityLabel: tremorResults.severityLabel, tremorPower: tremorResults.tremorPower, rmsIntensity: tremorResults.rmsIntensity, dominantFrequencyHz: tremorResults.dominantFrequencyHz, confidenceScore: tremorResults.confidenceScore, algorithmVersion: tremorResults.algorithmVersion })
    .from(tremorTestSessions)
    .innerJoin(tremorResults, eq(tremorResults.sessionId, tremorTestSessions.id))
    .leftJoin(medications, eq(medications.id, tremorTestSessions.medicationId))
    .where(and(eq(tremorTestSessions.id, id), eq(tremorTestSessions.patientProfileId, patient.id)))
    .limit(1);
  if (!result) notFound();

  return (
    <DashboardShell description="Review the saved accelerometer metrics from one standardized test." navItems={[{ href: routes.patient.test, label: "Run another test" }, { href: routes.patient.history, label: "History" }, { href: routes.patient.root, label: "Dashboard" }]} title="Test result">
      <div className="space-y-5">
        <section className="rounded-lg border border-teal-200 bg-teal-50 p-5"><p className="text-sm font-semibold text-teal-800">Saved successfully</p><h2 className="mt-2 text-2xl font-semibold text-teal-950">Severity {result.severityClass} · {result.severityLabel}</h2><p className="mt-2 text-sm leading-6 text-teal-900">This result monitors movement patterns and is not a diagnosis or medication recommendation.</p></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Medication" value={`${result.medicationName ?? "Not specified"} ${result.medicationDose ?? ""}`.trim()} /><Metric label="Context" value={result.context === "before_medication" ? "Before medication" : "After medication"} /><Metric label="Tremor power" value={result.tremorPower.toFixed(2)} /><Metric label="Dominant frequency" value={result.dominantFrequencyHz == null ? "Not detected" : `${result.dominantFrequencyHz.toFixed(2)} Hz`} /><Metric label="RMS intensity" value={result.rmsIntensity.toFixed(2)} /><Metric label="Signal confidence" value={`${Math.round((result.confidenceScore ?? 0) * 100)}%`} /><Metric label="Samples" value={String(result.sampleCount ?? 0)} /><Metric label="Sample rate" value={`${(result.sampleRateHz ?? 0).toFixed(1)} Hz`} /></dl>{result.qualityNotes ? <p className="mt-5 whitespace-pre-line rounded-md bg-slate-50 p-4 text-sm text-slate-600">{result.qualityNotes}</p> : null}</section>
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-950">{value}</dd></div>; }
