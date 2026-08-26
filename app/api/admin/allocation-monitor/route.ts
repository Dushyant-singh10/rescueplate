import { NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { claims, listings, organizations } from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activeListings = await db
    .select({
      id: listings.id,
      title: listings.title,
      quantity: listings.quantity,
      unit: listings.unit,
    })
    .from(listings)
    .where(eq(listings.status, "available"));

  if (activeListings.length === 0) {
    return NextResponse.json({ listings: [] });
  }

  const listingIds = activeListings.map((l) => l.id);

  const queueRows = await db
    .select({
      listingId: claims.listingId,
      claimId: claims.id,
      rank: claims.rank,
      status: claims.status,
      score: claims.score,
      respondBy: claims.respondBy,
      orgName: organizations.name,
    })
    .from(claims)
    .innerJoin(organizations, eq(claims.receiverOrgId, organizations.id))
    .where(inArray(claims.listingId, listingIds))
    .orderBy(asc(claims.rank));

  const byListing = new Map<string, typeof queueRows>();
  for (const row of queueRows) {
    const existing = byListing.get(row.listingId);
    if (existing) existing.push(row);
    else byListing.set(row.listingId, [row]);
  }

  const result = activeListings
    .map((l) => ({ ...l, queue: byListing.get(l.id) ?? [] }))
    .filter((l) => l.queue.length > 0);

  return NextResponse.json({ listings: result });
}
