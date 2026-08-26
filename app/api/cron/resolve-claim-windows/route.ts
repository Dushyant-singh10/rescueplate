import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { claims } from "@/db/schema";
import { advanceQueue, isOfferExpired } from "@/engine/claimWindow";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const timedOut = await db
    .select({ id: claims.id, listingId: claims.listingId })
    .from(claims)
    .where(and(eq(claims.status, "offered"), lt(claims.respondBy, now)));

  for (const offer of timedOut) {
    await db.transaction(async (tx) => {
      const [claim] = await tx
        .select({ status: claims.status, respondBy: claims.respondBy })
        .from(claims)
        .where(eq(claims.id, offer.id))
        .for("update");

      if (!claim || claim.status !== "offered" || !claim.respondBy) return;
      if (!isOfferExpired(claim.respondBy, now)) return;

      await tx.update(claims).set({ status: "expired" }).where(eq(claims.id, offer.id));
      await advanceQueue(tx, offer.listingId);
    });
  }

  return NextResponse.json({ cascaded: timedOut.length });
}
