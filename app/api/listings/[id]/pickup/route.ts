import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { listings, claims } from "@/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "donor" || !session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orgId = session.user.orgId;

  const result = await db.transaction(async (tx) => {
    const [listing] = await tx
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), eq(listings.donorOrgId, orgId)))
      .for("update");

    if (!listing) {
      return { outcome: "not_found" as const };
    }
    if (listing.status !== "claimed") {
      return { outcome: "invalid_status" as const };
    }

    const [claim] = await tx
      .select({ id: claims.id })
      .from(claims)
      .where(and(eq(claims.listingId, id), eq(claims.status, "confirmed")))
      .limit(1);

    if (!claim) {
      return { outcome: "invalid_status" as const };
    }

    await tx
      .update(claims)
      .set({ status: "picked_up", pickedUpAt: new Date() })
      .where(eq(claims.id, claim.id));

    await tx
      .update(listings)
      .set({ status: "picked_up" })
      .where(eq(listings.id, id));

    return { outcome: "ok" as const };
  });

  if (result.outcome === "not_found") {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (result.outcome === "invalid_status") {
    return NextResponse.json(
      { error: "This listing has no active claim to confirm pickup for" },
      { status: 409 }
    );
  }

  return NextResponse.json({ id });
}
