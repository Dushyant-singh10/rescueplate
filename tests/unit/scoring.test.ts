import { describe, expect, it } from "vitest";
import {
  distanceScore,
  urgencyScore,
  fairnessScore,
  capacityScore,
  isCapacityEligible,
  scoreCandidate,
} from "@/engine/scoring";

describe("distanceScore", () => {
  it("scores 1 at zero distance", () => {
    expect(distanceScore(0, 50)).toBe(1);
  });

  it("scores 0 at or beyond max radius", () => {
    expect(distanceScore(50, 50)).toBe(0);
    expect(distanceScore(100, 50)).toBe(0);
  });

  it("scores linearly in between", () => {
    expect(distanceScore(25, 50)).toBeCloseTo(0.5);
  });
});

describe("urgencyScore", () => {
  const createdAt = new Date("2026-01-01T00:00:00Z");
  const claimExpiresAt = new Date("2026-01-01T10:00:00Z");

  it("increases as the deadline approaches (time decay)", () => {
    const early = urgencyScore(0.5, new Date("2026-01-01T01:00:00Z"), claimExpiresAt, createdAt);
    const late = urgencyScore(0.5, new Date("2026-01-01T09:00:00Z"), claimExpiresAt, createdAt);
    expect(late).toBeGreaterThan(early);
  });

  it("blends in the static urgency hint", () => {
    const now = new Date("2026-01-01T05:00:00Z");
    const lowHint = urgencyScore(0, now, claimExpiresAt, createdAt);
    const highHint = urgencyScore(1, now, claimExpiresAt, createdAt);
    expect(highHint).toBeGreaterThan(lowHint);
  });

  it("treats a zero-length window as maximally urgent", () => {
    expect(urgencyScore(0.5, createdAt, createdAt, createdAt)).toBe(1);
  });
});

describe("fairnessScore", () => {
  it("is 1 with no recent claims", () => {
    expect(fairnessScore(0)).toBe(1);
  });

  it("decreases monotonically as recent claims grow", () => {
    const scores = [0, 1, 2, 5, 10].map(fairnessScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i - 1]);
    }
  });

  it("never goes negative for negative input", () => {
    expect(fairnessScore(-3)).toBe(1);
  });
});

describe("capacity", () => {
  it("excludes candidates with insufficient kg capacity", () => {
    expect(isCapacityEligible(20, "kg", 10)).toBe(false);
    expect(isCapacityEligible(20, "kg", 20)).toBe(true);
    expect(isCapacityEligible(20, "kg", 30)).toBe(true);
  });

  it("does not hard-filter non-kg units", () => {
    expect(isCapacityEligible(20, "trays", 5)).toBe(true);
  });

  it("does not hard-filter when capacity is unset", () => {
    expect(isCapacityEligible(20, "kg", null)).toBe(true);
  });

  it("rewards a right-sized match over an oversized one", () => {
    const snug = capacityScore(20, 20);
    const oversized = capacityScore(20, 200);
    expect(snug).toBeGreaterThan(oversized);
  });

  it("returns a neutral score when capacity is unknown", () => {
    expect(capacityScore(20, null)).toBe(0.5);
  });
});

describe("scoreCandidate", () => {
  it("produces a total between 0 and 1 with a full breakdown", () => {
    const result = scoreCandidate({
      distanceKm: 5,
      maxRadiusKm: 50,
      urgencyHint: 0.5,
      now: new Date("2026-01-01T05:00:00Z"),
      claimExpiresAt: new Date("2026-01-01T10:00:00Z"),
      createdAt: new Date("2026-01-01T00:00:00Z"),
      recentClaimCount: 1,
      quantity: 10,
      capacityKg: 20,
    });
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(1);
    expect(Object.keys(result.breakdown).sort()).toEqual(
      ["capacity", "distance", "fairness", "urgency"].sort()
    );
  });

  it("ranks a closer, less-served candidate above a farther, over-served one", () => {
    const base = {
      maxRadiusKm: 50,
      urgencyHint: 0.5,
      now: new Date("2026-01-01T05:00:00Z"),
      claimExpiresAt: new Date("2026-01-01T10:00:00Z"),
      createdAt: new Date("2026-01-01T00:00:00Z"),
      quantity: 10,
      capacityKg: 20,
    };
    const good = scoreCandidate({ ...base, distanceKm: 2, recentClaimCount: 0 });
    const worse = scoreCandidate({ ...base, distanceKm: 40, recentClaimCount: 10 });
    expect(good.total).toBeGreaterThan(worse.total);
  });
});
