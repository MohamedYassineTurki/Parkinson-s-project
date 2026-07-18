"use client";

import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Hand,
  Pill,
  Play,
  RotateCcw,
  Smartphone,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { compareMedicationResponse } from "./comparison";
import {
  getDailyDosePairingStatuses,
  saveTremorRecording,
  type DailyDosePairingStatus,
} from "./actions";
import {
  evaluateRecordingQuality,
  isDeviceMotionSupported,
  RECORDING_DURATION_MS,
  recordAccelerometerSamples,
  requestMotionPermission,
} from "./sensor-recorder";
import { analyzeTremorSignal } from "./signal-processing";
import {
  TEST_CONTEXTS,
  type AccelerationSample,
  type MedicationResponseComparison,
  type SensorRecording,
  type TremorAnalysisResult,
  type TremorTestContext,
  type TremorTestStep,
} from "./types";
import { APP_SAFETY_NOTICE } from "@/lib/safety";
import { routes } from "@/lib/routes";

const protocolSteps = [
  "Sit down and keep both feet on the floor.",
  "Extend one arm forward with the palm facing upward.",
  "Place the smartphone flat on the palm.",
  "Keep the arm and phone still after pressing start.",
  "Hold the position for the full 10-second recording.",
];

type MedicationOption = { id: string; name: string; dose: string; scheduleTimes: string[] };

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
  const [medicationName, setMedicationName] = useState(
    medications[0] ? `${medications[0].name} ${medications[0].dose}` : "",
  );
  const [doseTime, setDoseTime] = useState(medications[0]?.scheduleTimes[0] ?? "");
  const [doseSlot, setDoseSlot] = useState(0);
  const [dailyDoseStatuses, setDailyDoseStatuses] = useState<DailyDosePairingStatus[]>([]);
  const [notes, setNotes] = useState("");
  const [recording, setRecording] = useState<SensorRecording | null>(null);
  const [recordingsByContext, setRecordingsByContext] = useState<
    Partial<Record<TremorTestContext, SensorRecording>>
  >({});
  const [saveState, setSaveState] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    message: string;
    sessionId?: string;
  }>({ status: "idle", message: "" });

  const selectedContext = useMemo(
    () => TEST_CONTEXTS.find((item) => item.value === context) ?? TEST_CONTEXTS[0],
    [context],
  );
  const comparison = useMemo(
    () =>
      compareMedicationResponse(
        recordingsByContext.before_medication,
        recordingsByContext.after_medication,
      ),
    [recordingsByContext],
  );

  useEffect(() => {
    let cancelled = false;
    void loadDailyDoseStatuses(medicationId).then((statuses) => {
      if (!cancelled) setDailyDoseStatuses(statuses);
    }).catch(() => {
      if (!cancelled) setDailyDoseStatuses([]);
    });
    return () => {
      cancelled = true;
    };
  }, [medicationId]);

  async function handleRecordingComplete(completedRecording: SensorRecording) {
    setRecording(completedRecording);
    setRecordingsByContext((current) => ({
      ...current,
      [completedRecording.context]: completedRecording,
    }));
    setSaveState({ status: "saving", message: "Saving test result..." });
    const result = await saveTremorRecording({
      medicationId,
      doseSlot,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      context: completedRecording.context,
      doseTime,
      notes,
      startedAt: completedRecording.startedAt.toISOString(),
      completedAt: completedRecording.completedAt.toISOString(),
      samples: completedRecording.samples,
      quality: completedRecording.quality,
      analysis: completedRecording.analysis,
    });
    if (result.ok) {
      setDailyDoseStatuses(await loadDailyDoseStatuses(medicationId));
      const pairingMessage = result.pairId
        ? "Result saved and paired with today's before-medication test for this dose."
        : completedRecording.context === "after_medication"
          ? "Result saved, but no valid before-medication test was found today for this medication and dose."
          : "Before-medication result saved. You can close the app and return after this same dose.";
      setSaveState({
        status: "saved",
        message: `${pairingMessage}${result.mlStatus === "success" ? " Experimental ML analysis completed." : " ML was unavailable, so the deterministic result was saved safely."}`,
        sessionId: result.sessionId,
      });
    } else {
      setSaveState({ status: "error", message: result.message });
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      <section className="rounded-2xl border border-[#dce7e9] bg-white p-5 shadow-[0_4px_18px_rgba(0,67,73,0.06)] sm:p-7">
        <StepHeader step={step} />
        <div className="mb-6 rounded-xl border border-[#dce7e9] bg-[#eef5f7] p-4 text-sm leading-6 text-[#3f484a]">
          {APP_SAFETY_NOTICE}
        </div>

        {step === "setup" ? (
          <SetupStep
            context={context}
            doseTime={doseTime}
            doseSlot={doseSlot}
            medicationId={medicationId}
            medications={medications}
            dailyDoseStatuses={dailyDoseStatuses}
            notes={notes}
            onContextChange={(nextContext) => {
              setContext(nextContext);
              setRecording(null);
            }}
            onDoseTimeChange={setDoseTime}
            onDoseSlotChange={(slot, time) => {
              setDoseSlot(slot);
              setDoseTime(time);
              setRecording(null);
              setRecordingsByContext({});
            }}
            onMedicationChange={(id, name) => {
              setMedicationId(id);
              setMedicationName(name);
              setDoseSlot(0);
              setDoseTime(medications.find((item) => item.id === id)?.scheduleTimes[0] ?? "");
              setRecording(null);
              setRecordingsByContext({});
              setSaveState({ status: "idle", message: "" });
            }}
            onNotesChange={setNotes}
            onNext={() => setStep("instructions")}
          />
        ) : null}

        {step === "instructions" ? (
          <InstructionsStep
            onBack={() => setStep("setup")}
            onNext={() => setStep("ready")}
          />
        ) : null}

        {step === "ready" ? (
          <ReadyStep
            context={context}
            onBack={() => setStep("instructions")}
            onRecordingComplete={handleRecordingComplete}
            onReset={() => setStep("setup")}
          />
        ) : null}
      </section>

      <aside className="rounded-2xl border border-[#dce7e9] bg-white p-5 shadow-[0_4px_18px_rgba(0,67,73,0.06)] sm:p-6">
        <h2 className="text-lg font-bold tracking-tight text-[#004349]">Test summary</h2>
        <dl className="mt-5 space-y-4">
          <SummaryItem label="Context" value={selectedContext.label} />
          <SummaryItem
            label="Medication"
            value={medicationName.trim() || "Not entered yet"}
          />
          <SummaryItem label="Dose time" value={doseTime || "Not entered yet"} />
          <SummaryItem label="Dose cycle" value={`Dose ${doseSlot + 1} of ${Math.max(medications.find((item) => item.id === medicationId)?.scheduleTimes.length ?? 0, 1)}`} />
          <SummaryItem label="Duration" value="10 seconds" />
          <SummaryItem
            label="Signal source"
            value="Smartphone accelerometer x/y/z"
          />
          <SummaryItem
            label="Last recording"
            value={
              recording
                ? `${recording.quality.sampleCount} samples, ${recording.quality.status}`
                : "Not recorded yet"
            }
          />
        </dl>

        <RecordedPairStatus
          dailyStatus={dailyDoseStatuses.find((item) => item.doseSlot === doseSlot)}
          doseSlot={doseSlot}
          recordingsByContext={recordingsByContext}
        />

        {comparison ? <ComparisonPanel comparison={comparison} /> : null}

        {saveState.status !== "idle" ? (
          <div className={`mt-5 rounded-lg border p-4 text-sm ${saveState.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-teal-200 bg-teal-50 text-teal-900"}`} role="status">
            <p>{saveState.message}</p>
            {saveState.sessionId ? <Link className="mt-2 inline-block font-semibold underline" href={routes.patient.result(saveState.sessionId)}>View saved result</Link> : null}
          </div>
        ) : null}

        {notes.trim() ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Patient notes</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{notes}</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function StepHeader({ step }: { step: TremorTestStep }) {
  const label =
    step === "setup"
      ? "Test setup"
      : step === "instructions"
        ? "Standardized position"
        : "Ready to record";

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#20686f]">Accelerometer test</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#161d1f]">{label}</h2>
      </div>
      <Smartphone className="size-7 text-slate-500" aria-hidden="true" />
    </div>
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
  onMedicationChange: (id: string, name: string) => void;
  onDoseTimeChange: (value: string) => void;
  onDoseSlotChange: (slot: number, time: string) => void;
  onNotesChange: (value: string) => void;
  onNext: () => void;
};

function SetupStep({
  context,
  medicationId,
  medications,
  dailyDoseStatuses,
  doseTime,
  doseSlot,
  notes,
  onContextChange,
  onMedicationChange,
  onDoseTimeChange,
  onDoseSlotChange,
  onNotesChange,
  onNext,
}: SetupStepProps) {
  const selectedMedication = medications.find((item) => item.id === medicationId);
  const doseTimes = selectedMedication?.scheduleTimes.length ? selectedMedication.scheduleTimes : [""];
  const selectedDailyStatus = dailyDoseStatuses.find((item) => item.doseSlot === doseSlot);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {TEST_CONTEXTS.map((item) => (
          <button
            className={`rounded-lg border p-4 text-left ${
              context === item.value
                ? "border-[#004349] bg-[#eef5f7] ring-2 ring-[#bbeacf]"
                : "border-[#bfc8c9] bg-white hover:border-[#004349]"
            }`}
            key={item.value}
            onClick={() => onContextChange(item.value)}
            type="button"
          >
            <Pill className="size-5 text-teal-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-950">{item.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#8fd1d9] bg-[#eef5f7] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#004349]">Choose the dose you are tracking</p>
            <p className="mt-1 text-sm leading-6 text-[#3f484a]">Use the same dose number for both tests. Your after-medication test will pair with this before-medication test.</p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#244f3a]">Dose {doseSlot + 1} / {doseTimes.length}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {doseTimes.map((time, index) => (
            <button className={`min-h-14 rounded-xl border px-3 py-2 text-left ${doseSlot === index ? "border-[#004349] bg-white ring-2 ring-[#bbeacf]" : "border-[#bfc8c9] bg-white/60"}`} key={`${index}-${time}`} onClick={() => onDoseSlotChange(index, time)} type="button">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#6f797a]">Dose {index + 1}</span>
              <span className="mt-1 block text-sm font-bold text-[#161d1f]">{time || "Time not set"}</span>
              {dailyDoseStatuses.some((item) => item.doseSlot === index) ? (
                <span className="mt-1 block text-[11px] font-semibold text-[#20686f]">
                  {dailyDoseStatuses.find((item) => item.doseSlot === index)?.pairId
                    ? "Paired today"
                    : dailyDoseStatuses.find((item) => item.doseSlot === index)?.before
                      ? "Before saved today"
                      : "After saved today"}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {context === "after_medication" ? (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${selectedDailyStatus?.before ? "bg-[#bbeacf] text-[#244f3a]" : "bg-amber-50 text-amber-900"}`} role="status">
            {selectedDailyStatus?.before
              ? `Before-medication test found for Dose ${doseSlot + 1} today. Your after test will be linked automatically.`
              : `No valid before-medication test has been saved for Dose ${doseSlot + 1} today yet.`}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="medication">
            Medication
          </label>
          <select
            className="mt-2 min-h-12 w-full rounded-xl border border-[#bfc8c9] bg-white px-4 text-base outline-none focus:border-[#004349] focus:ring-2 focus:ring-[#bbeacf]"
            id="medication"
            onChange={(event) => {
              const selected = medications.find((item) => item.id === event.target.value);
              onMedicationChange(event.target.value, selected ? `${selected.name} ${selected.dose}` : "");
            }}
            value={medicationId}
          >
            {medications.length === 0 ? <option value="">Add an active medication first</option> : medications.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.dose}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="dose-time">
            {context === "after_medication" ? "When did you take this dose?" : "Scheduled dose time"}
          </label>
          <input
            className="mt-2 min-h-12 w-full rounded-xl border border-[#bfc8c9] bg-white px-4 text-base outline-none focus:border-[#004349] focus:ring-2 focus:ring-[#bbeacf]"
            id="dose-time"
            onChange={(event) => onDoseTimeChange(event.target.value)}
            type="time"
            value={doseTime}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-slate-700" htmlFor="test-notes">
          Notes
        </label>
        <textarea
          className="mt-2 min-h-28 w-full rounded-xl border border-[#bfc8c9] bg-white px-4 py-3 text-base outline-none focus:border-[#004349] focus:ring-2 focus:ring-[#bbeacf]"
          id="test-notes"
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Optional: sleep, stress, caffeine, missed dose, unusual symptoms."
          value={notes}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#004349] px-6 text-sm font-bold text-white hover:bg-[#0d5c63]"
          disabled={!medicationId}
          onClick={onNext}
          type="button"
        >
          Continue
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function InstructionsStep({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-[#dce7e9] bg-[#eef5f7] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#004349] text-white">
            <Hand className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Standardized phone position
            </p>
            <p className="mt-1 text-sm text-slate-600">
              The same position should be used for every test.
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-3">
          {protocolSteps.map((item, index) => (
            <li className="flex gap-3 text-sm leading-6 text-slate-700" key={item}>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-teal-700">
                {index + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#6f797a] bg-white px-5 text-sm font-bold text-[#004349] hover:bg-[#eef5f7]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#004349] px-5 text-sm font-bold text-white hover:bg-[#0d5c63]"
          onClick={onNext}
          type="button"
        >
          I am in position
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ReadyStep({
  context,
  onBack,
  onRecordingComplete,
  onReset,
}: {
  context: TremorTestContext;
  onBack: () => void;
  onRecordingComplete: (recording: SensorRecording) => Promise<void>;
  onReset: () => void;
}) {
  const [status, setStatus] = useState<
    "idle" | "requesting_permission" | "recording" | "processing" | "complete" | "error"
  >("idle");
  const [samples, setSamples] = useState<AccelerationSample[]>([]);
  const [recording, setRecording] = useState<SensorRecording | null>(null);
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
    setRecording(null);
    setSamples([]);

    if (!isDeviceMotionSupported()) {
      setStatus("error");
      setError("This browser does not support DeviceMotion accelerometer events.");
      return;
    }

    setStatus("requesting_permission");
    const permission = await requestMotionPermission();

    if (permission !== "granted") {
      setStatus("error");
      setError("Motion permission was not granted.");
      return;
    }

    const startedAt = new Date();
    const clockStartedAt = performance.now();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setElapsedMs(0);
    setStatus("recording");
    clockIdRef.current = window.setInterval(() => {
      setElapsedMs(Math.min(performance.now() - clockStartedAt, RECORDING_DURATION_MS));
    }, 50);
    const recordedSamples = await recordAccelerometerSamples((sample) => {
      setSamples((current) => [...current, sample]);
    }, RECORDING_DURATION_MS, controller.signal);
    if (clockIdRef.current != null) window.clearInterval(clockIdRef.current);
    clockIdRef.current = null;
    abortControllerRef.current = null;

    if (controller.signal.aborted) {
      setSamples([]);
      setElapsedMs(0);
      setStatus("error");
      setError("Recording stopped. When you are ready, keep the phone steady and start again.");
      return;
    }

    setElapsedMs(RECORDING_DURATION_MS);
    const completedAt = new Date();
    const quality = evaluateRecordingQuality(recordedSamples);
    const analysis = analyzeTremorSignal(recordedSamples);
    const completedRecording = {
      context,
      startedAt,
      completedAt,
      samples: recordedSamples,
      quality,
      analysis,
    };

    setRecording(completedRecording);
    setStatus("processing");
    await onRecordingComplete(completedRecording);
    setStatus("complete");
  }

  const elapsedSeconds = elapsedMs / 1000;
  const progressPercent = Math.round((elapsedMs / RECORDING_DURATION_MS) * 100);

  function stopRecording() {
    abortControllerRef.current?.abort();
  }

  return (
    <div>
      {status === "recording" || status === "processing" ? (
        <RecordingOverlay
          elapsedMs={elapsedMs}
          onStop={stopRecording}
          processing={status === "processing"}
          sampleCount={samples.length}
        />
      ) : null}
      <div className="rounded-2xl border border-[#bbeacf] bg-[#eef5f7] p-6 text-center">
        <CheckCircle2 className="size-7 text-teal-700" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold tracking-tight text-[#004349]">
          Position confirmed
        </h2>
        <p className="mt-2 text-sm leading-6 text-teal-900">
          Keep the smartphone flat on your palm and press start. The browser will
          request motion permission before recording.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-[#dce7e9] bg-white p-5">
        <div className="flex items-center gap-3">
          <Clock className="size-5 text-teal-700" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700">
            Recording duration: 10 seconds
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#dce7e9] bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Accelerometer recorder
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Captures timestamped x, y, z motion samples from DeviceMotion events.
            </p>
          </div>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#004349] px-5 text-sm font-bold text-white hover:bg-[#0d5c63] disabled:cursor-not-allowed disabled:bg-[#9aa7a8]"
            disabled={status === "requesting_permission" || status === "recording" || status === "processing"}
            onClick={startRecording}
            type="button"
          >
            <Play className="size-4" aria-hidden="true" />
            {status === "recording" ? "Recording..." : "Start recording"}
          </button>
        </div>

        {status === "requesting_permission" ? (
          <p className="mt-4 text-sm text-slate-600">Requesting motion permission...</p>
        ) : null}

        {status === "recording" ? (
          <div className="mt-5">
            <div className="h-3 overflow-hidden rounded-full bg-[#e2e9ec]">
              <div
                className="h-full rounded-full bg-[#004349] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {elapsedSeconds.toFixed(1)}s captured, {samples.length} samples
            </p>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="size-5 shrink-0 text-red-600" aria-hidden="true" />
              <p className="text-sm leading-6 text-red-900">{error}</p>
            </div>
          </div>
        ) : null}

        {recording ? <RecordingResult recording={recording} /> : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#6f797a] bg-white px-5 text-sm font-bold text-[#004349] hover:bg-[#eef5f7]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#6f797a] bg-white px-5 text-sm font-bold text-[#004349] hover:bg-[#eef5f7]"
          onClick={onReset}
          type="button"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Retake this dose
        </button>
      </div>
    </div>
  );
}

function RecordingOverlay({
  elapsedMs,
  onStop,
  processing,
  sampleCount,
}: {
  elapsedMs: number;
  onStop: () => void;
  processing: boolean;
  sampleCount: number;
}) {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(elapsedMs / RECORDING_DURATION_MS, 1);
  const remainingSeconds = Math.max(0, Math.ceil((RECORDING_DURATION_MS - elapsedMs) / 1000));

  return (
    <div className="fixed inset-0 z-[100] flex min-h-[100dvh] flex-col overflow-hidden bg-[#f4fafd] px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(40px,env(safe-area-inset-top))] text-[#161d1f]">
      <div className="steady-recorder-glow pointer-events-none absolute left-1/2 top-1/2 size-[125vw] max-h-[680px] max-w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#bbeacf]/40 blur-[90px]" />

      <header className="relative mx-auto w-full max-w-md text-center">
        <p className="text-2xl font-semibold leading-8 tracking-[-0.02em] text-[#004349]">Hold your phone steady</p>
        <p className="mt-2 text-base leading-6 text-[#3f484a]">in your dominant hand.</p>
      </header>

      <div className="relative mx-auto flex flex-1 items-center justify-center py-8">
        <div className="relative flex size-[min(74vw,300px)] items-center justify-center">
          <svg className="absolute inset-0 size-full drop-shadow-sm" viewBox="0 0 260 260" aria-hidden="true">
            <circle cx="130" cy="130" fill="none" r={radius} stroke="#e2e9ec" strokeWidth="8" />
            <circle
              cx="130"
              cy="130"
              fill="none"
              r={radius}
              stroke="#004349"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * progress}
              strokeLinecap="round"
              strokeWidth="10"
              style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 80ms linear" }}
            />
          </svg>

          <div className="absolute inset-[18%] overflow-hidden rounded-full">
            <svg className="steady-recorder-wave absolute left-1/2 top-1/2 h-24 w-[150%] -translate-x-1/2 -translate-y-1/2 opacity-70" fill="none" viewBox="0 0 240 100" aria-hidden="true">
              <path d="M-20 50 Q20 42 40 50 T100 50 T160 50 T220 50 T260 50" stroke="#a2d1b6" strokeLinecap="round" strokeWidth="4" />
              <path d="M-20 50 Q20 58 40 50 T100 50 T160 50 T220 50 T260 50" opacity=".55" stroke="#8fd1d9" strokeLinecap="round" strokeWidth="2" />
              <path d="M-20 50 Q20 46 40 50 T100 50 T160 50 T220 50 T260 50" opacity=".35" stroke="#3c6751" strokeLinecap="round" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="relative flex flex-col items-center justify-center text-center">
            <span className="text-[44px] font-bold leading-none tracking-[-0.04em] text-[#004349]">
              {processing ? "Done" : remainingSeconds}
            </span>
            <span className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#3f484a]">
              {processing ? "Processing" : "Seconds"}
            </span>
            <span className="sr-only">{sampleCount} accelerometer samples captured</span>
          </div>
        </div>
      </div>

      <footer className="relative mx-auto w-full max-w-md">
        {processing ? (
          <div className="flex min-h-14 w-full items-center justify-center rounded-full border border-[#bfc8c9] bg-white/70 px-6 text-sm font-semibold text-[#004349]">
            Analyzing and saving securely…
          </div>
        ) : (
          <button className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full border-2 border-[#ba1a1a] bg-transparent px-6 text-sm font-semibold text-[#ba1a1a] transition active:scale-[0.98] active:bg-[#ffdad6]" onClick={onStop} type="button">
            <X className="size-5" aria-hidden="true" />
            Stop Recording
          </button>
        )}
      </footer>
    </div>
  );
}

function RecordingResult({ recording }: { recording: SensorRecording }) {
  const { analysis, quality } = recording;

  return (
    <div
      className={`mt-5 rounded-lg border p-4 ${
        quality.status === "valid"
          ? "border-teal-200 bg-teal-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {quality.status === "valid" ? (
          <CheckCircle2 className="size-5 shrink-0 text-teal-700" aria-hidden="true" />
        ) : (
          <AlertTriangle className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
        )}
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {quality.status === "valid"
              ? "Recording quality looks usable"
              : "Recording should be repeated"}
          </p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <Metric label="Samples" value={String(quality.sampleCount)} />
            <Metric
              label="Duration"
              value={`${(quality.durationMs / 1000).toFixed(1)}s`}
            />
            <Metric
              label="Sample rate"
              value={`${quality.sampleRateHz.toFixed(1)} Hz`}
            />
          </dl>
          {quality.notes.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm leading-6 text-slate-700">
              {quality.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <TremorAnalysisPanel analysis={analysis} />
    </div>
  );
}

function TremorAnalysisPanel({ analysis }: { analysis: TremorAnalysisResult }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Waves className="size-5 shrink-0 text-teal-700" aria-hidden="true" />
        <div className="w-full">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Signal analysis
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Deterministic accelerometer analysis, not a diagnosis.
              </p>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {analysis.algorithmVersion}
            </span>
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Metric
              label="Severity"
              value={`${analysis.severityClass} - ${analysis.severityLabel}`}
            />
            <Metric
              label="Dominant frequency"
              value={
                analysis.dominantFrequencyHz == null
                  ? "Not detected"
                  : `${analysis.dominantFrequencyHz.toFixed(2)} Hz`
              }
            />
            <Metric label="Analysis windows" value={String(analysis.windowCount)} />
            <Metric label="Tremor-like windows" value={`${analysis.tremorWindowPercent.toFixed(0)}%`} />
            <Metric label="Tremor power" value={analysis.tremorPower.toFixed(2)} />
            <Metric label="RMS intensity" value={analysis.rmsIntensity.toFixed(2)} />
            <Metric
              label="Spectral concentration"
              value={`${Math.round(analysis.spectralConcentration * 100)}%`}
            />
            <Metric label="Sliding windows" value={String(analysis.windowCount)} />
          </div>

          {analysis.notes.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
              {analysis.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function RecordedPairStatus({
  dailyStatus,
  doseSlot,
  recordingsByContext,
}: {
  dailyStatus: DailyDosePairingStatus | undefined;
  doseSlot: number;
  recordingsByContext: Partial<Record<TremorTestContext, SensorRecording>>;
}) {
  const before = recordingsByContext.before_medication;
  const after = recordingsByContext.after_medication;
  const beforeValue = before
    ? `${before.analysis.severityClass} - ${before.analysis.severityLabel}`
    : dailyStatus?.before
      ? "Saved today"
      : "Missing";
  const afterValue = after
    ? `${after.analysis.severityClass} - ${after.analysis.severityLabel}`
    : dailyStatus?.after
      ? "Saved today"
      : "Missing";

  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Dose {doseSlot + 1} comparison pair</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Today · saved securely across app sessions</p>
        </div>
        {dailyStatus?.pairId ? <span className="rounded-full bg-[#bbeacf] px-3 py-1 text-xs font-bold text-[#244f3a]">Paired</span> : null}
      </div>
      <div className="mt-3 grid gap-3 text-sm">
        <PairStatusItem label="Before medication" value={beforeValue} />
        <PairStatusItem label="After medication" value={afterValue} />
      </div>
    </div>
  );
}

function PairStatusItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-600">{label}</span>
      <span className="text-right font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function ComparisonPanel({
  comparison,
}: {
  comparison: MedicationResponseComparison;
}) {
  const improvementLabel =
    comparison.improvementPercent == null
      ? "Not available"
      : `${comparison.improvementPercent.toFixed(1)}%`;
  const statusLabel = {
    improved: "Improved",
    unchanged: "Similar",
    worse: "Higher after medication",
    not_comparable: "Limited comparison",
  }[comparison.status];

  return (
    <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4">
      <div className="flex items-start gap-3">
        <BarChart3 className="size-5 shrink-0 text-teal-700" aria-hidden="true" />
        <div className="w-full">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-950">
                Before/after comparison
              </p>
              <p className="mt-1 text-sm leading-6 text-teal-900">
                {comparison.message}
              </p>
            </div>
            <span className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-teal-800">
              {statusLabel}
            </span>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Metric label="Before power" value={comparison.beforePower.toFixed(2)} />
            <Metric label="After power" value={comparison.afterPower.toFixed(2)} />
            <Metric
              label="Before severity"
              value={String(comparison.beforeSeverityClass)}
            />
            <Metric
              label="After severity"
              value={String(comparison.afterSeverityClass)}
            />
            <Metric label="Improvement" value={improvementLabel} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 pb-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
