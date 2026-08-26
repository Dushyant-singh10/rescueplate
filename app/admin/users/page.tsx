import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { UserManagement, type ManagedUser } from "@/components/admin/user-management";

export default async function AdminUsersPage() {
  const session = await requireRole("admin");

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      orgName: organizations.name,
    })
    .from(users)
    .leftJoin(organizations, eq(users.orgId, organizations.id))
    .orderBy(desc(users.createdAt));

  const managedUsers: ManagedUser[] = rows.map((r) => ({ ...r, orgName: r.orgName ?? null }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">User access</h1>
      <p className="mt-1 text-muted-foreground">
        Grant or revoke admin access. Everyone else&apos;s role is set through onboarding.
      </p>
      <div className="mt-6 rounded-md border">
        <UserManagement initialUsers={managedUsers} currentUserId={session.user.id!} />
      </div>
    </div>
  );
}
