"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type EditableListing = {
  id: string;
  title: string;
  description: string;
  foodType: string;
  quantity: number;
  unit: string;
  allergens: string[];
  pickupWindowStart: string;
  pickupWindowEnd: string;
  claimExpiresAt: string;
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ListingForm({ listing }: { listing?: EditableListing }) {
  const router = useRouter();
  const isEdit = !!listing;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [foodType, setFoodType] = useState(listing?.foodType ?? "");
  const [quantity, setQuantity] = useState(listing?.quantity?.toString() ?? "");
  const [unit, setUnit] = useState(listing?.unit ?? "");
  const [allergens, setAllergens] = useState(listing?.allergens?.join(", ") ?? "");
  const [pickupWindowStart, setPickupWindowStart] = useState(
    listing ? toLocalInputValue(listing.pickupWindowStart) : ""
  );
  const [pickupWindowEnd, setPickupWindowEnd] = useState(
    listing ? toLocalInputValue(listing.pickupWindowEnd) : ""
  );
  const [claimExpiresAt, setClaimExpiresAt] = useState(
    listing ? toLocalInputValue(listing.claimExpiresAt) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      title,
      description,
      foodType,
      quantity: parseFloat(quantity),
      unit,
      allergens: allergens
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      pickupWindowStart: new Date(pickupWindowStart).toISOString(),
      pickupWindowEnd: new Date(pickupWindowEnd).toISOString(),
      claimExpiresAt: new Date(claimExpiresAt).toISOString(),
    };

    const res = await fetch(
      isEdit ? `/api/listings/${listing!.id}` : "/api/listings",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Something went wrong. Please try again.");
      return;
    }

    toast.success(isEdit ? "Listing updated" : "Listing posted");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"} />
        }
      >
        {isEdit ? "Edit" : "Post a listing"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit listing" : "Post surplus food"}</DialogTitle>
          <DialogDescription>
            Receivers nearby will see this listing sorted by distance and
            urgency until it&apos;s claimed or expires.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="foodType">Food type</Label>
              <Input
                id="foodType"
                required
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="kg, trays..."
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="allergens">Allergens (comma-separated)</Label>
            <Input
              id="allergens"
              placeholder="nuts, dairy, gluten"
              value={allergens}
              onChange={(e) => setAllergens(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pickupWindowStart">Pickup window start</Label>
              <Input
                id="pickupWindowStart"
                type="datetime-local"
                required
                value={pickupWindowStart}
                onChange={(e) => setPickupWindowStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pickupWindowEnd">Pickup window end</Label>
              <Input
                id="pickupWindowEnd"
                type="datetime-local"
                required
                value={pickupWindowEnd}
                onChange={(e) => setPickupWindowEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="claimExpiresAt">Claim deadline</Label>
            <Input
              id="claimExpiresAt"
              type="datetime-local"
              required
              value={claimExpiresAt}
              onChange={(e) => setClaimExpiresAt(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save changes" : "Post listing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
