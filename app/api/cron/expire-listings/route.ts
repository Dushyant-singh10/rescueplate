import { NextResponse } from "next/server";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { listings, claims, organizations } from "@/db/schema";

const NO_SHOW_FLAG_THRESHOLD = 3;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const expiredListings = await db
    .update(listings)
    .set({ status: "expired" })
    .where(and(eq(listings.status, "available"), lt(listings.claimExpiresAt, now)))
    .returning({ id: listings.id });

  // Claims still "confirmed" after the listing's pickup window has closed
  // means nobody marked the handoff as picked up in time — treat as a no-show.
  const staleClaims = await db
    .select({
      claimId: claims.id,
      listingId: claims.listingId,
      receiverOrgId: claims.receiverOrgId,
    })
    .from(claims)
    .innerJoin(listings, eq(claims.listingId, listings.id))
    .where(and(eq(claims.status, "confirmed"), lt(listings.pickupWindowEnd, now)));

  for (const c of staleClaims) {
    await db.transaction(async (tx) => {
      await tx
        .update(claims)
        .set({ status: "no_show" })
        .where(eq(claims.id, c.claimId));

      // Pickup window is already closed, so the listing can't legitimately
      // go back to "available" — close it out as expired instead.
      await tx
        .update(listings)
        .set({ status: "expired" })
        .where(eq(listings.id, c.listingId));

      const [org] = await tx
        .update(organizations)
        .set({ noShowCount: sql`${organizations.noShowCount} + 1` })
        .where(eq(organizations.id, c.receiverOrgId))
        .returning({ noShowCount: organizations.noShowCount });

      if (org && org.noShowCount >= NO_SHOW_FLAG_THRESHOLD) {
        await tx
          .update(organizations)
          .set({ flagged: true })
          .where(eq(organizations.id, c.receiverOrgId));
      }
    });
  }

  return NextResponse.json({
    expiredListings: expiredListings.length,
    noShowsProcessed: staleClaims.length,
  });
}
