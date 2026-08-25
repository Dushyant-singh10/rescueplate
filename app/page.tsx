import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    title: "Real-time listings",
    body: "Donors post surplus food with a claim window that auto-expires — no stale offers.",
  },
  {
    title: "Race-condition-safe claiming",
    body: "Row-level locking means two NGOs can never accidentally double-claim the same food.",
  },
  {
    title: "Verified network",
    body: "Every donor and receiver org is verified by an admin before they can transact.",
  },
  {
    title: "Geolocation discovery",
    body: "Receivers see what's available nearby, sorted by distance and urgency.",
  },
  {
    title: "Trust & accountability",
    body: "Post-pickup ratings and no-show tracking keep the network reliable.",
  },
  {
    title: "AI-assisted",
    body: "Natural-language search, generated food-safety notes, and donation-pattern insights.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <section className="flex flex-col items-center text-center">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Surplus food, rescued in real time.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          RescuePlate connects restaurants, caterers, and grocery stores with
          verified NGOs and shelters nearby — turning what would be waste into
          meals, before it expires.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/register">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Log in
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle className="text-base">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {feature.body}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
