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
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <AuthField autoComplete="email" label="Email" name="email" type="email" />
      <AuthField autoComplete="current-password" label="Password" name="password" type="password" />
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <button className="w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400" disabled={pending || !hydrated} type="submit">
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
      <label className="text-sm font-medium text-slate-700" htmlFor={name}>{label}</label>
      <input autoComplete={autoComplete} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" id={name} name={name} required type={type} />
    </div>
  );
}
