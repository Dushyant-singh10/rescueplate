import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import { aiModel } from "@/lib/ai";

const parseRequestSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

const parsedListingSchema = z.object({
  title: z.string().max(150),
  description: z.string().max(2000),
  foodType: z.string().max(100),
  quantity: z.number().positive(),
  unit: z.string().max(30),
  allergens: z.array(z.string()).max(20),
  safetyNotes: z.string().max(1000).nullable(),
  urgencyHint: z.number().min(0).max(1),
  rationale: z.string().max(500),
});

const SYSTEM_PROMPT = `You turn a food donor's free-text description of surplus food into
structured, safety-aware listing data for a food rescue platform. Flag likely allergens
(dairy, nuts, gluten, shellfish, etc.) even if not explicitly named, and add any safety
notes a receiver organization should know (e.g. "keep refrigerated", "contains raw egg").
Set urgencyHint from 0 (no rush) to 1 (extremely time-sensitive, e.g. "needs to go tonight"
or mentions spoilage risk). Keep quantity/unit as best-effort numeric estimates from the text.`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "donor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: aiModel,
      schema: parsedListingSchema,
      system: SYSTEM_PROMPT,
      prompt: parsed.data.text,
    });
    return NextResponse.json(object);
  } catch {
    return NextResponse.json(
      { error: "Could not parse that description. Please fill in the form manually." },
      { status: 502 }
    );
  }
}
