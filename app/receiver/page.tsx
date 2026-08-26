import { requireRole, getOrgVerification } from "@/lib/auth-helpers";
import { VerificationBanner } from "@/components/verification-banner";
import { NearbyListings } from "@/components/receiver/nearby-listings";

export default async function ReceiverDashboard() {
  const session = await requireRole("receiver");
  const org = session.user.orgId
    ? await getOrgVerification(session.user.orgId)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Receiver dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Welcome back, {session.user.name}
        {org ? ` — ${org.name}` : ""}
      </p>

      {org && org.verificationStatus !== "verified" ? (
        <div className="mt-6">
          <VerificationBanner
            status={org.verificationStatus as "pending" | "rejected"}
          />
        </div>
      ) : (
        <div className="mt-6">
          <NearbyListings />
        </div>
      )}
    </div>
  );
}
