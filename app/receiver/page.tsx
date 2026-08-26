import Link from "next/link";
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Receiver dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {session.user.name}
            {org ? ` — ${org.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/org-profile" className="text-sm text-primary underline underline-offset-4">
            Org profile
          </Link>
          <Link href="/receiver/claims" className="text-sm text-primary underline underline-offset-4">
            Your claims
          </Link>
        </div>
      </div>

      {org && org.verificationStatus !== "verified" ? (
        <div className="mt-6">
          <VerificationBanner
            status={org.verificationStatus as "pending" | "rejected"}
          />
        </div>
      ) : (
        <div className="mt-6">
          <NearbyListings center={org ? { lat: org.lat, lng: org.lng } : null} />
        </div>
      )}
    </div>
  );
}
