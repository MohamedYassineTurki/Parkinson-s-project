import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/sign-out-button";

type DashboardShellProps = {
  title: string;
  description: string;
  navItems: Array<{
    href: string;
    label: string;
  }>;
  children: ReactNode;
};

export function DashboardShell({
  title,
  description,
  navItems,
  children,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">Parkinson Project</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Dashboard navigation">
            {navItems.map((item) => (
              <Link
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-teal-700 hover:text-teal-700"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
            <SignOutButton />
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}
