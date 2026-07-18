"use client";

import { useActionState, useState } from "react";

import { saveMedication, setMedicationActive, type MedicationActionState } from "./actions";

const initialMedicationActionState: MedicationActionState = { status: "idle", message: "" };

export type MedicationView = { id: string; name: string; dose: string; frequencyPerDay: number; instructions: string | null; isActive: boolean; scheduleTimes: string[] };

export function MedicationManager({ medications }: { medications: MedicationView[] }) {
  const [state, action, pending] = useActionState(saveMedication, initialMedicationActionState);
  const [editing, setEditing] = useState<MedicationView | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{editing ? "Edit medication" : "Add medication"}</h2>
        <form action={action} className="mt-5 space-y-4" key={editing?.id ?? "new"}>
          {editing ? <input name="id" type="hidden" value={editing.id} /> : null}
          <Input defaultValue={editing?.name} label="Medication name" name="name" placeholder="Levodopa" />
          <Input defaultValue={editing?.dose} label="Dose" name="dose" placeholder="100 mg" />
          <Input defaultValue={editing?.frequencyPerDay} label="Times per day" min="1" name="frequencyPerDay" type="number" />
          <Input defaultValue={editing?.scheduleTimes.join(", ")} label="Schedule times (comma-separated)" name="scheduleTimes" placeholder="08:00, 14:00, 20:00" />
          <Input defaultValue={editing?.instructions ?? ""} label="Instructions" name="instructions" placeholder="Optional" required={false} />
          {state.message ? <p className={`text-sm ${state.status === "error" ? "text-red-700" : "text-teal-700"}`} role="status">{state.message}</p> : null}
          <div className="flex gap-2"><button className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending} type="submit">{pending ? "Saving..." : "Save medication"}</button>{editing ? <button className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold" onClick={() => setEditing(null)} type="button">Cancel</button> : null}</div>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your medications</h2>
        {medications.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">No medications added yet.</p> : medications.map((medication) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={medication.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-semibold">{medication.name} · {medication.dose}</h3><p className="mt-1 text-sm text-slate-600">{medication.frequencyPerDay}× daily at {medication.scheduleTimes.join(", ")}</p>{medication.instructions ? <p className="mt-1 text-sm text-slate-500">{medication.instructions}</p> : null}</div><span className={`rounded-md px-2 py-1 text-xs font-semibold ${medication.isActive ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>{medication.isActive ? "Active" : "Archived"}</span></div>
            <div className="mt-4 flex gap-2"><button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={() => setEditing(medication)} type="button">Edit</button><button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={() => setMedicationActive(medication.id, !medication.isActive)} type="button">{medication.isActive ? "Archive" : "Restore"}</button></div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Input({ defaultValue, label, name, placeholder, required = true, ...props }: { defaultValue?: string | number; label: string; name: string; placeholder?: string; required?: boolean; type?: string; min?: string }) {
  return <div><label className="text-sm font-medium text-slate-700" htmlFor={name}>{label}</label><input className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" defaultValue={defaultValue} id={name} name={name} placeholder={placeholder} required={required} {...props} /></div>;
}
