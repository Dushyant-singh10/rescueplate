"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NearbyListing } from "@/lib/geo";

const RADIUS_OPTIONS = [2, 5, 10, 25, 50];

function isUrgent(claimExpiresAt: string) {
  return new Date(claimExpiresAt).getTime() - Date.now() < 2 * 60 * 60 * 1000;
}

export function NearbyListings() {
  const [radius, setRadius] = useState(10);
  const [listings, setListings] = useState<NearbyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading nearby listings...</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No available listings within {radius} km right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Card key={listing.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{listing.title}</CardTitle>
                    {isUrgent(listing.claimExpiresAt) && (
                      <Badge variant="destructive">Urgent</Badge>
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
                  <p className="text-xs text-muted-foreground">
                    Claim by {new Date(listing.claimExpiresAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
