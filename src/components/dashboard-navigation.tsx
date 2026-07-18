"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, History, Home, Pill, ShieldCheck, Stethoscope, UserRound } from "lucide-react";

import { SignOutButton } from "@/features/auth/sign-out-button";

type NavItem = { href: string; label: string };

function NavIcon({ label, className }: { label: string; className: string }) {
  const value = label.toLowerCase();
  if (value.includes("history")) return <History className={className} aria-hidden="true" />;
  if (value.includes("medication")) return <Pill className={className} aria-hidden="true" />;
  if (value.includes("test") || value.includes("run")) return <Activity className={className} aria-hidden="true" />;
  if (value.includes("patient")) return <UserRound className={className} aria-hidden="true" />;
  if (value.includes("privacy")) return <ShieldCheck className={className} aria-hidden="true" />;
  if (value.includes("onboarding")) return <Stethoscope className={className} aria-hidden="true" />;
  return <Home className={className} aria-hidden="true" />;
}

function navRank(item: NavItem) {
  const href = item.href;
  if (href === "/patient" || href === "/doctor") return 0;
  if (href.includes("medications") || href.includes("patients")) return 1;
  if (href.includes("/test")) return 2;
  if (href.includes("history")) return 3;
  return 9;
}

function isActive(pathname: string, href: string) {
  return href === "/patient" || href === "/doctor" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavigation({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();
  const profileHref = navItems.find((item) => item.label.toLowerCase().includes("profile") || item.label.toLowerCase().includes("onboarding"))?.href ?? "/";
  const visibleItems = navItems
    .filter((item) => !item.label.toLowerCase().includes("onboarding") && !item.label.toLowerCase().includes("profile") && !item.label.toLowerCase().includes("privacy"))
    .sort((a, b) => navRank(a) - navRank(b));

  return (
    <>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="Dashboard navigation">
        {visibleItems.map((item) => <NavLink item={item} active={isActive(pathname, item.href)} key={item.href} desktop />)}
      </nav>
      <ProfileMenu profileHref={profileHref} />
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-[#dce7e9] bg-white/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,67,73,0.08)] backdrop-blur sm:hidden" aria-label="Mobile navigation">
        {visibleItems.slice(0, 4).map((item) => <NavLink item={item} active={isActive(pathname, item.href)} key={item.href} />)}
      </nav>
    </>
  );
}

function NavLink({ item, active, desktop = false }: { item: NavItem; active: boolean; desktop?: boolean }) {
  return <Link className={desktop
    ? `flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${active ? "bg-[#bbeacf] text-[#244f3a]" : "text-[#3f484a] hover:bg-[#bbeacf]/50 hover:text-[#004349]"}`
    : `flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-semibold ${active ? "bg-[#bbeacf] text-[#244f3a]" : "text-[#6f797a]"}`}
    href={item.href} aria-current={active ? "page" : undefined}>
    <NavIcon className={desktop ? "size-4" : "size-5"} label={item.label} />
    <span>{desktop ? item.label : item.label === "Run test" ? "Test" : item.label}</span>
  </Link>;
}

function ProfileMenu({ profileHref }: { profileHref: string }) {
  const [open, setOpen] = useState(false);
  return <div className="relative">
    <button className="flex size-10 items-center justify-center rounded-full border border-[#bfc8c9] bg-white text-[#004349] transition hover:border-[#004349]" aria-label="Open profile menu" aria-expanded={open} onClick={() => setOpen((current) => !current)} type="button"><UserRound className="size-5" aria-hidden="true" /></button>
    {open ? <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-[#dce7e9] bg-white p-2 shadow-[0_12px_30px_rgba(0,67,73,0.14)]">
      <Link className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#3f484a] hover:bg-[#eef5f7]" href={profileHref} onClick={() => setOpen(false)}><UserRound className="size-4 text-[#004349]" aria-hidden="true" />Profile</Link>
      <SignOutButton className="mt-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#ba1a1a] hover:bg-[#ffdad6]" />
    </div> : null}
  </div>;
}
