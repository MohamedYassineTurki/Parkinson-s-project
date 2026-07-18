export type HistoricalTestContext = "before_medication" | "after_medication";

export type HistoricalTestSession = {
  id: string;
  testedAt: string;
  context: HistoricalTestContext;
  medicationId: string | null;
  medicationName: string;
  tremorPower: number;
  severityClass: 0 | 1 | 2 | 3;
  severityLabel: "none" | "low" | "medium" | "high";
  qualityStatus: "valid" | "invalid";
  algorithmVersion: string;
  personalComparison?: PersonalComparison;
};

export type PersonalComparisonStatus =
  | "building_baseline"
  | "within_usual"
  | "above_usual"
  | "below_usual";

export type PersonalComparison = {
  status: PersonalComparisonStatus;
  baselineSessionCount: number;
  baselineMedianPower: number | null;
  deviationPercent: number | null;
  message: string;
};

export type HistoricalTestPair = {
  id: string;
  testedAt: string;
  medicationName: string;
  beforePower: number;
  afterPower: number;
  improvementPercent: number;
  qualityStatus: "valid" | "invalid";
  algorithmVersion: string;
};

export type TrendSummary = {
  latestSeverityClass: number | null;
  latestTremorPower: number | null;
  last7DayAveragePower: number | null;
  last30DayAveragePower: number | null;
  averageImprovementPercent: number | null;
  alertCandidate: boolean;
  latestPersonalComparison: PersonalComparison | null;
};
