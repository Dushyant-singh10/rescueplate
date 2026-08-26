import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { claims, listings } from "@/db/schema";
import { rankCandidates } from "@/engine/ranking";
import { advanceQueue } from "@/engine/claimWindow";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "donor" || !session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [listing] = await db
    .select({ id: listings.id, status: listings.status })
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.donorOrgId, session.user.orgId)))
    .limit(1);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.status !== "available") {
    return NextResponse.json(
      { error: "This listing is not open for allocation" },
      { status: 409 }
    );
  }

  const [existing] = await db
    .select({ id: claims.id })
    .from(claims)
    .where(eq(claims.listingId, id))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "This listing has already been allocated" },
      { status: 409 }
    );
  }

  const ranked = await rankCandidates(id);
  if (ranked.length === 0) {
    await db.update(listings).set({ status: "expired" }).where(eq(listings.id, id));
    return NextResponse.json({ candidateCount: 0 });
  }

  await db.transaction(async (tx) => {
    await tx.insert(claims).values(
      ranked.map((c) => ({
        listingId: id,
        receiverOrgId: c.receiverOrgId,
        status: "pending" as const,
        rank: c.rank,
        score: c.score,
        scoreBreakdown: c.breakdown,
      }))
    );
    await advanceQueue(tx, id);
  });

  return NextResponse.json({ candidateCount: ranked.length });
}
