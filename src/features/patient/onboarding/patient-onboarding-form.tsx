"use client";

import { ArrowRight, Info, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  savePatientOnboarding,
  type PatientOnboardingState,
} from "./actions";
import { DOCTOR_SHARING_CONSENT_TEXT } from "@/lib/safety";
import { routes } from "@/lib/routes";

const defaultScheduleTimes = ["08:00", "14:00", "20:00"];
const initialPatientOnboardingState: PatientOnboardingState = { status: "idle", message: "", errors: {} };

export function PatientOnboardingForm() {
  const [state, formAction] = useActionState(
    savePatientOnboarding,
    initialPatientOnboardingState,
  );
  const currentState = {
    ...initialPatientOnboardingState,
    ...state,
    errors: { ...initialPatientOnboardingState.errors, ...state?.errors },
  };
  const [scheduleTimes, setScheduleTimes] = useState(defaultScheduleTimes);

  const frequency = useMemo(() => String(scheduleTimes.length), [scheduleTimes]);

  function addScheduleTime() {
    setScheduleTimes((current) => [...current, ""]);
  }

  function removeScheduleTime(index: number) {
    setScheduleTimes((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateScheduleTime(index: number, value: string) {
    setScheduleTimes((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-[#8fd1d9] bg-[#eef5f7] p-4 text-[#004349]" role="status">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-bold">Complete your setup to unlock your workspace</p>
          <p className="mt-1 text-sm leading-6 text-[#3f484a]">
            Your dashboard, medication tools, history, and tremor tests will become
            available after you save the required patient and medication information.
          </p>
        </div>
      </div>
      {currentState.message ? (
        <div
          className={`rounded-lg border p-4 text-sm ${
            currentState.status === "success"
              ? "border-teal-200 bg-teal-50 text-teal-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{currentState.message}</span>
            {currentState.status === "success" ? (
              <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#004349] px-4 text-sm font-bold text-white" href={routes.patient.root}>
                Open dashboard <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-normal">Patient details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            error={currentState.errors.dateOfBirth}
            label="Date of birth"
            name="dateOfBirth"
            type="date"
          />
          <Field
            autoComplete="tel"
            error={currentState.errors.phoneNumber}
            label="Phone number"
            name="phoneNumber"
            placeholder="+216 ..."
            type="tel"
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-normal">Medication</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter the treatment that will be used for before and after tremor tests.
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {frequency} per day
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            error={currentState.errors.medicationName}
            label="Medication name"
            name="medicationName"
            placeholder="Levodopa"
            required
          />
          <Field
            error={currentState.errors.dose}
            label="Dose"
            name="dose"
            placeholder="100mg"
            required
          />
        </div>

        <input name="frequencyPerDay" type="hidden" value={frequency} />

        <div className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Daily schedule
              </label>
              <p className="mt-1 text-sm text-slate-500">
                Add each usual medication time. These times help pair tests later.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-700"
              onClick={addScheduleTime}
              type="button"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add time
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {scheduleTimes.map((value, index) => (
              <div className="flex gap-2" key={`${index}-${scheduleTimes.length}`}>
                <input
                  aria-label={`Medication time ${index + 1}`}
                  className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                  name="scheduleTimes"
                  onChange={(event) => updateScheduleTime(index, event.target.value)}
                  required
                  type="time"
                  value={value}
                />
                {scheduleTimes.length > 1 ? (
                  <button
                    aria-label={`Remove medication time ${index + 1}`}
                    className="flex size-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                    onClick={() => removeScheduleTime(index)}
                    type="button"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {currentState.errors.scheduleTimes ? (
            <p className="mt-2 text-sm text-red-600">{currentState.errors.scheduleTimes}</p>
          ) : null}
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700" htmlFor="instructions">
            Instructions
          </label>
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="instructions"
            name="instructions"
            placeholder="Optional notes about timing, food, or routine."
          />
          {currentState.errors.instructions ? (
            <p className="mt-2 text-sm text-red-600">{currentState.errors.instructions}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-normal">Doctor connection</h2>
        <p className="mt-1 text-sm text-slate-600">
          Optional. If your doctor gave you an invite code, enter it to request data
          sharing.
        </p>
        <div className="mt-4">
          <Field
            error={currentState.errors.doctorInviteCode}
            label="Doctor invite code"
            name="doctorInviteCode"
            placeholder="DR-1234"
          />
        </div>
        <label className="mt-4 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <input
            className="mt-1 size-4 rounded border-slate-300 text-teal-700"
            name="doctorSharingConsent"
            type="checkbox"
          />
          <span>{DOCTOR_SHARING_CONSENT_TEXT}</span>
        </label>
        {currentState.errors.doctorSharingConsent ? (
          <p className="mt-2 text-sm text-red-600">
            {currentState.errors.doctorSharingConsent}
          </p>
        ) : null}
      </section>

      {currentState.errors.form ? (
        <p className="text-sm font-medium text-red-600">{currentState.errors.form}</p>
      ) : null}

      <SubmitButton />
    </form>
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
      {pending ? "Saving..." : "Save onboarding"}
    </button>
  );
}
