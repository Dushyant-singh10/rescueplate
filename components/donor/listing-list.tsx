"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListingForm, type EditableListing } from "@/components/donor/listing-form";

export type ListingRow = EditableListing & {
  status: "available" | "claimed" | "picked_up" | "expired" | "cancelled";
  imageUrl: string | null;
};

const STATUS_VARIANT: Record<ListingRow["status"], "default" | "secondary" | "destructive" | "outline"> = {
  available: "default",
  claimed: "secondary",
  picked_up: "secondary",
  expired: "outline",
  cancelled: "destructive",
};

export function ListingList({ listings }: { listings: ListingRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not cancel that listing");
        setPendingId(null);
        return;
      }
      toast.success("Listing cancelled");
      router.refresh();
      setPendingId(null);
    });
  }

  function handlePickup(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const res = await fetch(`/api/listings/${id}/pickup`, { method: "POST" });
      if (!res.ok) {
        toast.error("Could not confirm pickup for that listing");
        setPendingId(null);
        return;
      }
      toast.success("Pickup confirmed");
      router.refresh();
      setPendingId(null);
    });
  }

  if (listings.length === 0) {
    return (
      <p className="animate-in fade-in p-4 text-sm text-muted-foreground">
        You haven&apos;t posted any listings yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14" />
          <TableHead>Title</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Claim deadline</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listings.map((listing, i) => (
          <TableRow
            key={listing.id}
            className="animate-in fade-in slide-in-from-left-1 fill-mode-backwards duration-300"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <TableCell>
              {listing.imageUrl ? (
                <div className="relative size-10 overflow-hidden rounded-md">
                  <Image src={listing.imageUrl} alt="" fill className="object-cover" />
                </div>
              ) : (
                <div className="size-10 rounded-md bg-muted" />
              )}
            </TableCell>
            <TableCell className="font-medium">{listing.title}</TableCell>
            <TableCell>
              {listing.quantity} {listing.unit}
            </TableCell>
            <TableCell suppressHydrationWarning>
              {new Date(listing.claimExpiresAt).toLocaleString()}
            </TableCell>
            <TableCell>
              <Badge
                variant={STATUS_VARIANT[listing.status]}
                className={listing.status === "claimed" ? "animate-pulse" : ""}
              >
                {listing.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {listing.status === "available" ? (
                <div className="flex justify-end gap-2">
                  <ListingForm listing={listing} />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending && pendingId === listing.id}
                    onClick={() => handleCancel(listing.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : listing.status === "claimed" ? (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={isPending && pendingId === listing.id}
                    onClick={() => handlePickup(listing.id)}
                  >
                    Mark picked up
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
