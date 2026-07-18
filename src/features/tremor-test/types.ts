export const TEST_CONTEXTS = [
  {
    value: "before_medication",
    label: "Before medication",
    description: "Use this when the next dose has not been taken yet.",
  },
  {
    value: "after_medication",
    label: "After medication",
    description: "Use this after recording the dose time.",
  },
] as const;

export type TremorTestContext = (typeof TEST_CONTEXTS)[number]["value"];

export type TremorTestStep = "setup" | "instructions" | "ready";

export type AccelerationSample = {
  t: number;
  x: number;
  y: number;
  z: number;
};

export type RecordingQualityStatus = "valid" | "invalid";

export type RecordingQuality = {
  status: RecordingQualityStatus;
  sampleCount: number;
  durationMs: number;
  sampleRateHz: number;
  notes: string[];
};

export type SensorRecording = {
  context: TremorTestContext;
  startedAt: Date;
  completedAt: Date;
  samples: AccelerationSample[];
  quality: RecordingQuality;
  analysis: TremorAnalysisResult;
};

export type TremorSeverityLabel = "none" | "low" | "medium" | "high";

export type TremorAnalysisResult = {
  algorithmVersion: "signal-v1";
  severityClass: 0 | 1 | 2 | 3;
  severityLabel: TremorSeverityLabel;
  rmsIntensity: number;
  dominantFrequencyHz: number | null;
  tremorPower: number;
  spectralConcentration: number;
  windowCount: number;
  notes: string[];
};

export type MedicationResponseComparison = {
  beforePower: number;
  afterPower: number;
  beforeSeverityClass: number;
  afterSeverityClass: number;
  improvementPercent: number | null;
  status: "improved" | "unchanged" | "worse" | "not_comparable";
  message: string;
};
