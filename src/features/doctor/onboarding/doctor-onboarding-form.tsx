"use client";

import { Copy, Save, Stethoscope } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveDoctorOnboarding,
  type DoctorOnboardingState,
} from "./actions";

const initialDoctorOnboardingState: DoctorOnboardingState = { status: "idle", message: "", errors: {} };

export function DoctorOnboardingForm() {
  const [state, formAction] = useActionState(
    saveDoctorOnboarding,
    initialDoctorOnboardingState,
  );
  const currentState = {
    ...initialDoctorOnboardingState,
    ...state,
    errors: { ...initialDoctorOnboardingState.errors, ...state?.errors },
  };
  const [copied, setCopied] = useState(false);

  async function copyInviteCode() {
    if (!currentState.inviteCode) {
      return;
    }

    await navigator.clipboard.writeText(currentState.inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <form action={formAction} className="space-y-6">
        {currentState.message ? (
          <div
            className={`rounded-lg border p-4 text-sm ${
            currentState.status === "success"
                ? "border-teal-200 bg-teal-50 text-teal-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {currentState.message}
          </div>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Stethoscope className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-normal">
                Doctor details
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                These details help patients identify the correct doctor before
                sharing tremor results.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              autoComplete="given-name"
              error={currentState.errors.firstName}
              label="First name"
              name="firstName"
              required
            />
            <Field
              autoComplete="family-name"
              error={currentState.errors.lastName}
              label="Last name"
              name="lastName"
              required
            />
            <Field
              error={currentState.errors.specialty}
              label="Specialty"
              name="specialty"
              placeholder="Neurology"
            />
            <Field
              autoComplete="organization"
              error={currentState.errors.organization}
              label="Clinic or hospital"
              name="organization"
              placeholder="Hospital / clinic name"
            />
          </div>
        </section>

        {currentState.errors.form ? (
          <p className="text-sm font-medium text-red-600">{currentState.errors.form}</p>
        ) : null}

        <SubmitButton />
      </form>

      <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-normal">Invite code</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Patients enter this code during onboarding to request a care relationship.
          The relationship starts pending so access can be controlled explicitly.
        </p>

        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Current code</p>
          <p className="mt-2 break-all font-mono text-2xl font-semibold tracking-normal text-slate-950">
            {currentState.inviteCode ?? "Generated after saving"}
          </p>
        </div>

        <button
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={!currentState.inviteCode}
          onClick={copyInviteCode}
          type="button"
        >
          <Copy className="size-4" aria-hidden="true" />
          {copied ? "Copied" : "Copy code"}
        </button>
      </aside>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
};

function Field({
  label,
  name,
  type = "text",
  error,
  placeholder,
  autoComplete,
  required,
}: FieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700" htmlFor={name}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      <Save className="size-4" aria-hidden="true" />
      {pending ? "Saving..." : "Save doctor profile"}
    </button>
  );
}
