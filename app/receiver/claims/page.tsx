import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/db";
import { claims, listings, organizations } from "@/db/schema";
import { ClaimsList, type ClaimRow } from "@/components/receiver/claims-list";

export default async function ReceiverClaimsPage() {
  const session = await requireRole("receiver");
  const orgId = session.user.orgId;

  const rows: ClaimRow[] = orgId
    ? (
        await db
          .select({
            id: claims.id,
            status: claims.status,
            rank: claims.rank,
            score: claims.score,
            scoreBreakdown: claims.scoreBreakdown,
            respondBy: claims.respondBy,
            claimedAt: claims.claimedAt,
            listingTitle: listings.title,
            listingDescription: listings.description,
            donorName: organizations.name,
            imageUrl: listings.imageUrl,
          })
          .from(claims)
          .innerJoin(listings, eq(claims.listingId, listings.id))
          .innerJoin(organizations, eq(listings.donorOrgId, organizations.id))
          .where(eq(claims.receiverOrgId, orgId))
          .orderBy(desc(claims.claimedAt))
      )
        .filter((c) => c.status !== "pending")
        .map((c) => ({ ...c, respondBy: c.respondBy ? c.respondBy.toISOString() : null }))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Your claims</h1>
      <p className="mt-1 text-muted-foreground">
        Offers you&apos;ve been matched with, and your claim history.
      </p>
      <div className="mt-6">
        <ClaimsList claims={rows} />
      </div>
    </div>
  );
}
