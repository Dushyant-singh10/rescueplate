export type ScoreBreakdown = {
  distance: number;
  urgency: number;
  fairness: number;
  capacity: number;
};

export type ScoreResult = {
  total: number;
  breakdown: ScoreBreakdown;
};

// Tuned so distance and urgency dominate (fresher food, more pressing need),
// fairness prevents the same NGO from always winning, capacity avoids
// mismatched routing. Easy to retune; not learned from data.
const WEIGHTS = {
  distance: 0.35,
  urgency: 0.3,
  fairness: 0.2,
  capacity: 0.15,
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Closer = higher score. 0 at maxRadiusKm or beyond, 1 at the donor's doorstep. */
export function distanceScore(distanceKm: number, maxRadiusKm: number): number {
  if (maxRadiusKm <= 0) return 0;
  return clamp01(1 - distanceKm / maxRadiusKm);
}

/**
 * Blends a static urgency hint (e.g. from AI-parsed free text, default 0.5)
 * with time-decay as the claim deadline approaches — a listing expiring in
 * 20 minutes is more urgent than the same listing 8 hours out.
 */
export function urgencyScore(
  urgencyHint: number,
  now: Date,
  claimExpiresAt: Date,
  createdAt: Date
): number {
  const totalWindowMs = claimExpiresAt.getTime() - createdAt.getTime();
  if (totalWindowMs <= 0) return 1;
  const remainingMs = claimExpiresAt.getTime() - now.getTime();
  const timeDecay = clamp01(1 - remainingMs / totalWindowMs);
  return clamp01(0.5 * clamp01(urgencyHint) + 0.5 * timeDecay);
}

/** Fewer recent claims = higher score, so rotation favors under-served NGOs. */
export function fairnessScore(recentClaimCount: number): number {
  return 1 / (1 + Math.max(0, recentClaimCount));
}

/**
 * Hard-excluded candidates (insufficient capacity) never reach this function.
 * Among eligible candidates, rewards a right-sized match over dumping a small
 * listing on a receiver with far more capacity than it needs.
 */
export function capacityScore(quantity: number, capacityKg: number | null): number {
  if (capacityKg == null || capacityKg <= 0) return 0.5;
  return clamp01(quantity / capacityKg);
}

export function isCapacityEligible(
  quantity: number,
  unit: string,
  capacityKg: number | null
): boolean {
  const isKgUnit = /^kg/i.test(unit.trim());
  if (!isKgUnit || capacityKg == null) return true;
  return capacityKg >= quantity;
}

export function scoreCandidate(input: {
  distanceKm: number;
  maxRadiusKm: number;
  urgencyHint: number;
  now: Date;
  claimExpiresAt: Date;
  createdAt: Date;
  recentClaimCount: number;
  quantity: number;
  capacityKg: number | null;
}): ScoreResult {
  const breakdown: ScoreBreakdown = {
    distance: distanceScore(input.distanceKm, input.maxRadiusKm),
    urgency: urgencyScore(
      input.urgencyHint,
      input.now,
      input.claimExpiresAt,
      input.createdAt
    ),
    fairness: fairnessScore(input.recentClaimCount),
    capacity: capacityScore(input.quantity, input.capacityKg),
  };

  const total =
    breakdown.distance * WEIGHTS.distance +
    breakdown.urgency * WEIGHTS.urgency +
    breakdown.fairness * WEIGHTS.fairness +
    breakdown.capacity * WEIGHTS.capacity;

  return { total, breakdown };
}
