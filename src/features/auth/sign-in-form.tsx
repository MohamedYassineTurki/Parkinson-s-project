"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { getDefaultRouteForRole } from "@/lib/routes";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });

    if (result.error) {
      setError(result.error.message || "Sign in failed. Check your credentials.");
      setPending(false);
      return;
    }

    router.push(getDefaultRouteForRole(result.data.user.role));
    router.refresh();
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
      <AuthField autoComplete="email" label="Email" name="email" type="email" />
      <AuthField autoComplete="current-password" label="Password" name="password" type="password" />
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <button className="min-h-12 w-full rounded-full bg-[#004349] px-4 text-sm font-bold text-white hover:bg-[#0d5c63] disabled:bg-[#9aa7a8]" disabled={pending || !hydrated} type="submit">
        {!hydrated ? "Loading secure form..." : pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

function subscribeToHydration() {
  return () => undefined;
}

function AuthField({ autoComplete, label, name, type }: { autoComplete: string; label: string; name: string; type: string }) {
  return (
    <div>
      <label className="text-sm font-semibold text-[#3f484a]" htmlFor={name}>{label}</label>
      <input autoComplete={autoComplete} className="mt-2 min-h-12 w-full rounded-xl border border-[#bfc8c9] bg-white px-4 text-base outline-none focus:border-[#004349] focus:ring-2 focus:ring-[#bbeacf]" id={name} name={name} required type={type} />
    </div>
  );
}
