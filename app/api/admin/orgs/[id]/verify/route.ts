import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { sendEmail } from "@/lib/email";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
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
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const newStatus = parsed.data.action === "approve" ? "verified" : "rejected";

  await db
    .update(organizations)
    .set({ verificationStatus: newStatus })
    .where(eq(organizations.id, id));

  const orgUsers = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.orgId, id));

  const subject =
    newStatus === "verified"
      ? "Your RescuePlate organization has been verified"
      : "Your RescuePlate organization verification was rejected";
  const html =
    newStatus === "verified"
      ? `<p>Good news — <strong>${org.name}</strong> has been verified on RescuePlate. You can now start using the platform.</p>`
      : `<p><strong>${org.name}</strong>'s verification was not approved. Please contact support or update your organization details and try again.</p>`;

  await Promise.allSettled(
    orgUsers.map((u) => sendEmail({ to: u.email, subject, html }))
  );

  return NextResponse.json({ status: newStatus });
}
