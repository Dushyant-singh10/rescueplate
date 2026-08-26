import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

const MAX_PHOTO_CHARS = 700_000; // ~500KB decoded, plenty for a small avatar

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  bio: z.string().trim().max(500).optional(),
  photoUrl: z
    .string()
    .max(MAX_PHOTO_CHARS)
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/)
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone || null;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio || null;
  if (parsed.data.photoUrl !== undefined) updates.photoUrl = parsed.data.photoUrl;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.update(users).set(updates).where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
