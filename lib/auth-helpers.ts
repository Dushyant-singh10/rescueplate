import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import type { UserRole } from "@/types/next-auth";

export async function requireRole(role: UserRole) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== role) redirect("/dashboard");
  return session;
}

export async function getOrgVerification(orgId: string) {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      verificationStatus: organizations.verificationStatus,
      flagged: organizations.flagged,
      lat: organizations.lat,
      lng: organizations.lng,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org ?? null;
}
