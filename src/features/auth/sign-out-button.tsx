"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { routes } from "@/lib/routes";

export function SignOutButton({ className }: { className?: string } = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      className={className ?? "rounded-xl border border-[#bfc8c9] bg-white px-3 py-2 text-sm font-semibold text-[#3f484a] hover:border-[#ba1a1a] hover:text-[#ba1a1a] disabled:text-[#9aa7a8]"}
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
