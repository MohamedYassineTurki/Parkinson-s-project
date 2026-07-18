type RecentComparison = {
  status: "building_baseline" | "within_usual" | "above_usual" | "below_usual" | "not_comparable";
  baselineSessionCount: number;
};

export function hasRepeatedAboveBaseline(comparisons: RecentComparison[]) {
  return comparisons.length >= 3 && comparisons
    .slice(0, 3)
    .every((item) => item.status === "above_usual" && item.baselineSessionCount >= 5);
}
