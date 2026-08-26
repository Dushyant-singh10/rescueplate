import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import { aiModel } from "@/lib/ai";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  claimExpiresAt: z.coerce.date().optional(),
});

const urgencySchema = z.object({
  urgency: z.number().min(0).max(1),
  rationale: z.string().max(300),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "donor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const deadlineNote = parsed.data.claimExpiresAt
    ? `Claim deadline: ${parsed.data.claimExpiresAt.toISOString()} (now: ${new Date().toISOString()}).`
    : "";

  try {
    const { object } = await generateObject({
      model: aiModel,
      schema: urgencySchema,
      system: `Rate how time-sensitive this food donation is, from 0 (no rush) to 1
(extremely urgent — spoiling, or must be gone within hours). Consider both the text and
the claim deadline if given.`,
      prompt: `${parsed.data.text}\n${deadlineNote}`,
    });
    return NextResponse.json(object);
  } catch {
    return NextResponse.json({ error: "Could not score urgency" }, { status: 502 });
  }
}
