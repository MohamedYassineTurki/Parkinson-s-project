import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  History,
  Home,
  LayoutDashboard,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";

import { SignOutButton } from "@/features/auth/sign-out-button";

type NavItem = { href: string; label: string };

function navIcon(label: string) {
  const value = label.toLowerCase();
  if (value.includes("history")) return History;
  if (value.includes("medication")) return Pill;
  if (value.includes("test") || value.includes("run")) return Activity;
  if (value.includes("patient")) return UserRound;
  if (value.includes("privacy")) return ShieldCheck;
  if (value.includes("onboarding")) return Stethoscope;
  return Home;
}

export function DashboardShell({
  title,
  description,
  navItems,
  children,
}: {
  title: string;
  description: string;
  navItems: NavItem[];
  children: ReactNode;
}) {
  const mobileItems = navItems.filter((item) => !item.label.toLowerCase().includes("onboarding") && !item.label.toLowerCase().includes("privacy")).slice(0, 4);

  return (
    <main className="min-h-screen bg-[#f4fafd] pb-24 text-[#161d1f] sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#dce7e9] bg-[#f4fafd]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link className="flex min-h-12 items-center gap-2.5" href={navItems[0]?.href ?? "/"}>
            <span className="flex size-10 items-center justify-center rounded-full bg-[#004349] text-white shadow-sm">
              <Activity className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3f686b]">Parkinson Project</span>
              <span className="block text-base font-bold tracking-tight text-[#004349]">SteadyPath</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Dashboard navigation">
            {navItems.map((item) => {
              const Icon = navIcon(item.label);
              return (
                <Link className="flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#3f484a] transition-colors hover:bg-[#bbeacf]/50 hover:text-[#004349]" href={item.href} key={item.href}>
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            <SignOutButton />
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <span className="hidden text-right text-xs text-[#6f797a] sm:block">{title}</span>
            <span className="flex size-10 items-center justify-center rounded-full border border-[#bfc8c9] bg-white text-[#004349]" aria-label="Account menu">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 pb-8 pt-7 sm:px-8 sm:pt-10">
        <div className="relative overflow-hidden rounded-2xl bg-[#eef5f7] px-5 py-6 sm:px-8">
          <div className="pointer-events-none absolute -right-14 -top-20 size-56 rounded-full border-[20px] border-[#bbeacf]/40" />
          <div className="relative">
            <p className="text-sm font-semibold text-[#20686f]">Your private health workspace</p>
            <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#161d1f] sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-base leading-6 text-[#3f484a]">{description}</p>
          </div>
        </div>
        <div className="mt-6">{children}</div>
      </section>

      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-[#dce7e9] bg-white/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,67,73,0.08)] backdrop-blur sm:hidden" aria-label="Mobile navigation">
        {mobileItems.map((item, index) => {
          const Icon = index === 0 ? LayoutDashboard : navIcon(item.label);
          return (
            <Link className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-semibold ${index === 0 ? "bg-[#bbeacf] text-[#244f3a]" : "text-[#6f797a]"}`} href={item.href} key={item.href}>
              <Icon className="size-5" aria-hidden="true" />
              <span>{item.label === "Run test" ? "Test" : item.label}</span>
            </Link>
          );
        })}
        <SignOutButton />
      </nav>
    </main>
  );
}
