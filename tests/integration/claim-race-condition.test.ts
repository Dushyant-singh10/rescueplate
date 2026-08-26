import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, users, listings, claims } from "@/db/schema";

let sessionOrgId = "";
let sessionUserId = "";

vi.mock("@/auth", () => ({
  auth: () =>
    Promise.resolve({
      user: { id: sessionUserId, role: "receiver", orgId: sessionOrgId },
    }),
}));

const { POST } = await import("@/app/api/claims/[id]/respond/route");

describe("claim accept race condition", () => {
  let donorOrgId: string;
  let receiverOrgId: string;
  let listingId: string;
  let claimId: string;
  let userId: string;

  beforeEach(async () => {
    const [donor] = await db
      .insert(organizations)
      .values({
        name: "Race Test Donor",
        type: "donor_business",
        address: "x",
        lat: 0,
        lng: 0,
        verificationStatus: "verified",
      })
      .returning({ id: organizations.id });
    donorOrgId = donor.id;

    const [receiver] = await db
      .insert(organizations)
      .values({
        name: "Race Test Receiver",
        type: "receiver_ngo",
        address: "x",
        lat: 0,
        lng: 0,
        verificationStatus: "verified",
      })
      .returning({ id: organizations.id });
    receiverOrgId = receiver.id;
    sessionOrgId = receiverOrgId;

    const [user] = await db
      .insert(users)
      .values({
        email: `race-test-${Date.now()}-${Math.random()}@example.com`,
        name: "Race Test User",
        role: "receiver",
        orgId: receiverOrgId,
      })
      .returning({ id: users.id });
    userId = user.id;
    sessionUserId = userId;

    const now = new Date();
    const [listing] = await db
      .insert(listings)
      .values({
        donorOrgId,
        title: "Race test listing",
        description: "d",
        foodType: "f",
        quantity: 1,
        unit: "kg",
        pickupWindowStart: now,
        pickupWindowEnd: new Date(now.getTime() + 3600_000),
        claimExpiresAt: new Date(now.getTime() + 3600_000),
        lat: 0,
        lng: 0,
        status: "available",
      })
      .returning({ id: listings.id });
    listingId = listing.id;

    const [claim] = await db
      .insert(claims)
      .values({
        listingId,
        receiverOrgId,
        status: "offered",
        rank: 1,
        respondBy: new Date(now.getTime() + 15 * 60_000),
      })
      .returning({ id: claims.id });
    claimId = claim.id;
  });

  afterEach(async () => {
    await db.delete(claims).where(eq(claims.listingId, listingId));
    await db.delete(listings).where(eq(listings.id, listingId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(organizations).where(eq(organizations.id, donorOrgId));
    await db.delete(organizations).where(eq(organizations.id, receiverOrgId));
  });

  it("lets exactly one of two concurrent accepts win", async () => {
    function makeRequest() {
      return new Request(`http://localhost/api/claims/${claimId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
    }
    const params = Promise.resolve({ id: claimId });

    const [res1, res2] = await Promise.all([
      POST(makeRequest(), { params }),
      POST(makeRequest(), { params }),
    ]);

    const [body1, body2] = await Promise.all([res1.json(), res2.json()]);
    expect([res1.status, res2.status].sort()).toEqual([200, 409]);

    const winners = [body1, body2].filter((b) => b.status === "accepted");
    expect(winners).toHaveLength(1);

    const [finalListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId));
    expect(finalListing.status).toBe("claimed");

    const [finalClaim] = await db.select().from(claims).where(eq(claims.id, claimId));
    expect(finalClaim.status).toBe("confirmed");
  });
});
