import Link from "next/link";
import type { ReactNode } from "react";
import { Activity } from "lucide-react";

import { DashboardNavigation } from "@/components/dashboard-navigation";

type NavItem = { href: string; label: string };

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
  return (
    <main className="min-h-screen bg-[#f4fafd] pb-24 text-[#161d1f] sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#dce7e9] bg-[#f4fafd]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link className="flex min-h-12 items-center gap-2.5" href={navItems[0]?.href ?? "/"}>
            <span className="flex size-10 items-center justify-center rounded-full bg-[#004349] text-white shadow-sm"><Activity className="size-5" aria-hidden="true" /></span>
            <span><span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3f686b]">Parkinson Project</span><span className="block text-base font-bold tracking-tight text-[#004349]">SteadyPath</span></span>
          </Link>
          <DashboardNavigation navItems={navItems} />
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 pb-8 pt-7 sm:px-8 sm:pt-10">
        <div className="relative overflow-hidden rounded-2xl bg-[#eef5f7] px-5 py-6 sm:px-8"><div className="pointer-events-none absolute -right-14 -top-20 size-56 rounded-full border-[20px] border-[#bbeacf]/40" /><div className="relative"><p className="text-sm font-semibold text-[#20686f]">Your private health workspace</p><h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#161d1f] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-base leading-6 text-[#3f484a]">{description}</p></div></div>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}
