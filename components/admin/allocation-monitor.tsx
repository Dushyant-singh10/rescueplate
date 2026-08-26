"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type QueueRow = {
  claimId: string;
  rank: number;
  status: string;
  score: number | null;
  respondBy: string | null;
  orgName: string;
};

type ActiveListing = {
  id: string;
  title: string;
  quantity: number;
  unit: string;
  queue: QueueRow[];
};

const POLL_MS = 5000;

function LiveIndicator() {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-green-500" />
      </span>
      Live
    </span>
  );
}

export function AllocationMonitor() {
  const [listings, setListings] = useState<ActiveListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/admin/allocation-monitor");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setListings(data.listings);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <LiveIndicator />
      </div>
      {listings.length === 0 ? (
        <p className="animate-in fade-in text-sm text-muted-foreground">
          No listings are mid-allocation right now.
        </p>
      ) : (
        listings.map((listing, i) => (
          <Card
            key={listing.id}
            className="hover-lift animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <CardHeader>
              <CardTitle className="text-base">
                {listing.title}{" "}
                <span className="font-normal text-muted-foreground">
                  ({listing.quantity} {listing.unit})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Respond by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listing.queue.map((row) => (
                    <TableRow
                      key={row.claimId}
                      className={row.status === "offered" ? "bg-primary/5" : ""}
                    >
                      <TableCell>#{row.rank}</TableCell>
                      <TableCell>{row.orgName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={row.status === "offered" ? "default" : "outline"}
                          className={row.status === "offered" ? "animate-pulse" : ""}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.score != null ? row.score.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell suppressHydrationWarning>
                        {row.status === "offered" && row.respondBy
                          ? new Date(row.respondBy).toLocaleTimeString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
