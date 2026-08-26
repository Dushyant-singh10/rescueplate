import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { findNearbyListings } from "@/lib/geo";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "receiver" || !session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [org] = await db
    .select({
      verificationStatus: organizations.verificationStatus,
      lat: organizations.lat,
      lng: organizations.lng,
    })
    .from(organizations)
    .where(eq(organizations.id, session.user.orgId))
    .limit(1);

  if (!org || org.verificationStatus !== "verified") {
    return NextResponse.json(
      { error: "Your organization must be verified to browse listings" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const radiusKm = Math.min(
    Math.max(parseFloat(searchParams.get("radius") ?? "10"), 1),
    100
  );

  const listings = await findNearbyListings(org.lat, org.lng, radiusKm);
  return NextResponse.json({ listings });
}
