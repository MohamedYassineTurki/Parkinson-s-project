import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  LockKeyhole,
  Pill,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Waves,
} from "lucide-react";
import Link from "next/link";

import { routes } from "@/lib/routes";

const steps = [
  { icon: Smartphone, title: "Hold your phone", text: "Place your phone flat on your palm in the same position each time." },
  { icon: Waves, title: "Record 10 seconds", text: "A short accelerometer test captures your natural movement pattern." },
  { icon: BarChart3, title: "See your trend", text: "Compare results with your own baseline and medication timing." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4fafd] text-[#161d1f]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link className="flex min-h-12 items-center gap-2.5" href="/">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#004349] text-white"><Activity className="size-5" aria-hidden="true" /></span>
          <span><span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3f686b]">Parkinson Project</span><span className="block text-base font-bold text-[#004349]">SteadyPath</span></span>
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#3f484a]"><ShieldCheck className="size-4 text-[#3c6751]" aria-hidden="true" /><span className="hidden sm:inline">Private by design</span></div>
      </header>

      <section className="relative overflow-hidden px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border-[28px] border-[#bbeacf]/35" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#bbeacf]/60 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#244f3a]"><Waves className="size-4" aria-hidden="true" /> Stability through clarity</p>
            <h1 className="mt-5 max-w-xl text-[34px] font-bold leading-[1.18] tracking-[-0.03em] text-[#161d1f] sm:text-5xl">Precision monitoring for a steadier life.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#3f484a]">A calm, non-diagnostic research tool that helps you and your doctor understand tremor patterns through simple smartphone tests.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#004349] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#0d5c63]" href={routes.auth.signUp}>Get started <ArrowRight className="size-4" aria-hidden="true" /></Link>
              <Link className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#6f797a] bg-white px-6 text-sm font-bold text-[#004349] transition hover:bg-[#eef5f7]" href={routes.auth.signIn}>Sign in</Link>
            </div>
            <p className="mt-4 text-xs leading-5 text-[#6f797a]">Your results support conversations with a qualified clinician. They do not diagnose or change medication.</p>
          </div>
          <div className="relative mx-auto w-full max-w-sm rounded-[28px] bg-white p-6 shadow-[0_12px_40px_rgba(0,67,73,0.10)] ring-1 ring-[#dce7e9]">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#6f797a]">Today’s view</p><p className="mt-1 text-xl font-bold text-[#004349]">Your usual range</p></div><span className="flex size-11 items-center justify-center rounded-full bg-[#bbeacf] text-[#244f3a]"><Check className="size-5" aria-hidden="true" /></span></div>
            <div className="mt-7 rounded-2xl bg-[#eef5f7] p-4"><div className="flex items-center justify-between text-xs font-semibold text-[#6f797a]"><span>Personal baseline</span><span>Last 7 days</span></div><svg className="mt-4 h-24 w-full" preserveAspectRatio="none" viewBox="0 0 300 90" aria-label="Illustration of a stable movement trend"><path d="M0 49 C25 38, 35 62, 60 48 S95 39, 120 50 S155 63, 180 47 S220 36, 245 49 S275 55, 300 43" fill="none" stroke="#0d5c63" strokeLinecap="round" strokeWidth="4"/><path d="M0 58 C35 58, 65 55, 100 57 S175 56, 210 57 S270 58, 300 56" fill="none" stroke="#3c6751" strokeDasharray="5 7" strokeLinecap="round" strokeWidth="2" opacity=".7"/></svg><div className="mt-2 flex justify-between text-[11px] text-[#6f797a]"><span>7 days ago</span><span>Today</span></div></div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#dce7e9] p-3"><Pill className="size-4 text-[#704b23]" aria-hidden="true" /><p className="mt-2 text-xs text-[#6f797a]">Medication</p><p className="mt-1 text-sm font-bold">Tracked</p></div><div className="rounded-xl border border-[#dce7e9] p-3"><LockKeyhole className="size-4 text-[#3c6751]" aria-hidden="true" /><p className="mt-2 text-xs text-[#6f797a]">Data access</p><p className="mt-1 text-sm font-bold">In your control</p></div></div>
          </div>
        </div>
      </section>

      <section className="bg-[#eef5f7] px-5 py-14 sm:px-8 sm:py-16"><div className="mx-auto w-full max-w-6xl"><div className="mx-auto max-w-xl text-center"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#20686f]">A simple daily rhythm</p><h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Clear information, one small step at a time.</h2><p className="mt-3 text-base leading-7 text-[#3f484a]">Designed for consistency, so changes are easier to discuss with your care team.</p></div><div className="mt-9 grid gap-4 sm:grid-cols-3">{steps.map(({ icon: Icon, title, text }, index) => <article className="relative rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] ring-1 ring-[#dce7e9]" key={title}><span className="absolute left-0 top-0 h-1 w-full rounded-t-2xl bg-[#3c6751]" /><span className="flex size-12 items-center justify-center rounded-full bg-[#bbeacf] text-[#244f3a]"><Icon className="size-5" aria-hidden="true" /></span><p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#6f797a]">0{index + 1}</p><h3 className="mt-1 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#3f484a]">{text}</p></article>)}</div></div></section>

      <section className="px-5 py-14 sm:px-8 sm:py-16"><div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-2 lg:items-center"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#20686f]">Built around trust</p><h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">A shared view for patients and doctors.</h2><p className="mt-4 text-base leading-7 text-[#3f484a]">Keep your own history, connect a doctor when you choose, and bring structured trends into the conversation.</p><div className="mt-6 space-y-4">{[[LockKeyhole, "Patient-controlled access", "You decide whether to connect your doctor."], [Stethoscope, "Clinician-friendly trends", "See personal baselines, before/after context, and quality."], [ShieldCheck, "Conservative by design", "Repeated changes prompt a conversation—not a diagnosis."]].map(([Icon, title, text]) => { const Component = Icon as typeof LockKeyhole; return <div className="flex gap-3" key={String(title)}><span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef5f7] text-[#004349]"><Component className="size-5" aria-hidden="true" /></span><div><h3 className="font-bold">{String(title)}</h3><p className="mt-1 text-sm leading-6 text-[#3f484a]">{String(text)}</p></div></div>; })}</div></div><div className="rounded-3xl bg-[#004349] p-7 text-white sm:p-9"><Waves className="size-8 text-[#8fd1d9]" aria-hidden="true" /><h2 className="mt-6 text-2xl font-bold">Your movement is data. Your context gives it meaning.</h2><p className="mt-4 text-sm leading-6 text-[#d7eff0]">SteadyPath keeps the focus on your personal pattern, medication timing, and the questions you want to take to your doctor.</p><div className="mt-7 flex flex-wrap gap-2">{["10-second tests", "Personal baseline", "Before / after", "Doctor sharing"].map((item) => <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d7eff0]" key={item}>{item}</span>)}</div></div></div></section>

      <footer className="border-t border-[#dce7e9] bg-[#eef5f7] px-5 py-8 sm:px-8"><div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"><p className="text-sm font-bold text-[#004349]">SteadyPath</p><p className="text-xs text-[#6f797a]">A non-diagnostic monitoring and research-support tool.</p><p className="text-xs text-[#6f797a]">© 2026 Parkinson Project</p></div></footer>
    </main>
  );
}
