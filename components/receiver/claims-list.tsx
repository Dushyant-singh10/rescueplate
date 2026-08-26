"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AllocationTrace, type ScoreBreakdown } from "@/components/allocation-trace";

export type ClaimRow = {
  id: string;
  status: string;
  rank: number;
  score: number | null;
  scoreBreakdown: ScoreBreakdown | null;
  respondBy: string | null;
  listingTitle: string;
  listingDescription: string;
  donorName: string;
  imageUrl: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  offered: "default",
  confirmed: "secondary",
  picked_up: "secondary",
  declined: "outline",
  expired: "outline",
  no_show: "destructive",
  cancelled: "outline",
};

export function ClaimsList({ claims }: { claims: ClaimRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function respond(id: string, action: "accept" | "decline") {
    setPendingId(id);
    startTransition(async () => {
      const res = await fetch(`/api/claims/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        toast.error("This offer is no longer active");
      } else {
        toast.success(action === "accept" ? "Claim accepted!" : "Offer declined");
      }
      router.refresh();
      setPendingId(null);
    });
  }

  if (claims.length === 0) {
    return (
      <p className="animate-in fade-in text-sm text-muted-foreground">No claims yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {claims.map((claim, i) => (
        <Card
          key={claim.id}
          className="hover-lift animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {claim.imageUrl ? (
            <div className="relative h-32 w-full overflow-hidden">
              <Image
                src={claim.imageUrl}
                alt={claim.listingTitle}
                fill
                className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                sizes="(min-width: 640px) 50vw, 100vw"
              />
            </div>
          ) : null}
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{claim.listingTitle}</CardTitle>
              <Badge
                variant={STATUS_VARIANT[claim.status] ?? "outline"}
                className={claim.status === "offered" ? "animate-pulse" : ""}
              >
                {claim.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">{claim.listingDescription}</p>
            <p className="text-xs text-muted-foreground">{claim.donorName}</p>
            {claim.status === "offered" && claim.respondBy ? (
              <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                Respond by {new Date(claim.respondBy).toLocaleTimeString()}
              </p>
            ) : null}
            {claim.scoreBreakdown ? (
              <AllocationTrace
                breakdown={claim.scoreBreakdown}
                score={claim.score}
                rank={claim.rank}
              />
            ) : null}
          </CardContent>
          {claim.status === "offered" ? (
            <CardFooter className="flex gap-2">
              <Button
                className="flex-1"
                disabled={isPending && pendingId === claim.id}
                onClick={() => respond(claim.id, "accept")}
              >
                Accept
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={isPending && pendingId === claim.id}
                onClick={() => respond(claim.id, "decline")}
              >
                Decline
              </Button>
            </CardFooter>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
