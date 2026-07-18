import type {
  MedicationResponseComparison,
  SensorRecording,
} from "./types";

const NEAR_ZERO_POWER = 0.0001;
const MEANINGFUL_CHANGE_PERCENT = 10;

export function compareMedicationResponse(
  beforeRecording: SensorRecording | null | undefined,
  afterRecording: SensorRecording | null | undefined,
): MedicationResponseComparison | null {
  if (!beforeRecording || !afterRecording) {
    return null;
  }

  const beforePower = beforeRecording.analysis.tremorPower;
  const afterPower = afterRecording.analysis.tremorPower;

  if (
    beforeRecording.quality.status !== "valid" ||
    afterRecording.quality.status !== "valid"
  ) {
    return {
      beforePower,
      afterPower,
      beforeSeverityClass: beforeRecording.analysis.severityClass,
      afterSeverityClass: afterRecording.analysis.severityClass,
      improvementPercent: null,
      status: "not_comparable",
      message: "One or both recordings failed quality checks, so comparison is limited.",
    };
  }

  if (beforePower <= NEAR_ZERO_POWER) {
    return {
      beforePower,
      afterPower,
      beforeSeverityClass: beforeRecording.analysis.severityClass,
      afterSeverityClass: afterRecording.analysis.severityClass,
      improvementPercent: null,
      status: "not_comparable",
      message: "Before-medication tremor power is too low for a reliable percentage comparison.",
    };
  }

  const improvementPercent = ((beforePower - afterPower) / beforePower) * 100;

  if (improvementPercent > MEANINGFUL_CHANGE_PERCENT) {
    return {
      beforePower,
      afterPower,
      beforeSeverityClass: beforeRecording.analysis.severityClass,
      afterSeverityClass: afterRecording.analysis.severityClass,
      improvementPercent,
      status: "improved",
      message: "After-medication tremor power is lower than before-medication tremor power.",
    };
  }

  if (improvementPercent < -MEANINGFUL_CHANGE_PERCENT) {
    return {
      beforePower,
      afterPower,
      beforeSeverityClass: beforeRecording.analysis.severityClass,
      afterSeverityClass: afterRecording.analysis.severityClass,
      improvementPercent,
      status: "worse",
      message: "After-medication tremor power is higher than before-medication tremor power.",
    };
  }

  return {
    beforePower,
    afterPower,
    beforeSeverityClass: beforeRecording.analysis.severityClass,
    afterSeverityClass: afterRecording.analysis.severityClass,
    improvementPercent,
    status: "unchanged",
    message: "Before and after medication tremor power are similar for this pair.",
  };
}
