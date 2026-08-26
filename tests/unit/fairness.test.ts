import { describe, expect, it } from "vitest";
import { fairnessScore } from "@/engine/fairness";

describe("fairnessScore (re-exported)", () => {
  it("is highest with zero recent claims", () => {
    expect(fairnessScore(0)).toBe(1);
  });

  it("decreases monotonically as recent claim count grows", () => {
    let previous = fairnessScore(0);
    for (const count of [1, 2, 3, 4, 5]) {
      const current = fairnessScore(count);
      expect(current).toBeLessThan(previous);
      previous = current;
    }
  });

  it("approaches but never reaches zero", () => {
    expect(fairnessScore(1000)).toBeGreaterThan(0);
    expect(fairnessScore(1000)).toBeLessThan(0.01);
  });
});
