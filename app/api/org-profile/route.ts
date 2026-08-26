import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";

const MAX_PHOTO_CHARS = 900_000; // ~650KB decoded, a wide card photo needs a bit more than an avatar

const orgProfileSchema = z.object({
  about: z.string().trim().max(1000).optional(),
  photoUrl: z
    .string()
    .max(MAX_PHOTO_CHARS)
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/)
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "donor" && session.user.role !== "receiver") ||
    !session.user.orgId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = orgProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Partial<typeof organizations.$inferInsert> = {};
  if (parsed.data.about !== undefined) updates.about = parsed.data.about || null;
  if (parsed.data.photoUrl !== undefined) updates.photoUrl = parsed.data.photoUrl;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.update(organizations).set(updates).where(eq(organizations.id, session.user.orgId));

  return NextResponse.json({ ok: true });
}
