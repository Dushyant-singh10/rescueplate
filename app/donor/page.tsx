import { desc, eq } from "drizzle-orm";
import { requireRole, getOrgVerification } from "@/lib/auth-helpers";
import { VerificationBanner } from "@/components/verification-banner";
import { ListingForm } from "@/components/donor/listing-form";
import { ListingList, type ListingRow } from "@/components/donor/listing-list";
import { db } from "@/db";
import { listings } from "@/db/schema";

export default async function DonorDashboard() {
  const session = await requireRole("donor");
  const org = session.user.orgId
    ? await getOrgVerification(session.user.orgId)
    : null;

  const isVerified = org?.verificationStatus === "verified";

  const rows: ListingRow[] = isVerified
    ? (
        await db
          .select()
          .from(listings)
          .where(eq(listings.donorOrgId, session.user.orgId!))
          .orderBy(desc(listings.createdAt))
      ).map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        foodType: l.foodType,
        quantity: l.quantity,
        unit: l.unit,
        allergens: l.allergens,
        pickupWindowStart: l.pickupWindowStart.toISOString(),
        pickupWindowEnd: l.pickupWindowEnd.toISOString(),
        claimExpiresAt: l.claimExpiresAt.toISOString(),
        status: l.status,
      }))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Donor dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {session.user.name}
            {org ? ` — ${org.name}` : ""}
          </p>
        </div>
        {isVerified ? <ListingForm /> : null}
      </div>

      {org && org.verificationStatus !== "verified" ? (
        <div className="mt-6">
          <VerificationBanner
            status={org.verificationStatus as "pending" | "rejected"}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-md border">
          <ListingList listings={rows} />
        </div>
      )}
    </div>
  );
}
