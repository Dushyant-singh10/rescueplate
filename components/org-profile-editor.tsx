"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CameraIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const PHOTO_WIDTH = 800;
const PHOTO_HEIGHT = 450;

function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = PHOTO_WIDTH;
        canvas.height = PHOTO_HEIGHT;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));

        const targetRatio = PHOTO_WIDTH / PHOTO_HEIGHT;
        const srcRatio = img.width / img.height;
        let sw = img.width;
        let sh = img.height;
        if (srcRatio > targetRatio) {
          sw = img.height * targetRatio;
        } else {
          sh = img.width / targetRatio;
        }
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function OrgProfileEditor({
  initial,
}: {
  initial: { about: string; photoUrl: string | null };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [about, setAbout] = useState(initial.about);
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl);
  const [loading, setLoading] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is too large — please pick something under 8MB");
      return;
    }
    setProcessingPhoto(true);
    try {
      const dataUrl = await resizeToDataUrl(file);
      setPhotoUrl(dataUrl);
    } catch {
      toast.error("Could not process that image");
    } finally {
      setProcessingPhoto(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    const res = await fetch("/api/org-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ about: about || undefined, photoUrl }),
    });
    setLoading(false);

    if (!res.ok) {
      toast.error("Could not save your organization profile");
      return;
    }

    toast.success("Organization profile updated");
    router.refresh();
  }

  return (
    <Card className="animate-in fade-in zoom-in-95 duration-500">
      <CardContent className="flex flex-col gap-4 pt-6">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-muted ring-2 ring-transparent transition-all hover:ring-primary"
          aria-label="Change organization photo"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image can't optimize it
            <img src={photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-sm text-muted-foreground">No photo yet — click to add one</span>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
            <CameraIcon className="size-6" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
        {processingPhoto ? <p className="text-xs text-muted-foreground">Processing...</p> : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="about">About your organization</Label>
          <Textarea
            id="about"
            placeholder="What you do, and why you're on RescuePlate — shown on the public network page."
            value={about}
            onChange={(e) => setAbout(e.target.value)}
          />
        </div>

        <Button onClick={handleSave} disabled={loading || processingPhoto}>
          {loading ? "Saving..." : "Save organization profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
