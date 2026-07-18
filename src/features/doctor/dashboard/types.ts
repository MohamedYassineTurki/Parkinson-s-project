export type DoctorPatientStatus = "stable" | "review_suggested";

export type DoctorPatientSummary = {
  id: string;
  name: string;
  age: number;
  medicationName: string;
  medicationSchedule: string[];
  latestTestAt: string;
  latestSeverityClass: 0 | 1 | 2 | 3;
  latestTremorPower: number;
  latestImprovementPercent: number;
  latestPersonalRange: "building_baseline" | "within_usual" | "above_usual" | "below_usual" | "no_baseline";
  latestPersonalDeviationPercent: number | null;
  status: DoctorPatientStatus;
  alertMessage?: string;
  trend: Array<{
    date: string;
    beforePower: number;
    afterPower: number;
    improvementPercent: number;
  }>;
};
