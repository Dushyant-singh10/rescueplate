"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/map-view";
import { Skeleton } from "@/components/ui/skeleton";
import type { NearbyListing } from "@/lib/geo";

const RADIUS_OPTIONS = [2, 5, 10, 25, 50];

function isUrgent(claimExpiresAt: string) {
  return new Date(claimExpiresAt).getTime() - Date.now() < 2 * 60 * 60 * 1000;
}

function statusLabel(listing: NearbyListing): string {
  if (!listing.yourStatus || listing.yourStatus === "pending") {
    return "Awaiting allocation";
  }
  if (listing.yourStatus === "offered") return "Offered to you — respond in Your claims";
  return `Ranked #${listing.yourRank ?? "?"}`;
}

export function NearbyListings({ center }: { center: { lat: number; lng: number } | null }) {
  const [radius, setRadius] = useState(10);
  const [listings, setListings] = useState<NearbyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/listings/nearby?radius=${radius}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load nearby listings");
        const data = await res.json();
        if (!cancelled) {
          setListings(data.listings);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load nearby listings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [radius]);

  function handleRadiusChange(value: string | null) {
    if (!value) return;
    setLoading(true);
    setRadius(parseInt(value, 10));
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Within</span>
        <Select value={radius.toString()} onValueChange={handleRadiusChange}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RADIUS_OPTIONS.map((r) => (
              <SelectItem key={r} value={r.toString()}>
                {r} km
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {center ? (
          <Button variant="outline" size="sm" onClick={() => setShowMap((v) => !v)}>
            {showMap ? "Hide map" : "Map view"}
          </Button>
        ) : null}
      </div>

      {center && showMap ? (
        <div className="mt-4">
          <MapView
            center={center}
            pins={listings.map((l) => ({
              id: l.id,
              lat: l.donorLat,
              lng: l.donorLng,
              label: `${l.title} · ${l.donorName}`,
            }))}
          />
        </div>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : listings.length === 0 ? (
          <p className="animate-in fade-in text-sm text-muted-foreground">
            No available listings within {radius} km right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing, i) => (
              <Card
                key={listing.id}
                className="hover-lift animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {listing.imageUrl ? (
                  <div className="relative h-32 w-full overflow-hidden">
                    <Image
                      src={listing.imageUrl}
                      alt={listing.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  </div>
                ) : null}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{listing.title}</CardTitle>
                    {isUrgent(listing.claimExpiresAt) && (
                      <Badge variant="destructive" className="animate-pulse">
                        Urgent
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <p className="text-muted-foreground">{listing.description}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{listing.foodType}</Badge>
                    <Badge variant="outline">
                      {listing.quantity} {listing.unit}
                    </Badge>
                    {listing.allergens.map((a) => (
                      <Badge key={a} variant="outline">
                        {a}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {listing.donorName} · {listing.distanceKm.toFixed(1)} km away
                  </p>
                  <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                    Claim by {new Date(listing.claimExpiresAt).toLocaleString()}
                  </p>
                  <Badge
                    variant="outline"
                    className={`w-fit ${listing.yourStatus === "offered" ? "animate-pulse border-primary text-primary" : ""}`}
                  >
                    {statusLabel(listing)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
