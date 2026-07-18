"use client";

import Link from "next/link";
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  Armchair,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Hand,
  Info,
  Link2,
  Pill,
  Play,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Table2,
  TrendingDown,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  getDailyDosePairingStatuses,
  saveTremorRecording,
  type DailyDosePairingStatus,
  type SavedPairComparison,
} from "./actions";
import {
  evaluateRecordingQuality,
  isDeviceMotionSupported,
  RECORDING_DURATION_MS,
  recordAccelerometerSamples,
  requestMotionPermission,
} from "./sensor-recorder";
import { analyzeTremorSignal } from "./signal-processing";
import type {
  AccelerationSample,
  SensorRecording,
  TremorTestContext,
  TremorTestStep,
} from "./types";
import { APP_SAFETY_NOTICE } from "@/lib/safety";
import { routes } from "@/lib/routes";

type MedicationOption = {
  id: string;
  name: string;
  dose: string;
  scheduleTimes: string[];
};

type SavedOutcome = {
  kind: "before_saved" | "after_unpaired" | "paired";
  sessionId: string;
  recording: SensorRecording;
  mlStatus: "success" | "unavailable" | "failed";
  comparison: SavedPairComparison | null;
};

type WorkflowOutcome =
  | SavedOutcome
  | { kind: "invalid"; recording: SensorRecording }
  | { kind: "save_error"; recording: SensorRecording; message: string };

async function loadDailyDoseStatuses(medicationId: string) {
  if (!medicationId) return [];
  const now = new Date();
  const result = await getDailyDosePairingStatuses({
    medicationId,
    now: now.toISOString(),
    timezoneOffsetMinutes: now.getTimezoneOffset(),
  });
  return result.ok ? result.statuses : [];
}

export function TremorTestWorkflow({ medications }: { medications: MedicationOption[] }) {
  const [step, setStep] = useState<TremorTestStep>("setup");
  const [context, setContext] = useState<TremorTestContext>("before_medication");
  const [medicationId, setMedicationId] = useState(medications[0]?.id ?? "");
  const [doseTime, setDoseTime] = useState(medications[0]?.scheduleTimes[0] ?? "");
  const [doseSlot, setDoseSlot] = useState(0);
  const [dailyDoseStatuses, setDailyDoseStatuses] = useState<DailyDosePairingStatus[]>([]);
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<WorkflowOutcome | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const selectedMedication = medications.find((item) => item.id === medicationId);
  const medicationLabel = selectedMedication
    ? `${selectedMedication.name} · ${selectedMedication.dose}`
    : "Medication";

  useEffect(() => {
    let cancelled = false;
    void loadDailyDoseStatuses(medicationId)
      .then((statuses) => {
        if (!cancelled) setDailyDoseStatuses(statuses);
      })
      .catch(() => {
        if (!cancelled) setDailyDoseStatuses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [medicationId]);

  async function handleRecordingComplete(recording: SensorRecording) {
    if (recording.quality.status !== "valid") {
      setOutcome({ kind: "invalid", recording });
      return;
    }

    try {
      const result = await saveTremorRecording({
        medicationId,
        doseSlot,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        context: recording.context,
        doseTime,
        notes,
        startedAt: recording.startedAt.toISOString(),
        completedAt: recording.completedAt.toISOString(),
        samples: recording.samples,
        quality: recording.quality,
        analysis: recording.analysis,
      });

      if (!result.ok) {
        setOutcome({ kind: "save_error", recording, message: result.message });
        return;
      }

      setDailyDoseStatuses(await loadDailyDoseStatuses(medicationId));
      setOutcome({
        kind: result.pairId ? "paired" : context === "after_medication" ? "after_unpaired" : "before_saved",
        sessionId: result.sessionId,
        recording,
        mlStatus: result.mlStatus,
        comparison: result.pairComparison,
      });
    } catch {
      setOutcome({
        kind: "save_error",
        recording,
        message: "The result could not be saved. Check your connection and try again.",
      });
    }
  }

  function retake() {
    setOutcome(null);
    setStep("ready");
  }

  function reviewPosition() {
    setOutcome(null);
    setStep("instructions");
  }

  if (outcome) {
    return (
      <OutcomeScreen
        doseSlot={doseSlot}
        medicationLabel={medicationLabel}
        onHelp={() => setShowHelp(true)}
        onRetake={retake}
        onReviewPosition={reviewPosition}
        outcome={outcome}
      >
        {showHelp ? <HelpSheet onClose={() => setShowHelp(false)} /> : null}
      </OutcomeScreen>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f4fafd] text-[#161d1f]">
      {step === "setup" ? (
        <SetupStep
          context={context}
          dailyDoseStatuses={dailyDoseStatuses}
          doseSlot={doseSlot}
          doseTime={doseTime}
          medicationId={medicationId}
          medications={medications}
          notes={notes}
          onContextChange={setContext}
          onDoseSlotChange={(slot, time) => {
            setDoseSlot(slot);
            setDoseTime(time);
          }}
          onDoseTimeChange={setDoseTime}
          onHelp={() => setShowHelp(true)}
          onMedicationChange={(id) => {
            const medication = medications.find((item) => item.id === id);
            setMedicationId(id);
            setDoseSlot(0);
            setDoseTime(medication?.scheduleTimes[0] ?? "");
          }}
          onNext={() => setStep("instructions")}
          onNotesChange={setNotes}
        />
      ) : null}

      {step === "instructions" ? (
        <InstructionsStep
          context={context}
          doseSlot={doseSlot}
          medicationLabel={medicationLabel}
          onBack={() => setStep("setup")}
          onHelp={() => setShowHelp(true)}
          onNext={() => setStep("ready")}
        />
      ) : null}

      {step === "ready" ? (
        <ReadyStep
          context={context}
          onBack={() => setStep("instructions")}
          onHelp={() => setShowHelp(true)}
          onRecordingComplete={handleRecordingComplete}
        />
      ) : null}

      {showHelp ? <HelpSheet onClose={() => setShowHelp(false)} /> : null}
    </main>
  );
}

function TestHeader({
  step,
  onBack,
  onHelp,
  closeHref,
}: {
  step: 1 | 2 | 3;
  onBack?: () => void;
  onHelp: () => void;
  closeHref?: string;
}) {
  const controlClass = "flex size-12 items-center justify-center rounded-full text-[#004349] transition active:bg-[#bbeacf]/35";
  return (
    <header className="sticky top-0 z-30 border-b border-[#dde4e6]/70 bg-[#f4fafd]/95 px-5 pt-[max(8px,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[600px] items-center justify-between">
        {closeHref ? (
          <Link aria-label="Close test" className={controlClass} href={closeHref}>
            <X className="size-6" aria-hidden="true" />
          </Link>
        ) : (
          <button aria-label="Go back" className={controlClass} onClick={onBack} type="button">
            <ArrowLeft className="size-6" aria-hidden="true" />
          </button>
        )}
        <p className="text-xl font-bold tracking-[-0.02em] text-[#004349]">Step {step} of 3</p>
        <button aria-label="Test help" className={controlClass} onClick={onHelp} type="button">
          <CircleHelp className="size-6" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

type SetupStepProps = {
  context: TremorTestContext;
  medicationId: string;
  medications: MedicationOption[];
  dailyDoseStatuses: DailyDosePairingStatus[];
  doseTime: string;
  doseSlot: number;
  notes: string;
  onContextChange: (value: TremorTestContext) => void;
  onMedicationChange: (id: string) => void;
  onDoseTimeChange: (value: string) => void;
  onDoseSlotChange: (slot: number, time: string) => void;
  onNotesChange: (value: string) => void;
  onHelp: () => void;
  onNext: () => void;
};

function SetupStep(props: SetupStepProps) {
  const selectedMedication = props.medications.find((item) => item.id === props.medicationId);
  const doseTimes = selectedMedication?.scheduleTimes.length ? selectedMedication.scheduleTimes : [""];
  const selectedStatus = props.dailyDoseStatuses.find((item) => item.doseSlot === props.doseSlot);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TestHeader closeHref={routes.patient.root} onHelp={props.onHelp} step={1} />
      <div className="mx-auto w-full max-w-[600px] flex-1 px-5 pb-36 pt-8">
        <h1 className="text-[32px] font-bold leading-10 tracking-[-0.02em]">New tremor test</h1>
        <p className="mt-2 text-base leading-6 text-[#3f484a]">Tell us when this measurement is happening.</p>

        <div className="mt-8 grid grid-cols-2 rounded-xl bg-[#e8eff1] p-1.5" aria-label="Medication timing">
          <ContextButton active={props.context === "before_medication"} label="Before medication" onClick={() => props.onContextChange("before_medication")} />
          <ContextButton active={props.context === "after_medication"} label="After medication" onClick={() => props.onContextChange("after_medication")} />
        </div>

        {props.context === "after_medication" ? (
          <div className={`mt-5 flex gap-3 rounded-xl border p-4 ${selectedStatus?.before ? "border-[#a2d1b6] bg-[#bbeacf]/55 text-[#244f3a]" : "border-[#f0bd8b] bg-[#ffdcbd]/45 text-[#623f18]"}`} role="status">
            {selectedStatus?.before ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <Info className="mt-0.5 size-5 shrink-0" />}
            <p className="text-sm font-semibold leading-6">
              {selectedStatus?.before
                ? `Before test found for Dose ${props.doseSlot + 1} today. Your new test will be linked automatically.`
                : `No before test found for Dose ${props.doseSlot + 1} today. This result can still be saved, but no comparison will be created.`}
            </p>
          </div>
        ) : selectedStatus?.before ? (
          <div className="mt-5 flex gap-3 rounded-xl border border-[#8fd1d9] bg-[#eef5f7] p-4 text-[#004349]" role="status">
            <RotateCcw className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm font-semibold leading-6">A before test is already saved for this dose today. Continuing will create a new retake.</p>
          </div>
        ) : null}

        <section className="mt-7">
          <label className="text-sm font-semibold text-[#3f484a]" htmlFor="test-medication">Medication</label>
          <div className="relative mt-2">
            <Pill className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#3c6751]" />
            <select
              className="min-h-16 w-full appearance-none rounded-xl border border-[#bfc8c9] bg-white py-3 pl-12 pr-12 text-base font-semibold outline-none focus:border-[#004349] focus:ring-2 focus:ring-[#bbeacf]"
              id="test-medication"
              onChange={(event) => props.onMedicationChange(event.target.value)}
              value={props.medicationId}
            >
              {props.medications.length === 0 ? <option value="">Add an active medication first</option> : null}
              {props.medications.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.dose}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-[#3f484a]" />
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#3f484a]">Target dose</p>
              <p className="mt-1 text-sm text-[#6f797a]">Use the same dose number before and after.</p>
            </div>
            <Link className="shrink-0 text-sm font-bold text-[#004349] underline underline-offset-4" href={routes.patient.medications}>Edit schedule</Link>
          </div>
          <div className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
            {doseTimes.map((time, index) => {
              const status = props.dailyDoseStatuses.find((item) => item.doseSlot === index);
              const selected = props.doseSlot === index;
              return (
                <button
                  className={`min-h-24 min-w-32 rounded-xl border p-4 text-left transition ${selected ? "border-[#004349] bg-[#bbeacf]/45 ring-2 ring-[#004349]/10" : "border-[#bfc8c9] bg-white"}`}
                  key={`${index}-${time}`}
                  onClick={() => props.onDoseSlotChange(index, time)}
                  type="button"
                >
                  <span className="block text-lg font-bold text-[#161d1f]">{time || "No time"}</span>
                  <span className="mt-1 block text-sm font-semibold text-[#3f484a]">Dose {index + 1}</span>
                  {status ? <span className="mt-2 block text-xs font-semibold text-[#3c6751]">{status.pairId ? "Paired today" : status.before ? "Before saved" : "After saved"}</span> : null}
                </button>
              );
            })}
          </div>
        </section>

        <details className="mt-5 rounded-xl border border-[#dde4e6] bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-[#004349]">Optional dose details</summary>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-[#3f484a]" htmlFor="dose-time">{props.context === "after_medication" ? "Time medication was taken" : "Scheduled dose time"}</label>
              <input className="mt-2 min-h-12 w-full rounded-xl border border-[#bfc8c9] bg-white px-4 text-base outline-none focus:border-[#004349] focus:ring-2 focus:ring-[#bbeacf]" id="dose-time" onChange={(event) => props.onDoseTimeChange(event.target.value)} type="time" value={props.doseTime} />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#3f484a]" htmlFor="test-notes">Notes</label>
              <textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#bfc8c9] bg-white px-4 py-3 text-base outline-none focus:border-[#004349] focus:ring-2 focus:ring-[#bbeacf]" id="test-notes" onChange={(event) => props.onNotesChange(event.target.value)} placeholder="Sleep, stress, caffeine, or anything unusual" value={props.notes} />
            </div>
          </div>
        </details>
      </div>

      <StickyActions>
        {props.medications.length === 0 ? (
          <Link className="flex min-h-14 w-full items-center justify-center rounded-xl bg-[#004349] px-6 text-base font-bold text-white" href={routes.patient.medications}>Add a medication</Link>
        ) : (
          <button className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#004349] px-6 text-base font-bold text-white transition active:scale-[0.99] disabled:bg-[#9aa7a8]" disabled={!props.medicationId} onClick={props.onNext} type="button">Continue <ArrowRight className="size-5" /></button>
        )}
      </StickyActions>
    </div>
  );
}

function ContextButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button className={`min-h-12 rounded-lg px-3 text-sm font-bold transition ${active ? "bg-white text-[#004349] shadow-sm" : "text-[#3f484a]"}`} onClick={onClick} type="button">{label}</button>;
}

function InstructionsStep({ context, doseSlot, medicationLabel, onBack, onHelp, onNext }: { context: TremorTestContext; doseSlot: number; medicationLabel: string; onBack: () => void; onHelp: () => void; onNext: () => void }) {
  const steps = [
    { icon: Armchair, title: "Sit comfortably", text: "Keep both feet on the floor in a quiet place." },
    { icon: Hand, title: "Extend your arm", text: "Turn your palm upward and keep your shoulders relaxed." },
    { icon: Smartphone, title: "Place the phone flat", text: "Lay the phone flat on your palm with the screen facing up." },
  ];
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TestHeader onBack={onBack} onHelp={onHelp} step={2} />
      <div className="mx-auto w-full max-w-[600px] flex-1 px-5 pb-44 pt-6">
        <div className="inline-flex rounded-full bg-[#bbeacf]/65 px-4 py-2 text-sm font-bold text-[#244f3a]">{context === "before_medication" ? "Before medication" : "After medication"} · Dose {doseSlot + 1} · {medicationLabel}</div>
        <h1 className="mt-6 text-[32px] font-bold leading-10 tracking-[-0.02em]">Get into position</h1>
        <p className="mt-2 text-base leading-6 text-[#3f484a]">Use this same position every time for a fair personal comparison.</p>

        <div className="relative mt-7 flex min-h-52 items-center justify-center overflow-hidden rounded-2xl bg-[#e8eff1]">
          <div className="absolute size-44 rounded-full bg-[#bbeacf]/60" />
          <div className="relative flex items-center gap-4 text-[#004349]">
            <Accessibility className="size-16" strokeWidth={1.6} />
            <ArrowRight className="size-8" />
            <Hand className="size-14" strokeWidth={1.6} />
            <Smartphone className="-ml-10 -mt-8 size-10 rotate-90" strokeWidth={1.8} />
          </div>
        </div>

        <ol className="mt-6 space-y-3">
          {steps.map((item, index) => (
            <li className="flex gap-4 rounded-xl border border-[#dde4e6] bg-white p-5 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.04)]" key={item.title}>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#eef5f7] text-[#3c6751]"><item.icon className="size-6" /></div>
              <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f797a]">Step {index + 1}</p><h2 className="mt-1 text-lg font-bold">{item.title}</h2><p className="mt-1 text-base leading-6 text-[#3f484a]">{item.text}</p></div>
            </li>
          ))}
        </ol>
      </div>
      <StickyActions>
        <button className="flex min-h-14 w-full items-center justify-center rounded-xl bg-[#004349] px-6 text-base font-bold text-white" onClick={onNext} type="button">I’m ready</button>
        <button className="flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-[#004349] px-6 text-base font-bold text-[#004349]" onClick={onBack} type="button">Back</button>
      </StickyActions>
    </div>
  );
}

function ReadyStep({ context, onBack, onHelp, onRecordingComplete }: { context: TremorTestContext; onBack: () => void; onHelp: () => void; onRecordingComplete: (recording: SensorRecording) => Promise<void> }) {
  const [status, setStatus] = useState<"idle" | "requesting_permission" | "recording" | "processing" | "error">("idle");
  const [samples, setSamples] = useState<AccelerationSample[]>([]);
  const [error, setError] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const clockIdRef = useRef<number | null>(null);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    if (clockIdRef.current != null) window.clearInterval(clockIdRef.current);
  }, []);

  async function startRecording() {
    setError("");
    setSamples([]);
    if (!isDeviceMotionSupported()) {
      setStatus("error");
      setError("This browser cannot access the phone motion sensor. Open the site in Safari or Chrome on your smartphone.");
      return;
    }
    setStatus("requesting_permission");
    const permission = await requestMotionPermission();
    if (permission !== "granted") {
      setStatus("error");
      setError("Motion access was not allowed. Enable Motion & Orientation Access in your browser settings, then try again.");
      return;
    }

    const startedAt = new Date();
    const clockStartedAt = performance.now();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setElapsedMs(0);
    setStatus("recording");
    clockIdRef.current = window.setInterval(() => setElapsedMs(Math.min(performance.now() - clockStartedAt, RECORDING_DURATION_MS)), 50);
    const recordedSamples = await recordAccelerometerSamples((sample) => setSamples((current) => [...current, sample]), RECORDING_DURATION_MS, controller.signal);
    if (clockIdRef.current != null) window.clearInterval(clockIdRef.current);
    clockIdRef.current = null;
    abortControllerRef.current = null;

    if (controller.signal.aborted) {
      setSamples([]);
      setElapsedMs(0);
      setStatus("error");
      setError("Recording stopped. Get back into position when you are ready.");
      return;
    }

    setElapsedMs(RECORDING_DURATION_MS);
    const recording: SensorRecording = {
      context,
      startedAt,
      completedAt: new Date(),
      samples: recordedSamples,
      quality: evaluateRecordingQuality(recordedSamples),
      analysis: analyzeTremorSignal(recordedSamples),
    };
    setStatus("processing");
    await onRecordingComplete(recording);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {status === "recording" || status === "processing" ? <RecordingOverlay elapsedMs={elapsedMs} onStop={() => abortControllerRef.current?.abort()} processing={status === "processing"} sampleCount={samples.length} /> : null}
      <TestHeader onBack={onBack} onHelp={onHelp} step={3} />
      <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col items-center px-5 pb-40 pt-12 text-center">
        <div className="relative flex size-32 items-center justify-center rounded-full bg-[#bbeacf]/65 text-[#3c6751]">
          <Waves className="absolute size-24 opacity-25" />
          <Smartphone className="size-14" strokeWidth={1.7} />
        </div>
        <h1 className="mt-8 text-[32px] font-bold leading-10 tracking-[-0.02em]">Ready to record</h1>
        <p className="mt-4 max-w-sm text-lg leading-7 text-[#3f484a]">Keep the phone flat on your palm. Stay as still as you comfortably can for 10 seconds.</p>
        <div className="mt-8 flex w-full max-w-sm gap-3 rounded-xl border border-[#dde4e6] bg-white p-5 text-left">
          <ShieldCheck className="size-6 shrink-0 text-[#3c6751]" />
          <div><p className="font-bold">Motion data only</p><p className="mt-1 text-sm leading-6 text-[#3f484a]">No camera, microphone, photo, or video is used.</p></div>
        </div>
        {status === "requesting_permission" ? <p className="mt-6 text-sm font-semibold text-[#004349]" role="status">Waiting for motion sensor permission…</p> : null}
        {status === "error" ? <div className="mt-6 w-full rounded-xl border border-[#f0bd8b] bg-[#ffdcbd]/45 p-4 text-left text-sm font-semibold leading-6 text-[#623f18]" role="alert">{error}</div> : null}
      </div>
      <StickyActions>
        <button className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#004349] px-6 text-base font-bold text-white disabled:bg-[#9aa7a8]" disabled={status === "requesting_permission"} onClick={startRecording} type="button"><Play className="size-5 fill-current" /> {status === "requesting_permission" ? "Requesting access…" : "Start 10-second recording"}</button>
        <button className="flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-[#004349] px-6 text-base font-bold text-[#004349]" onClick={onBack} type="button">Review position</button>
      </StickyActions>
    </div>
  );
}

function RecordingOverlay({ elapsedMs, onStop, processing, sampleCount }: { elapsedMs: number; onStop: () => void; processing: boolean; sampleCount: number }) {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(elapsedMs / RECORDING_DURATION_MS, 1);
  const remainingSeconds = Math.max(0, Math.ceil((RECORDING_DURATION_MS - elapsedMs) / 1000));
  return (
    <div className="fixed inset-0 z-[100] flex min-h-[100dvh] flex-col overflow-hidden bg-[#f4fafd] px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(40px,env(safe-area-inset-top))] text-[#161d1f]">
      <div className="steady-recorder-glow pointer-events-none absolute left-1/2 top-1/2 size-[125vw] max-h-[680px] max-w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#bbeacf]/40 blur-[90px]" />
      <header className="relative mx-auto w-full max-w-md text-center"><p className="text-2xl font-semibold leading-8 tracking-[-0.02em] text-[#004349]">Hold your phone steady</p><p className="mt-2 text-base leading-6 text-[#3f484a]">Keep the same comfortable position.</p></header>
      <div className="relative mx-auto flex flex-1 items-center justify-center py-8">
        <div className="relative flex size-[min(74vw,300px)] items-center justify-center">
          <svg className="absolute inset-0 size-full drop-shadow-sm" viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" fill="none" r={radius} stroke="#e2e9ec" strokeWidth="8" /><circle cx="130" cy="130" fill="none" r={radius} stroke="#004349" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} strokeLinecap="round" strokeWidth="10" style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 80ms linear" }} /></svg>
          <div className="absolute inset-[18%] overflow-hidden rounded-full"><svg className="steady-recorder-wave absolute left-1/2 top-1/2 h-24 w-[150%] -translate-x-1/2 -translate-y-1/2 opacity-70" fill="none" viewBox="0 0 240 100" aria-hidden="true"><path d="M-20 50 Q20 42 40 50 T100 50 T160 50 T220 50 T260 50" stroke="#a2d1b6" strokeLinecap="round" strokeWidth="4" /><path d="M-20 50 Q20 58 40 50 T100 50 T160 50 T220 50 T260 50" opacity=".55" stroke="#8fd1d9" strokeLinecap="round" strokeWidth="2" /></svg></div>
          <div className="relative flex flex-col items-center text-center"><span className="text-[44px] font-bold leading-none tracking-[-0.04em] text-[#004349]">{processing ? "Done" : remainingSeconds}</span><span className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#3f484a]">{processing ? "Processing" : "Seconds"}</span><span className="sr-only">{sampleCount} accelerometer samples captured</span></div>
        </div>
      </div>
      <footer className="relative mx-auto w-full max-w-md">{processing ? <div className="flex min-h-14 w-full items-center justify-center rounded-full border border-[#bfc8c9] bg-white/70 px-6 text-sm font-semibold text-[#004349]">Checking quality and saving securely…</div> : <button className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full border-2 border-[#ba1a1a] px-6 text-sm font-semibold text-[#ba1a1a]" onClick={onStop} type="button"><X className="size-5" /> Stop recording</button>}</footer>
    </div>
  );
}

function OutcomeScreen({ children, doseSlot, medicationLabel, onHelp, onRetake, onReviewPosition, outcome }: { children?: React.ReactNode; doseSlot: number; medicationLabel: string; onHelp: () => void; onRetake: () => void; onReviewPosition: () => void; outcome: WorkflowOutcome }) {
  if (outcome.kind === "invalid" || outcome.kind === "save_error") {
    const saveError = outcome.kind === "save_error";
    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-[#f4fafd] px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(48px,env(safe-area-inset-top))]">
        <div className="pointer-events-none absolute inset-x-0 top-1/3 h-80 bg-[#bbeacf]/10 [clip-path:ellipse(80%_45%_at_50%_50%)]" />
        <div className="relative mx-auto flex min-h-[calc(100dvh-80px)] w-full max-w-[600px] flex-col items-center">
          <div className={`flex size-24 items-center justify-center rounded-full ${saveError ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#eef5f7] text-[#6f797a]"}`}>{saveError ? <Info className="size-11" /> : <Hand className="size-11" />}</div>
          <h1 className="mt-8 text-center text-[32px] font-bold leading-10 tracking-[-0.02em]">{saveError ? "We couldn’t save that" : "Let’s try that again"}</h1>
          <p className="mt-4 max-w-md text-center text-lg leading-7 text-[#3f484a]">{saveError ? outcome.message : "We couldn’t get a clear reading because the phone moved too much or the sensor data was incomplete."}</p>
          {!saveError ? <div className="mt-10 grid w-full gap-4 sm:grid-cols-2"><TipCard icon={Table2} title="Rest your arm">Try resting your elbow on a table or chair arm for support.</TipCard><TipCard icon={Armchair} title="Sit comfortably">Find a quiet spot where you can sit without feeling rushed.</TipCard></div> : <div className="mt-8 w-full rounded-xl border border-[#dde4e6] bg-white p-5 text-sm leading-6 text-[#3f484a]">Your unclear or unsaved test was not added to history and was not used in a comparison.</div>}
          <div className="mt-auto flex w-full flex-col gap-3 pt-10"><button className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#004349] px-6 text-base font-bold text-white" onClick={onRetake} type="button">Retake test <RotateCcw className="size-5" /></button><button className="flex min-h-14 w-full items-center justify-center rounded-full border-2 border-[#004349] px-6 text-base font-bold text-[#004349]" onClick={onReviewPosition} type="button">Review position</button><Link className="flex min-h-12 items-center justify-center text-sm font-bold text-[#004349] underline" href={routes.patient.root}>Cancel</Link></div>
        </div>{children}
      </main>
    );
  }

  if (outcome.kind === "paired" && outcome.comparison) {
    return <PairedOutcome comparison={outcome.comparison} doseSlot={doseSlot} medicationLabel={medicationLabel} onHelp={onHelp}>{children}</PairedOutcome>;
  }

  if (outcome.kind === "after_unpaired") {
    return (
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#f4fafd] px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(48px,env(safe-area-inset-top))] text-center">
        <div className="pointer-events-none absolute inset-x-0 top-1/3 h-72 bg-[#bbeacf]/15 [clip-path:ellipse(75%_40%_at_50%_50%)]" />
        <div className="relative mx-auto flex w-full max-w-[600px] flex-1 flex-col items-center justify-center"><div className="flex size-24 items-center justify-center rounded-full bg-[#bbeacf] text-[#406b55]"><Info className="size-12" /></div><h1 className="mt-8 text-[32px] font-bold leading-10 tracking-[-0.02em]">After test saved</h1><p className="mt-5 max-w-md text-lg leading-8 text-[#3f484a]">We could not find a before-medication test for {medicationLabel}, Dose {doseSlot + 1} today, so no dose comparison was created.</p><p className="mt-4 text-base text-[#3f484a]">The result is safely stored in your history.</p></div>
        <div className="relative mx-auto flex w-full max-w-[600px] flex-col gap-3 pt-8"><Link className="flex min-h-14 items-center justify-center rounded-xl bg-[#004349] px-6 text-base font-bold text-white" href={routes.patient.result(outcome.sessionId)}>View saved result</Link><Link className="flex min-h-14 items-center justify-center rounded-xl border-2 border-[#004349] px-6 text-base font-bold text-[#004349]" href={routes.patient.root}>Done</Link></div>{children}
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f4fafd]">
      <TestHeader closeHref={routes.patient.root} onHelp={onHelp} step={1} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col items-center px-5 pb-12 pt-10 text-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-[#bbeacf] text-[#406b55]"><CheckCircle2 className="size-12" /></div>
        <h1 className="mt-8 text-[32px] font-bold leading-10 tracking-[-0.02em] text-[#004349]">Before test saved</h1>
        <p className="mt-3 text-lg text-[#3f484a]">{medicationLabel} · Dose {doseSlot + 1} · Today at {formatTime(outcome.recording.startedAt)}</p>
        <div className="mt-9 w-full rounded-xl border border-[#dde4e6] bg-white p-6 text-left shadow-sm"><div className="mx-auto max-w-xs space-y-5"><StatusRow complete label="Before medication" value="Complete" /><StatusRow label="After medication" value="Waiting" /></div></div>
        <div className="mt-6 w-full rounded-xl border border-[#dde4e6] bg-[#eef5f7] p-6 text-left"><div className="flex items-center gap-2 font-bold text-[#004349]"><Info className="size-5" /> Next step</div><p className="mt-3 text-base leading-7">After taking Dose {doseSlot + 1}, return to SteadyPath, select After medication, and choose Dose {doseSlot + 1}. The tests will link automatically.</p></div>
        <div className="mt-8 flex w-full flex-col gap-3"><Link className="flex min-h-14 items-center justify-center rounded-xl bg-[#004349] px-6 text-base font-bold text-white" href={routes.patient.root}>Done for now</Link><button className="flex min-h-14 items-center justify-center rounded-xl border-2 border-[#004349] px-6 text-base font-bold text-[#004349]" onClick={onRetake} type="button">Retake test</button><Link className="flex min-h-12 items-center justify-center text-sm font-bold text-[#161d1f] underline" href={routes.patient.result(outcome.sessionId)}>View technical result</Link></div>
        {outcome.mlStatus !== "success" ? <p className="mt-5 text-xs leading-5 text-[#6f797a]">The deterministic analysis was saved safely. Experimental ML analysis was unavailable.</p> : null}
      </div>{children}
    </main>
  );
}

function PairedOutcome({ children, comparison, doseSlot, medicationLabel, onHelp }: { children?: React.ReactNode; comparison: SavedPairComparison; doseSlot: number; medicationLabel: string; onHelp: () => void }) {
  const improvement = comparison.improvementPercent;
  const lower = improvement != null && improvement > 5;
  const higher = improvement != null && improvement < -5;
  const difference = improvement == null ? "—" : `${improvement > 0 ? "−" : improvement < 0 ? "+" : ""}${Math.abs(improvement).toFixed(0)}%`;
  return (
    <main className="min-h-[100dvh] bg-[#f4fafd] pb-28">
      <header className="sticky top-0 z-20 border-b border-[#dde4e6]/70 bg-[#f4fafd]/90 px-5 pt-[max(8px,env(safe-area-inset-top))] backdrop-blur"><div className="mx-auto flex h-16 max-w-[600px] items-center justify-between"><Link aria-label="Back to dashboard" className="flex size-12 items-center justify-center rounded-full text-[#004349]" href={routes.patient.root}><ArrowLeft className="size-6" /></Link><button aria-label="Comparison help" className="flex size-12 items-center justify-center rounded-full text-[#3f484a]" onClick={onHelp} type="button"><CircleHelp className="size-6" /></button></div></header>
      <div className="mx-auto w-full max-w-[600px] px-5 pt-8">
        <section className="flex flex-col items-center text-center"><div className="flex size-24 items-center justify-center rounded-full bg-[#bbeacf] text-[#406b55]"><Link2 className="size-12" /></div><p className="mt-6 text-sm font-bold uppercase tracking-[0.1em] text-[#3c6751]">Dose {doseSlot + 1} comparison</p><h1 className="mt-3 text-[32px] font-bold leading-10 tracking-[-0.02em]">Your tests were linked</h1><p className="mt-3 text-lg leading-7 text-[#3f484a]">{lower ? "Lower movement was measured after this dose." : higher ? "Higher movement was measured after this dose." : "Movement was similar before and after this dose."}</p></section>
        <section className="relative mt-8 rounded-xl bg-white p-6 shadow-sm"><div className="absolute bottom-10 left-[39px] top-10 w-0.5 bg-[#dde4e6]" /><div className="relative space-y-6"><TimelineRow icon={Accessibility} label="Before" time={formatTime(new Date(comparison.beforeRecordedAt))} /><TimelineRow icon={Pill} label="Medication taken" time={comparison.medicationTakenAt ? formatTime(new Date(comparison.medicationTakenAt)) : "Time not entered"} emphasized /><TimelineRow icon={Accessibility} label="After" time={formatTime(new Date(comparison.afterRecordedAt))} /></div></section>
        <section className="mt-4 grid grid-cols-2 gap-4"><MovementCard label="Before movement" value={comparison.beforePower} /><MovementCard label="After movement" value={comparison.afterPower} /><div className="col-span-2 flex items-center justify-between rounded-xl border border-[#a2d1b6] bg-[#bbeacf]/35 p-5"><div><p className="font-bold">Difference</p><p className="mt-1 text-sm text-[#3f484a]">{lower ? "Lower movement" : higher ? "Higher movement" : "Similar movement"}</p></div><div className={`flex items-center gap-2 text-2xl font-bold ${higher ? "text-[#93000a]" : "text-[#3c6751]"}`}><TrendingDown className={`size-6 ${higher ? "rotate-180" : ""}`} />{difference}</div></div></section>
        <p className="mt-5 rounded-xl border border-[#dde4e6] bg-[#eef5f7] p-4 text-center text-sm leading-6 text-[#3f484a]"><Info className="mr-1 inline size-4" /> Compared with your own tests, not a diagnosis.</p>
        <details className="mt-5 rounded-xl bg-white p-5 shadow-sm"><summary className="flex cursor-pointer items-center justify-between font-bold">Technical details <ChevronDown className="size-5" /></summary><div className="mt-4 border-t border-[#dde4e6] pt-4 text-sm leading-6 text-[#3f484a]"><p>Medication: {medicationLabel}</p><p>Signal: smartphone accelerometer x/y/z</p><p>Measure: deterministic tremor power (signal-v2)</p></div></details>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#dde4e6] bg-[#f4fafd]/95 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 backdrop-blur"><Link className="mx-auto flex min-h-14 w-full max-w-[600px] items-center justify-center rounded-full bg-[#004349] px-6 text-base font-bold text-white" href={routes.patient.history}>View personal trend</Link></div>{children}
    </main>
  );
}

function StatusRow({ complete = false, label, value }: { complete?: boolean; label: string; value: string }) { return <div className={`flex items-center gap-4 ${complete ? "text-[#3c6751]" : "text-[#6f797a]"}`}><div className={`flex size-11 items-center justify-center rounded-full ${complete ? "bg-[#bbeacf]" : "bg-[#e2e9ec]"}`}>{complete ? <Check className="size-6" /> : <Clock3 className="size-6" />}</div><div><p className="text-sm">{label}</p><p className="text-xl font-bold">{value}</p></div></div>; }
function TimelineRow({ emphasized = false, icon: Icon, label, time }: { emphasized?: boolean; icon: typeof Accessibility; label: string; time: string }) { return <div className="flex items-center gap-4"><div className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 ${emphasized ? "border-[#bbeacf] bg-[#bbeacf] text-[#406b55]" : "border-[#bfc8c9] bg-white text-[#3f484a]"}`}><Icon className="size-4" /></div><div><p className="font-bold">{label}</p><p className="text-sm text-[#3f484a]">{time}</p></div></div>; }
function MovementCard({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-[#3f484a]">{label}</p><p className="mt-3 text-2xl font-bold">{formatMovement(value)}</p><p className="mt-1 text-xs text-[#6f797a]">movement index</p></div>; }
function TipCard({ children, icon: Icon, title }: { children: React.ReactNode; icon: typeof Table2; title: string }) { return <div className="rounded-2xl border border-[#dde4e6] bg-white p-6"><div className="flex size-12 items-center justify-center rounded-full bg-[#eef5f7] text-[#3c6751]"><Icon className="size-6" /></div><h2 className="mt-5 text-xl font-semibold">{title}</h2><p className="mt-3 text-base leading-7 text-[#3f484a]">{children}</p></div>; }
function StickyActions({ children }: { children: React.ReactNode }) { return <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#dde4e6] bg-[#f4fafd]/95 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 backdrop-blur"><div className="mx-auto flex w-full max-w-[600px] flex-col gap-3">{children}</div></div>; }
function HelpSheet({ onClose }: { onClose: () => void }) { return <div className="fixed inset-0 z-[120] flex items-end bg-[#161d1f]/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="test-help-title"><div className="w-full rounded-2xl bg-white p-6 shadow-xl sm:max-w-md"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-[#004349]" id="test-help-title">About this test</h2><button aria-label="Close help" className="flex size-12 items-center justify-center rounded-full text-[#004349]" onClick={onClose} type="button"><X className="size-6" /></button></div><p className="mt-3 text-base leading-7 text-[#3f484a]">The test records 10 seconds of smartphone accelerometer movement. It never uses the camera or microphone.</p><p className="mt-4 rounded-xl bg-[#eef5f7] p-4 text-sm leading-6 text-[#3f484a]">{APP_SAFETY_NOTICE}</p><button className="mt-5 min-h-12 w-full rounded-xl bg-[#004349] px-5 font-bold text-white" onClick={onClose} type="button">Got it</button></div></div>; }
function formatTime(date: Date) { return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date); }
function formatMovement(value: number) { if (!Number.isFinite(value)) return "—"; return value < 0.01 ? value.toFixed(4) : value < 1 ? value.toFixed(3) : value.toFixed(2); }
