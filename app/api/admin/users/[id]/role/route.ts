import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

const bodySchema = z.object({
  action: z.enum(["grant_admin", "revoke_admin"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "You can't change your own admin access" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (parsed.data.action === "grant_admin") {
    // Admin isn't org-scoped — clear any existing org membership.
    await db
      .update(users)
      .set({ role: "admin", orgId: null })
      .where(eq(users.id, id));
    return NextResponse.json({ role: "admin" });
  }

  if (target.role !== "admin") {
    return NextResponse.json({ error: "User is not an admin" }, { status: 400 });
  }

  // Send them back through onboarding to pick a real role + org, rather than
  // guessing what they should become.
  await db.update(users).set({ role: null, orgId: null }).where(eq(users.id, id));
  return NextResponse.json({ role: null });
}
