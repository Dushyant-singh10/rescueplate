import { and, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { claims } from "@/db/schema";

export { fairnessScore } from "./scoring";

/**
 * Counts each org's claims accepted/completed within the trailing window,
 * so scoring.ts can down-weight receivers who've already won a lot recently.
 */
export async function getRecentClaimCounts(
  orgIds: string[],
  windowDays = 7
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(orgIds.map((id) => [id, 0]));
  if (orgIds.length === 0) return counts;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ receiverOrgId: claims.receiverOrgId })
    .from(claims)
    .where(
      and(
        inArray(claims.receiverOrgId, orgIds),
        inArray(claims.status, ["confirmed", "picked_up"]),
        gte(claims.claimedAt, since)
      )
    );

  for (const row of rows) {
    counts.set(row.receiverOrgId, (counts.get(row.receiverOrgId) ?? 0) + 1);
  }
  return counts;
}
