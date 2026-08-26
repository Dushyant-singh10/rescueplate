import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { claims, listings } from "@/db/schema";
import { advanceQueue, isOfferExpired } from "@/engine/claimWindow";

const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

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

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const receiverOrgId = session.user.orgId;
  const userId = session.user.id;

  const result = await db.transaction(async (tx) => {
    const [claim] = await tx
      .select()
      .from(claims)
      .where(eq(claims.id, id))
      .for("update");

    if (!claim || claim.receiverOrgId !== receiverOrgId) {
      return { outcome: "not_found" as const };
    }
    if (claim.status !== "offered" || !claim.respondBy) {
      return { outcome: "not_offered" as const };
    }
    if (isOfferExpired(claim.respondBy, new Date())) {
      await tx.update(claims).set({ status: "expired" }).where(eq(claims.id, id));
      await advanceQueue(tx, claim.listingId);
      return { outcome: "expired" as const };
    }

    if (parsed.data.action === "decline") {
      await tx
        .update(claims)
        .set({ status: "declined" })
        .where(eq(claims.id, id));
      await advanceQueue(tx, claim.listingId);
      return { outcome: "declined" as const };
    }

    const [listing] = await tx
      .select({ id: listings.id, status: listings.status })
      .from(listings)
      .where(eq(listings.id, claim.listingId))
      .for("update");

    if (!listing || listing.status !== "available") {
      return { outcome: "expired" as const };
    }

    await tx
      .update(listings)
      .set({ status: "claimed" })
      .where(eq(listings.id, claim.listingId));
    await tx
      .update(claims)
      .set({ status: "confirmed", claimedByUserId: userId })
      .where(eq(claims.id, id));

    return { outcome: "accepted" as const };
  });

  if (result.outcome === "not_found") {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }
  if (result.outcome === "not_offered" || result.outcome === "expired") {
    return NextResponse.json(
      { error: "This offer is no longer active" },
      { status: 409 }
    );
  }

  return NextResponse.json({ status: result.outcome });
}
