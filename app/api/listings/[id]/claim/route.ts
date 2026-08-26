import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { listings, claims, organizations } from "@/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (
    !session?.user ||
    session.user.role !== "receiver" ||
    !session.user.orgId ||
    !session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [org] = await db
    .select({ verificationStatus: organizations.verificationStatus })
    .from(organizations)
    .where(eq(organizations.id, session.user.orgId))
    .limit(1);
  if (!org || org.verificationStatus !== "verified") {
    return NextResponse.json(
      { error: "Your organization must be verified to claim listings" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const receiverOrgId = session.user.orgId;
  const userId = session.user.id;

  const result = await db.transaction(async (tx) => {
    // Row-level lock: any concurrent claim on this listing blocks here until
    // this transaction commits or rolls back, so only one request can ever
    // see status "available" and win the claim.
    const [listing] = await tx
      .select()
      .from(listings)
      .where(eq(listings.id, id))
      .for("update");

    if (!listing) {
      return { outcome: "not_found" as const };
    }
    if (listing.status !== "available" || listing.claimExpiresAt.getTime() <= Date.now()) {
      return { outcome: "unavailable" as const };
    }

    await tx
      .update(listings)
      .set({ status: "claimed" })
      .where(eq(listings.id, id));

    const [claim] = await tx
      .insert(claims)
      .values({
        listingId: id,
        receiverOrgId,
        claimedByUserId: userId,
        status: "confirmed",
      })
      .returning({ id: claims.id });

    return { outcome: "claimed" as const, claimId: claim.id };
  });

  if (result.outcome === "not_found") {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (result.outcome === "unavailable") {
    return NextResponse.json(
      { error: "This listing has already been claimed or has expired" },
      { status: 409 }
    );
  }

  return NextResponse.json({ claimId: result.claimId }, { status: 201 });
}
