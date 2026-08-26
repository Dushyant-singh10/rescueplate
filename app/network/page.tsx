import Image from "next/image";
import { asc, eq } from "drizzle-orm";
import { UtensilsCrossedIcon, HeartHandshakeIcon } from "lucide-react";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NetworkPage() {
  const orgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.verificationStatus, "verified"))
    .orderBy(asc(organizations.type), asc(organizations.name));

  const donors = orgs.filter((o) => o.type === "donor_business");
  const receivers = orgs.filter((o) => o.type === "receiver_ngo");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="animate-in fade-in slide-in-from-bottom-4 text-center duration-700">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Our network</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          The restaurants, grocers, and caterers donating surplus food, and the verified NGOs
          and shelters getting it to people who need it.
        </p>
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">
          Donors <span className="font-normal text-muted-foreground">— restaurants &amp; businesses</span>
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {donors.map((org, i) => (
            <OrgCard key={org.id} org={org} kind="Restaurant / Business" delay={i * 70} />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">
          Receivers <span className="font-normal text-muted-foreground">— NGOs &amp; shelters</span>
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {receivers.map((org, i) => (
            <OrgCard key={org.id} org={org} kind="NGO / Shelter" delay={i * 70} />
          ))}
        </div>
      </section>
    </div>
  );
}

function OrgCard({
  org,
  kind,
  delay,
}: {
  org: typeof organizations.$inferSelect;
  kind: string;
  delay: number;
}) {
  return (
    <Card
      className="hover-lift animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards overflow-hidden py-0 duration-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="group/photo relative h-40 w-full overflow-hidden bg-muted">
        {org.photoUrl ? (
          <Image
            src={org.photoUrl}
            alt={org.name}
            fill
            className="object-cover transition-transform duration-500 group-hover/card:scale-110"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
            {kind === "NGO / Shelter" ? (
              <HeartHandshakeIcon className="size-10 text-primary/40" />
            ) : (
              <UtensilsCrossedIcon className="size-10 text-primary/40" />
            )}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <Badge variant="secondary" className="text-xs">
            {kind}
          </Badge>
        </div>
      </div>
      <CardHeader className="pt-4">
        <CardTitle className="text-base">{org.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pb-4 text-sm">
        <p className="text-xs text-muted-foreground">{org.address}</p>
        {org.about ? (
          <p className="text-muted-foreground">{org.about}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground/60">No description yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
