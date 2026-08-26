import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      orgName: organizations.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(organizations, eq(users.orgId, organizations.id))
    .orderBy(desc(users.createdAt));

  return NextResponse.json({ users: rows });
}
