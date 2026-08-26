import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { detectPatterns } from "@/engine/surplusPredictor";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function DonorInsightsPage() {
  const session = await requireRole("donor");
  const orgId = session.user.orgId;

  const rows = orgId
    ? await db
        .select({ createdAt: listings.createdAt })
        .from(listings)
        .where(eq(listings.donorOrgId, orgId))
    : [];

  const patterns = detectPatterns(rows.map((r) => r.createdAt));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Surplus insights</h1>
      <p className="mt-1 text-muted-foreground">
        Patterns detected from your past listings ({rows.length} total).
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {patterns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not enough history yet — post a few more listings and patterns will show up here.
          </p>
        ) : (
          patterns.map((p) => (
            <div key={`${p.dayOfWeek}-${p.hourBlock}`} className="rounded-md border p-4 text-sm">
              You tend to post surplus on <span className="font-medium">{DAY_NAMES[p.dayOfWeek]}</span>
              {" "}around <span className="font-medium">{p.hourBlock}</span> — seen {p.count} times.
            </div>
          ))
        )}
      </div>
    </div>
  );
}
