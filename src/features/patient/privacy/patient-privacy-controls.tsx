"use client";

import { ShieldCheck, Trash2, UserRoundCheck } from "lucide-react";
import { useActionState } from "react";

import { APP_SAFETY_NOTICE, DOCTOR_SHARING_CONSENT_TEXT } from "@/lib/safety";
import { requestDoctorAccess, revokeDoctorAccess, type SharingState } from "./actions";

const initialSharingState: SharingState = { status: "idle", message: "" };

export type DoctorSharingView = { id: string; name: string; specialty: string | null; organization: string | null; status: "pending" | "active" | "revoked" };

export function PatientPrivacyControls({ relationships }: { relationships: DoctorSharingView[] }) {
  const [state, action, pending] = useActionState(requestDoctorAccess, initialSharingState);
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-teal-200 bg-teal-50 p-5"><div className="flex gap-3"><ShieldCheck className="size-6 shrink-0 text-teal-700" aria-hidden="true" /><div><h2 className="text-lg font-semibold text-teal-950">Safety boundary</h2><p className="mt-2 text-sm leading-6 text-teal-900">{APP_SAFETY_NOTICE}</p></div></div></section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Connect a doctor</h2><p className="mt-2 text-sm leading-6 text-slate-600">Enter the invite code shown in the doctor’s onboarding page. The doctor must accept before data becomes visible.</p>
        <form action={action} className="mt-4 space-y-3"><label className="block text-sm font-medium" htmlFor="inviteCode">Doctor invite code</label><input className="min-h-11 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 uppercase" id="inviteCode" name="inviteCode" placeholder="DR-XXXXXXXX" required /><label className="flex max-w-2xl gap-3 text-sm leading-6 text-slate-600"><input className="mt-1" name="consent" type="checkbox" required />{DOCTOR_SHARING_CONSENT_TEXT}</label>{state.message ? <p className={state.status === "error" ? "text-sm text-red-700" : "text-sm text-teal-700"} role="status">{state.message}</p> : null}<button className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending} type="submit">{pending ? "Sending..." : "Send connection request"}</button></form>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Doctor data sharing</h2><div className="mt-4 space-y-3">{relationships.length === 0 ? <p className="text-sm text-slate-600">No doctor connections.</p> : relationships.map((doctor) => <article className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={doctor.id}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><UserRoundCheck className="size-5 text-teal-700" aria-hidden="true" /><div><p className="font-semibold">{doctor.name}</p><p className="mt-1 text-sm text-slate-600">{[doctor.specialty, doctor.organization].filter(Boolean).join(" · ") || "Doctor"}</p></div></div><span className="rounded-md bg-white px-2 py-1 text-xs font-semibold capitalize">{doctor.status}</span></div>{doctor.status !== "revoked" ? <button className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" onClick={() => revokeDoctorAccess(doctor.id)} type="button"><Trash2 className="size-4" aria-hidden="true" />Revoke access</button> : null}</article>)}</div></section>
    </div>
  );
}
