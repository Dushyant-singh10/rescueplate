import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { listings, organizations } from "@/db/schema";
import { createListingSchema } from "@/lib/validations/listing";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "donor" || !session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [org] = await db
    .select({ verificationStatus: organizations.verificationStatus, lat: organizations.lat, lng: organizations.lng })
    .from(organizations)
    .where(eq(organizations.id, session.user.orgId))
    .limit(1);

  if (!org || org.verificationStatus !== "verified") {
    return NextResponse.json(
      { error: "Your organization must be verified before posting listings" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(listings)
    .values({
      donorOrgId: session.user.orgId,
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
      imageUrl: parsed.data.imageUrl ?? null,
      lat: org.lat,
      lng: org.lng,
    })
    .returning({ id: listings.id });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
