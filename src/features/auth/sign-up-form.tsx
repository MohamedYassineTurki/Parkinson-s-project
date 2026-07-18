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
    <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <RoleButton active={role === "patient"} icon={UserRound} label="Patient" onClick={() => setRole("patient")} />
        <RoleButton active={role === "doctor"} icon={Stethoscope} label="Doctor" onClick={() => setRole("doctor")} />
      </div>
      <Field autoComplete="name" label="Full name" minLength={2} name="name" type="text" />
      <Field autoComplete="email" label="Email" name="email" type="email" />
      <Field autoComplete="new-password" label="Password" minLength={8} name="password" type="password" />
      <Field autoComplete="new-password" label="Confirm password" minLength={8} name="confirmPassword" type="password" />
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <button className="min-h-12 w-full rounded-full bg-[#004349] px-4 text-sm font-bold text-white hover:bg-[#0d5c63] disabled:bg-[#9aa7a8]" disabled={pending || !hydrated} type="submit">
        {!hydrated ? "Loading secure form..." : pending ? "Creating account..." : `Create ${role} account`}
      </button>
    </form>
  );
}

function subscribeToHydration() {
  return () => undefined;
}

function RoleButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof UserRound; label: string; onClick: () => void }) {
  return <button aria-pressed={active} className={`min-h-24 rounded-2xl border p-4 text-left transition ${active ? "border-[#004349] bg-[#eef5f7] ring-2 ring-[#bbeacf]" : "border-[#bfc8c9] bg-white hover:border-[#004349]"}`} onClick={onClick} type="button"><Icon className="size-5 text-[#004349]" aria-hidden="true" /><span className="mt-2 block text-sm font-bold">{label}</span></button>;
}

function Field({ autoComplete, label, minLength, name, type }: { autoComplete: string; label: string; minLength?: number; name: string; type: string }) {
  return <div><label className="text-sm font-semibold text-[#3f484a]" htmlFor={name}>{label}</label><input autoComplete={autoComplete} className="mt-2 min-h-12 w-full rounded-xl border border-[#bfc8c9] bg-white px-4 text-base outline-none focus:border-[#004349] focus:ring-2 focus:ring-[#bbeacf]" id={name} minLength={minLength} name={name} required type={type} /></div>;
}
