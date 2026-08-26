import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, phone, role, org } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

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
          capacityKg: org.capacityKg ?? null,
        })
        .returning({ id: organizations.id });
      orgId = createdOrg.id;
    }

    const [createdUser] = await tx
      .insert(users)
      .values({
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        orgId,
        phone: phone || null,
      })
      .returning({ id: users.id, email: users.email });

    return createdUser;
  });

  return NextResponse.json({ id: result.id, email: result.email }, { status: 201 });
}
