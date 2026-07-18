import type { UserRole } from "@/lib/auth/roles";

export const routes = {
  home: "/",
  forbidden: "/forbidden",
  auth: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
  },
  patient: {
    root: "/patient",
    onboarding: "/patient/onboarding",
    privacy: "/patient/privacy",
    medications: "/patient/medications",
    test: "/patient/test",
    result: (resultId: string) => `/patient/results/${resultId}`,
    history: "/patient/history",
  },
  doctor: {
    root: "/doctor",
    onboarding: "/doctor/onboarding",
    patients: "/doctor/patients",
    patientDetail: (patientId: string) => `/doctor/patients/${patientId}`,
  },
} as const;

export function getDefaultRouteForRole(role: UserRole) {
  return role === "patient" ? routes.patient.root : routes.doctor.root;
}
