import { and, asc, eq } from "drizzle-orm";
import type { db as Db } from "@/db";
import { claims, listings } from "@/db/schema";

export const OFFER_WINDOW_MINUTES = 15;

export function computeRespondByDeadline(now: Date): Date {
  return new Date(now.getTime() + OFFER_WINDOW_MINUTES * 60 * 1000);
}

export function isOfferExpired(respondBy: Date, now: Date): boolean {
  return respondBy.getTime() <= now.getTime();
}

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

/**
 * Promotes the next queued ("pending") candidate for a listing to "offered".
 * If the queue is exhausted, the listing is closed out as "expired" instead
 * of being left available with nobody to offer it to. Shared by the initial
 * allocation, an immediate decline, and the cascade cron — the listing row
 * is locked so it can't race with a concurrent cron tick or accept.
 */
export async function advanceQueue(tx: Tx, listingId: string): Promise<void> {
  const [listing] = await tx
    .select({ id: listings.id, status: listings.status })
    .from(listings)
    .where(eq(listings.id, listingId))
    .for("update");

  if (!listing || listing.status !== "available") return;

  const [next] = await tx
    .select({ id: claims.id })
    .from(claims)
    .where(and(eq(claims.listingId, listingId), eq(claims.status, "pending")))
    .orderBy(asc(claims.rank))
    .limit(1);

  const now = new Date();

  if (!next) {
    await tx
      .update(listings)
      .set({ status: "expired" })
      .where(eq(listings.id, listingId));
    return;
  }

  await tx
    .update(claims)
    .set({ status: "offered", respondBy: computeRespondByDeadline(now) })
    .where(eq(claims.id, next.id));
}
