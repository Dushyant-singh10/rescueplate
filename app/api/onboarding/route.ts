import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { onboardingSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.user.role) {
    return NextResponse.json(
      { error: "Account already onboarded" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { phone, role, org } = parsed.data;
  const email = session.user.email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing?.role) {
    return NextResponse.json(
      { error: "Account already onboarded" },
      { status: 400 }
    );
  }

  const result = await db.transaction(async (tx) => {
    let orgId: string | null = null;

    if (org) {
      const [createdOrg] = await tx
        .insert(organizations)
        .values({
          name: org.name,
          type: role === "donor" ? "donor_business" : "receiver_ngo",
          address: org.address,
          lat: org.lat,
          lng: org.lng,
        })
        .returning({ id: organizations.id });
      orgId = createdOrg.id;
    }

    if (existing) {
      const [updated] = await tx
        .update(users)
        .set({ role, orgId, phone: phone || null })
        .where(eq(users.id, existing.id))
        .returning({ id: users.id });
      return updated;
    }

    const [created] = await tx
      .insert(users)
      .values({
        email,
        name: session.user.name || email,
        role,
        orgId,
        phone: phone || null,
        passwordHash: null,
      })
      .returning({ id: users.id });
    return created;
  });

  return NextResponse.json({ id: result.id }, { status: 200 });
}
