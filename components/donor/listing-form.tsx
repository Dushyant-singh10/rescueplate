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
  safetyNotes: string | null;
  urgencyHint: number;
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
  const [safetyNotes, setSafetyNotes] = useState(listing?.safetyNotes ?? "");
  const [urgencyHint, setUrgencyHint] = useState(listing?.urgencyHint ?? 0.5);
  const [urgencyRationale, setUrgencyRationale] = useState<string | null>(null);
  const [aiText, setAiText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [scoringUrgency, setScoringUrgency] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleParseWithAi() {
    if (!aiText.trim()) return;
    setParsing(true);
    setError(null);
    const res = await fetch("/api/ai/parse-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: aiText }),
    });
    setParsing(false);
    if (!res.ok) {
      setError("Could not parse that description — please fill in the form manually.");
      return;
    }
    const data = await res.json();
    setTitle(data.title);
    setDescription(data.description);
    setFoodType(data.foodType);
    setQuantity(String(data.quantity));
    setUnit(data.unit);
    setAllergens(data.allergens.join(", "));
    setSafetyNotes(data.safetyNotes ?? "");
    setUrgencyHint(data.urgencyHint);
    setUrgencyRationale(data.rationale);
    toast.success("Parsed — review the fields below before posting");
  }

  async function handleRecheckUrgency() {
    if (!aiText.trim()) return;
    setScoringUrgency(true);
    const res = await fetch("/api/ai/urgency-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: aiText,
        claimExpiresAt: claimExpiresAt ? new Date(claimExpiresAt).toISOString() : undefined,
      }),
    });
    setScoringUrgency(false);
    if (!res.ok) {
      toast.error("Could not re-score urgency");
      return;
    }
    const data = await res.json();
    setUrgencyHint(data.urgency);
    setUrgencyRationale(data.rationale);
  }

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
      safetyNotes: safetyNotes.trim() || undefined,
      urgencyHint,
    };

    const res = await fetch(
      isEdit ? `/api/listings/${listing!.id}` : "/api/listings",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    if (!isEdit) {
      const { id } = await res.json();
      await fetch(`/api/listings/${id}/allocate`, { method: "POST" });
    }

    setLoading(false);
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
          {!isEdit ? (
            <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
              <Label htmlFor="aiText">Describe it in your own words (optional)</Label>
              <Textarea
                id="aiText"
                placeholder="e.g. bunch of leftover catering trays, some dairy, need gone tonight"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={parsing || !aiText.trim()}
                onClick={handleParseWithAi}
              >
                {parsing ? "Parsing..." : "Parse with AI"}
              </Button>
            </div>
          ) : null}
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="safetyNotes">Safety notes (optional)</Label>
            <Textarea
              id="safetyNotes"
              placeholder="e.g. keep refrigerated, contains raw egg"
              value={safetyNotes}
              onChange={(e) => setSafetyNotes(e.target.value)}
            />
          </div>
          {!isEdit ? (
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label>Urgency: {Math.round(urgencyHint * 100)}%</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={scoringUrgency || !aiText.trim()}
                  onClick={handleRecheckUrgency}
                >
                  {scoringUrgency ? "Checking..." : "Re-check urgency"}
                </Button>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={urgencyHint}
                onChange={(e) => setUrgencyHint(parseFloat(e.target.value))}
              />
              {urgencyRationale ? (
                <p className="text-xs text-muted-foreground">{urgencyRationale}</p>
              ) : null}
            </div>
          ) : null}

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
