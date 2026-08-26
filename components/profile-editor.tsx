"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CameraIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const AVATAR_SIZE = 256;

function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));

        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileEditor({
  initial,
}: {
  initial: { name: string; email: string; phone: string; bio: string; photoUrl: string | null };
}) {
  const router = useRouter();
  const { update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [bio, setBio] = useState(initial.bio);
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
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone: phone || undefined, bio: bio || undefined, photoUrl }),
    });
    setLoading(false);

    if (!res.ok) {
      toast.error("Could not save your profile");
      return;
    }

    await update();
    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <Card className="animate-in fade-in zoom-in-95 duration-500">
      <CardContent className="flex flex-col gap-5 pt-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative size-20 shrink-0 overflow-hidden rounded-full ring-2 ring-border transition-all hover:ring-primary"
            aria-label="Change profile photo"
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image can't optimize it
              <img src={photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-muted text-xl font-medium text-muted-foreground">
                {name[0]?.toUpperCase() ?? "?"}
              </div>
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
          <div className="text-sm text-muted-foreground">
            {processingPhoto ? "Processing..." : "Click the circle to upload a new photo"}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Email</Label>
          <Input value={initial.email} disabled />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bio">About you</Label>
          <Textarea
            id="bio"
            placeholder="A line or two about your role here"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <Button onClick={handleSave} disabled={loading || processingPhoto}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
