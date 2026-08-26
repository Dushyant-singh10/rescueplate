import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { updateListingSchema } from "@/lib/validations/listing";

async function getOwnedAvailableListing(id: string, orgId: string) {
  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.donorOrgId, orgId)))
    .limit(1);
  return listing ?? null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "donor" || !session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const listing = await getOwnedAvailableListing(id, session.user.orgId);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.status !== "available") {
    return NextResponse.json(
      { error: "Only available listings can be edited" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = updateListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await db
    .update(listings)
    .set({
      title: parsed.data.title,
      description: parsed.data.description,
      foodType: parsed.data.foodType,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      allergens: parsed.data.allergens,
      pickupWindowStart: parsed.data.pickupWindowStart,
      pickupWindowEnd: parsed.data.pickupWindowEnd,
      claimExpiresAt: parsed.data.claimExpiresAt,
      safetyNotes: parsed.data.safetyNotes ?? null,
      urgencyHint: parsed.data.urgencyHint,
    })
    .where(eq(listings.id, id));

  return NextResponse.json({ id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "donor" || !session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const listing = await getOwnedAvailableListing(id, session.user.orgId);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.status !== "available") {
    return NextResponse.json(
      { error: "Only available listings can be cancelled" },
      { status: 409 }
    );
  }

  await db
    .update(listings)
    .set({ status: "cancelled" })
    .where(eq(listings.id, id));

  return NextResponse.json({ id });
}
