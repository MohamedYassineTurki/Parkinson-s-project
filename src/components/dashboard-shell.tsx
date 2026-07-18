import Link from "next/link";
import type { ReactNode } from "react";
import { Activity } from "lucide-react";

import { DashboardNavigation } from "@/components/dashboard-navigation";

type NavItem = { href: string; label: string };

export function DashboardShell({
  title,
  description,
  hideIntro = false,
  navItems,
  children,
}: {
  title: string;
  description: string;
  hideIntro?: boolean;
  navItems: NavItem[];
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f4fafd] pb-28 text-[#161d1f] lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#dce7e9] bg-[#f4fafd]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link className="flex min-h-12 min-w-0 shrink-0 items-center gap-3" href={navItems[0]?.href ?? "/"}>
            <span className="flex size-12 items-center justify-center rounded-full bg-[#004349] text-white shadow-sm">
              <Activity className="size-6" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3f686b]">Parkinson Project</span>
              <span className="block text-xl font-bold leading-tight tracking-tight text-[#004349]">SteadyPath</span>
            </span>
          </Link>
          <DashboardNavigation mode="header" navItems={navItems} />
        </div>
      </header>

      <DashboardNavigation mode="mobile-bottom" navItems={navItems} />

      <section className="mx-auto w-full max-w-6xl px-5 pb-8 pt-7 sm:px-8 sm:pt-10">
        {!hideIntro ? <div className="relative overflow-hidden rounded-2xl bg-[#eef5f7] px-5 py-6 sm:px-8"><div className="pointer-events-none absolute -right-14 -top-20 size-56 rounded-full border-[20px] border-[#bbeacf]/40" /><div className="relative"><p className="text-sm font-semibold text-[#20686f]">Your private health workspace</p><h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#161d1f] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-base leading-6 text-[#3f484a]">{description}</p></div></div> : null}
        <div className={hideIntro ? "" : "mt-6"}>{children}</div>
      </section>
    </main>
  );
}
