"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { routes } from "@/lib/routes";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-red-300 hover:text-red-700 disabled:text-slate-400"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push(routes.auth.signIn);
        router.refresh();
      }}
      type="button"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
