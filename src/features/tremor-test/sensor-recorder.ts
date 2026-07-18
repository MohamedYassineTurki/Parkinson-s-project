import type { AccelerationSample, RecordingQuality } from "./types";

const RECORDING_DURATION_MS = 10_000;
const MIN_SAMPLE_COUNT = 150;
const MIN_DURATION_MS = 9_000;
const MAX_DURATION_MS = 12_000;
const MAX_SPIKE_DELTA = 35;

type PermissionState = "granted" | "denied" | "unsupported";

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

export function isDeviceMotionSupported() {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

export async function requestMotionPermission(): Promise<PermissionState> {
  if (!isDeviceMotionSupported()) {
    return "unsupported";
  }

  const motionEvent = DeviceMotionEvent as DeviceMotionEventWithPermission;

  if (typeof motionEvent.requestPermission === "function") {
    return motionEvent.requestPermission();
  }

  return "granted";
}

export function recordAccelerometerSamples(
  onSample: (sample: AccelerationSample) => void,
  durationMs = RECORDING_DURATION_MS,
) {
  const samples: AccelerationSample[] = [];
  const startedAt = performance.now();

  function handleMotion(event: DeviceMotionEvent) {
    const acceleration =
      event.accelerationIncludingGravity ?? event.acceleration ?? undefined;

    if (
      acceleration?.x == null ||
      acceleration.y == null ||
      acceleration.z == null
    ) {
      return;
    }

    const sample = {
      t: performance.now() - startedAt,
      x: acceleration.x,
      y: acceleration.y,
      z: acceleration.z,
    };

    samples.push(sample);
    onSample(sample);
  }

  window.addEventListener("devicemotion", handleMotion);

  return new Promise<AccelerationSample[]>((resolve) => {
    window.setTimeout(() => {
      window.removeEventListener("devicemotion", handleMotion);
      resolve(samples);
    }, durationMs);
  });
}

export function evaluateRecordingQuality(samples: AccelerationSample[]): RecordingQuality {
  const notes: string[] = [];
  const sampleCount = samples.length;
  const durationMs =
    sampleCount > 1 ? samples[sampleCount - 1].t - samples[0].t : 0;
  const sampleRateHz = durationMs > 0 ? (sampleCount / durationMs) * 1000 : 0;

  if (sampleCount < MIN_SAMPLE_COUNT) {
    notes.push("Not enough accelerometer samples were captured.");
  }

  if (durationMs < MIN_DURATION_MS || durationMs > MAX_DURATION_MS) {
    notes.push("Recording duration was outside the expected 10-second window.");
  }

  if (hasLargeMotionSpike(samples)) {
    notes.push("Large movement spike detected; the phone may have shifted.");
  }

  return {
    status: notes.length === 0 ? "valid" : "invalid",
    sampleCount,
    durationMs,
    sampleRateHz,
    notes,
  };
}

function hasLargeMotionSpike(samples: AccelerationSample[]) {
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const delta =
      Math.abs(current.x - previous.x) +
      Math.abs(current.y - previous.y) +
      Math.abs(current.z - previous.z);

    if (delta > MAX_SPIKE_DELTA) {
      return true;
    }
  }

  return false;
}
