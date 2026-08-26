import { sql } from "drizzle-orm";
import { db } from "@/db";

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
  distanceKm: number;
};

/**
 * Haversine distance in a subquery (Postgres can't filter on a SELECT alias
 * directly), clamped into [-1, 1] before acos() to avoid NaN from floating
 * point drift when a listing is ~0km away.
 */
export async function findNearbyListings(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<NearbyListing[]> {
  const result = await db.execute(sql`
    select * from (
      select
        l.id, l.title, l.description, l.food_type as "foodType", l.quantity, l.unit,
        l.allergens, l.pickup_window_start as "pickupWindowStart", l.pickup_window_end as "pickupWindowEnd",
        l.claim_expires_at as "claimExpiresAt", l.donor_org_id as "donorOrgId", o.name as "donorName",
        (6371 * acos(least(1, greatest(-1,
          cos(radians(${lat})) * cos(radians(l.lat)) * cos(radians(l.lng) - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(l.lat))
        )))) as "distanceKm"
      from listings l
      join organizations o on o.id = l.donor_org_id
      where l.status = 'available' and l.claim_expires_at > now()
    ) as nearby
    where "distanceKm" <= ${radiusKm}
    order by "distanceKm" asc, "claimExpiresAt" asc
  `);
  return result.rows as unknown as NearbyListing[];
}
