export type ComparisonGuidance = {
  tone: "lower" | "similar" | "higher";
  label: string;
  differenceLabel: string;
  summary: string;
  nextStep: string;
  doctorAdvice: string;
};

export function getComparisonGuidance(improvementPercent: number | null): ComparisonGuidance {
  if (improvementPercent == null || !Number.isFinite(improvementPercent)) {
    return {
      tone: "similar",
      label: "Percentage unavailable",
      differenceLabel: "Not available",
      summary: "A reliable percentage could not be calculated for this pair.",
      nextStep: "Repeat the test later using the same position and the same dose number.",
      doctorAdvice: "Doctor contact: this result alone does not indicate that you need to contact your doctor.",
    };
  }

  const rounded = Math.abs(improvementPercent).toFixed(0);
  if (improvementPercent >= 30) {
    return {
      tone: "lower",
      label: "Clearly lower movement",
      differenceLabel: `${rounded}% lower`,
      summary: `Movement was ${rounded}% lower after this dose than before it.`,
      nextStep: "This dose was followed by a clear reduction in this measurement. Continue tracking future doses to see whether the pattern repeats.",
      doctorAdvice: "Doctor contact: not needed because of this result alone.",
    };
  }
  if (improvementPercent >= 10) {
    return {
      tone: "lower",
      label: "Moderately lower movement",
      differenceLabel: `${rounded}% lower`,
      summary: `Movement was ${rounded}% lower after this dose than before it.`,
      nextStep: "A moderate reduction was measured. Continue your usual tracking so the app can determine whether this is a consistent pattern.",
      doctorAdvice: "Doctor contact: not needed because of this result alone.",
    };
  }
  if (improvementPercent > -10) {
    return {
      tone: "similar",
      label: "No clear change",
      differenceLabel: `${rounded}% ${improvementPercent > 0 ? "lower" : improvementPercent < 0 ? "higher" : "change"}`,
      summary: `Movement changed by only ${rounded}% after this dose, so the two measurements are similar.`,
      nextStep: "Keep tracking at the same medication times. One similar pair does not show whether the medication effect has changed.",
      doctorAdvice: "Doctor contact: not needed because of this result alone. Contact your clinician if your real symptoms feel worse despite the measurement.",
    };
  }
  if (improvementPercent > -30) {
    return {
      tone: "higher",
      label: "Moderately higher movement",
      differenceLabel: `${rounded}% higher`,
      summary: `Movement was ${rounded}% higher after this dose than before it.`,
      nextStep: "Repeat the test under the same conditions. Stress, position, activity, sleep, and dose timing can affect a single measurement.",
      doctorAdvice: "Doctor contact: not urgent from one test. Contact your doctor if another valid test is also higher or your symptoms feel worse.",
    };
  }
  return {
    tone: "higher",
    label: "Clearly higher movement",
    differenceLabel: `${rounded}% higher`,
    summary: `Movement was ${rounded}% higher after this dose than before it.`,
    nextStep: "Repeat the test once in the same position. Do not use this phone result by itself to judge whether the medication is working.",
    doctorAdvice: "Doctor contact: if the repeat is also clearly higher, or your movement symptoms are noticeably worse, contact your doctor or Parkinson’s nurse soon.",
  };
}
