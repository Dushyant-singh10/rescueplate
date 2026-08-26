import { sql } from "drizzle-orm";
import { db } from "@/db";

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two lat/lng points, in kilometers. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type NearbyListing = {
  id: string;
  title: string;
  description: string;
  foodType: string;
  quantity: number;
  unit: string;
  allergens: string[];
  pickupWindowStart: string;
  pickupWindowEnd: string;
  claimExpiresAt: string;
  donorOrgId: string;
  donorName: string;
  donorLat: number;
  donorLng: number;
  imageUrl: string | null;
  distanceKm: number;
  claimId: string | null;
  yourStatus: string | null;
  yourRank: number | null;
  respondBy: string | null;
  scoreBreakdown: { distance: number; urgency: number; fairness: number; capacity: number } | null;
};

/**
 * Haversine distance in a subquery (Postgres can't filter on a SELECT alias
 * directly), clamped into [-1, 1] before acos() to avoid NaN from floating
 * point drift when a listing is ~0km away. Left-joins the requesting org's
 * own claim row (if the allocation engine has queued/offered them one) so
 * the feed can show rank/status instead of a raw claimable list.
 */
export async function findNearbyListings(
  lat: number,
  lng: number,
  radiusKm: number,
  receiverOrgId: string
): Promise<NearbyListing[]> {
  const result = await db.execute(sql`
    select * from (
      select
        l.id, l.title, l.description, l.food_type as "foodType", l.quantity, l.unit,
        l.allergens, l.pickup_window_start as "pickupWindowStart", l.pickup_window_end as "pickupWindowEnd",
        l.claim_expires_at as "claimExpiresAt", l.donor_org_id as "donorOrgId", o.name as "donorName",
        l.lat as "donorLat", l.lng as "donorLng", l.image_url as "imageUrl",
        c.id as "claimId", c.status as "yourStatus", c.rank as "yourRank",
        c.respond_by as "respondBy", c.score_breakdown as "scoreBreakdown",
        (6371 * acos(least(1, greatest(-1,
          cos(radians(${lat})) * cos(radians(l.lat)) * cos(radians(l.lng) - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(l.lat))
        )))) as "distanceKm"
      from listings l
      join organizations o on o.id = l.donor_org_id
      left join claims c on c.listing_id = l.id and c.receiver_org_id = ${receiverOrgId}
      where l.status = 'available' and l.claim_expires_at > now()
    ) as nearby
    where "distanceKm" <= ${radiusKm}
    order by "distanceKm" asc, "claimExpiresAt" asc
  `);
  return result.rows as unknown as NearbyListing[];
}
