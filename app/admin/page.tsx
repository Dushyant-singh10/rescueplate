import Link from "next/link";
import { asc, desc, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { OrgVerificationTable, type OrgRow } from "@/components/admin/org-verification-table";

export default async function AdminDashboard() {
  const session = await requireRole("admin");

  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      type: organizations.type,
      address: organizations.address,
      verificationStatus: organizations.verificationStatus,
      flagged: organizations.flagged,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(
      // pending first, then newest first
      asc(sql`case when ${organizations.verificationStatus} = 'pending' then 0 else 1 end`),
      desc(organizations.createdAt)
    );

  const rows: OrgRow[] = orgs.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }));

  const pendingCount = rows.filter((r) => r.verificationStatus === "pending").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {session.user.name} — {pendingCount} organization
            {pendingCount === 1 ? "" : "s"} awaiting verification
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/admin/allocation-monitor"
            className="text-sm text-primary underline underline-offset-4"
          >
            Allocation monitor
          </Link>
          <Link href="/admin/users" className="text-sm text-primary underline underline-offset-4">
            User access
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-md border">
        <OrgVerificationTable initialOrgs={rows} />
      </div>
    </div>
  );
}
