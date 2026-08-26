import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, organizations } from "@/db/schema";
import { haversineKm } from "@/lib/geo";
import { scoreCandidate, isCapacityEligible, type ScoreBreakdown } from "./scoring";
import { getRecentClaimCounts } from "./fairness";

const MAX_RADIUS_KM = 50;

export type RankedCandidate = {
  receiverOrgId: string;
  rank: number;
  score: number;
  breakdown: ScoreBreakdown;
};

/**
 * Ranks every verified receiver within range of a listing by the composite
 * score (distance, urgency, fairness, capacity). Receivers that fail the
 * hard capacity check are excluded entirely, not just down-scored.
 */
export async function rankCandidates(listingId: string): Promise<RankedCandidate[]> {
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!listing) return [];

  const receivers = await db
    .select({
      id: organizations.id,
      lat: organizations.lat,
      lng: organizations.lng,
      capacityKg: organizations.capacityKg,
    })
    .from(organizations)
    .where(
      and(
        eq(organizations.type, "receiver_ngo"),
        eq(organizations.verificationStatus, "verified")
      )
    );

  const eligible = receivers
    .map((r) => ({ ...r, distanceKm: haversineKm(listing.lat, listing.lng, r.lat, r.lng) }))
    .filter((r) => r.distanceKm <= MAX_RADIUS_KM)
    .filter((r) => isCapacityEligible(listing.quantity, listing.unit, r.capacityKg));

  if (eligible.length === 0) return [];

  const recentCounts = await getRecentClaimCounts(eligible.map((r) => r.id));
  const now = new Date();

  const scored = eligible.map((r) => {
    const { total, breakdown } = scoreCandidate({
      distanceKm: r.distanceKm,
      maxRadiusKm: MAX_RADIUS_KM,
      urgencyHint: listing.urgencyHint,
      now,
      claimExpiresAt: listing.claimExpiresAt,
      createdAt: listing.createdAt,
      recentClaimCount: recentCounts.get(r.id) ?? 0,
      quantity: listing.quantity,
      capacityKg: r.capacityKg,
    });
    return { receiverOrgId: r.id, score: total, breakdown };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
