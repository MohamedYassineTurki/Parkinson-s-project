"use client";

import { Stethoscope, UserRound } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import type { UserRole } from "@/lib/auth/roles";

export function SignUpForm({ initialRole }: { initialRole: UserRole }) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    if (password !== String(formData.get("confirmPassword") ?? "")) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    const result = await authClient.signUp.email({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password,
      role,
    });

    if (result.error) {
      setError(result.error.message || "Account creation failed.");
      setPending(false);
      return;
    }

    router.push(role === "patient" ? "/patient/onboarding" : "/doctor/onboarding");
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <RoleButton active={role === "patient"} icon={UserRound} label="Patient" onClick={() => setRole("patient")} />
        <RoleButton active={role === "doctor"} icon={Stethoscope} label="Doctor" onClick={() => setRole("doctor")} />
      </div>
      <Field autoComplete="name" label="Full name" minLength={2} name="name" type="text" />
      <Field autoComplete="email" label="Email" name="email" type="email" />
      <Field autoComplete="new-password" label="Password" minLength={8} name="password" type="password" />
      <Field autoComplete="new-password" label="Confirm password" minLength={8} name="confirmPassword" type="password" />
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <button className="w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400" disabled={pending || !hydrated} type="submit">
        {!hydrated ? "Loading secure form..." : pending ? "Creating account..." : `Create ${role} account`}
      </button>
    </form>
  );
}

function subscribeToHydration() {
  return () => undefined;
}

function RoleButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof UserRound; label: string; onClick: () => void }) {
  return <button aria-pressed={active} className={`rounded-lg border p-4 text-left ${active ? "border-teal-700 bg-teal-50" : "border-slate-200 bg-slate-50"}`} onClick={onClick} type="button"><Icon className="size-5 text-teal-700" aria-hidden="true" /><span className="mt-2 block text-sm font-semibold">{label}</span></button>;
}

function Field({ autoComplete, label, minLength, name, type }: { autoComplete: string; label: string; minLength?: number; name: string; type: string }) {
  return <div><label className="text-sm font-medium text-slate-700" htmlFor={name}>{label}</label><input autoComplete={autoComplete} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id={name} minLength={minLength} name={name} required type={type} /></div>;
}
