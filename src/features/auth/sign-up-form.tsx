"use client";

import { ArrowLeft, ArrowRight, HeartPulse, Stethoscope } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import type { UserRole } from "@/lib/auth/roles";

export function SignUpForm({ initialRole }: { initialRole: UserRole }) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [stage, setStage] = useState<"role" | "details">("role");
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

  if (stage === "role") {
    return (
      <div className="mt-8">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-[32px] font-bold leading-10 tracking-[-0.03em] text-[#161d1f]">Welcome to SteadyPath</h1>
          <p className="mt-3 text-base leading-7 text-[#3f484a]">Please select your role to continue setting up your account. This helps us tailor the experience to your needs.</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <RoleCard
            description="Track hand movement, medication timing, and your personal progress."
            icon={HeartPulse}
            label="I am a Patient"
            onClick={() => {
              setRole("patient");
              setStage("details");
            }}
          />
          <RoleCard
            description="Review connected patients and follow their personal movement trends."
            icon={Stethoscope}
            label="I am a Doctor"
            onClick={() => {
              setRole("doctor");
              setStage("details");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-lg rounded-3xl border border-[#dce7e9] bg-white p-6 shadow-[0_12px_40px_rgba(0,67,73,0.08)] sm:p-8">
      <button className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-[#004349]" onClick={() => setStage("role")} type="button"><ArrowLeft className="size-4" aria-hidden="true" />Change role</button>
      <h1 className="mt-3 text-[28px] font-bold tracking-tight">Create your {role} account</h1>
      <p className="mt-2 text-sm leading-6 text-[#3f484a]">Enter your secure account details to continue.</p>
      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <Field autoComplete="name" label="Full name" minLength={2} name="name" type="text" />
        <Field autoComplete="email" label="Email" name="email" type="email" />
        <Field autoComplete="new-password" label="Password" minLength={8} name="password" type="password" />
        <Field autoComplete="new-password" label="Confirm password" minLength={8} name="confirmPassword" type="password" />
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        <button className="min-h-12 w-full rounded-full bg-[#004349] px-4 text-sm font-bold text-white hover:bg-[#0d5c63] disabled:bg-[#9aa7a8]" disabled={pending || !hydrated} type="submit">
          {!hydrated ? "Loading secure form..." : pending ? "Creating account..." : `Create ${role} account`}
        </button>
      </form>
    </div>
  );
}

function subscribeToHydration() {
  return () => undefined;
}

function RoleCard({ description, icon: Icon, label, onClick }: { description: string; icon: typeof HeartPulse; label: string; onClick: () => void }) {
  return <button className="group min-h-64 rounded-2xl border border-[#dde4e6] bg-white p-6 text-left shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition hover:border-[#8fd1d9] active:scale-[0.99]" onClick={onClick} type="button"><span className="flex size-16 items-center justify-center rounded-full bg-[#e8eff1] text-[#004349]"><Icon className="size-8" aria-hidden="true" /></span><span className="mt-6 block text-2xl font-semibold tracking-[-0.02em] text-[#161d1f]">{label}</span><span className="mt-2 block text-base leading-6 text-[#3f484a]">{description}</span><span className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#004349]">Continue as {label.endsWith("Patient") ? "Patient" : "Doctor"}<ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" /></span></button>;
}

function Field({ autoComplete, label, minLength, name, type }: { autoComplete: string; label: string; minLength?: number; name: string; type: string }) {
  return <div><label className="text-sm font-semibold text-[#3f484a]" htmlFor={name}>{label}</label><input autoComplete={autoComplete} className="mt-2 min-h-12 w-full rounded-xl border border-[#bfc8c9] bg-white px-4 text-base outline-none focus:border-[#004349] focus:ring-2 focus:ring-[#bbeacf]" id={name} minLength={minLength} name={name} required type={type} /></div>;
}
