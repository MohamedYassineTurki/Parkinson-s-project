import { subDays } from "date-fns";

import type { DoctorPatientSummary } from "./types";

const now = new Date();

export const demoDoctorPatients: DoctorPatientSummary[] = [
  {
    id: "p-104",
    name: "Yasmine Ben Ali",
    age: 62,
    medicationName: "Levodopa 100mg",
    medicationSchedule: ["08:00", "14:00", "20:00"],
    latestTestAt: subDays(now, 1).toISOString(),
    latestSeverityClass: 2,
    latestTremorPower: 31.8,
    latestImprovementPercent: 19.7,
    latestPersonalRange: "above_usual",
    latestPersonalDeviationPercent: 35.1,
    status: "review_suggested",
    alertMessage:
      "Recent after-medication tremor results are higher than this patient's earlier pattern.",
    trend: [
      { date: subDays(now, 26).toISOString(), beforePower: 31.8, afterPower: 12.4, improvementPercent: 61.0 },
      { date: subDays(now, 22).toISOString(), beforePower: 33.1, afterPower: 13.2, improvementPercent: 60.1 },
      { date: subDays(now, 18).toISOString(), beforePower: 32.7, afterPower: 14.1, improvementPercent: 56.9 },
      { date: subDays(now, 13).toISOString(), beforePower: 35.4, afterPower: 18.6, improvementPercent: 47.5 },
      { date: subDays(now, 8).toISOString(), beforePower: 36.8, afterPower: 23.4, improvementPercent: 36.4 },
      { date: subDays(now, 4).toISOString(), beforePower: 37.9, afterPower: 28.9, improvementPercent: 23.7 },
      { date: subDays(now, 1).toISOString(), beforePower: 39.6, afterPower: 31.8, improvementPercent: 19.7 },
    ],
  },
  {
    id: "p-205",
    name: "Sami Trabelsi",
    age: 58,
    medicationName: "Levodopa 100mg",
    medicationSchedule: ["07:30", "13:30", "19:30"],
    latestTestAt: subDays(now, 2).toISOString(),
    latestSeverityClass: 1,
    latestTremorPower: 9.7,
    latestImprovementPercent: 62.4,
    latestPersonalRange: "within_usual",
    latestPersonalDeviationPercent: 2.4,
    status: "stable",
    trend: [
      { date: subDays(now, 27).toISOString(), beforePower: 27.9, afterPower: 10.7, improvementPercent: 61.6 },
      { date: subDays(now, 21).toISOString(), beforePower: 26.2, afterPower: 9.9, improvementPercent: 62.2 },
      { date: subDays(now, 14).toISOString(), beforePower: 25.8, afterPower: 9.4, improvementPercent: 63.6 },
      { date: subDays(now, 7).toISOString(), beforePower: 25.3, afterPower: 9.2, improvementPercent: 63.6 },
      { date: subDays(now, 2).toISOString(), beforePower: 25.8, afterPower: 9.7, improvementPercent: 62.4 },
    ],
  },
];

export function getDoctorPatient(patientId: string) {
  return demoDoctorPatients.find((patient) => patient.id === patientId) ?? null;
}

export function getDoctorDashboardSummary(patients = demoDoctorPatients) {
  return {
    connectedPatients: patients.length,
    openAlerts: patients.filter((patient) => patient.status === "review_suggested").length,
    averageImprovementPercent:
      patients.reduce((sum, patient) => sum + patient.latestImprovementPercent, 0) /
      Math.max(patients.length, 1),
  };
}
