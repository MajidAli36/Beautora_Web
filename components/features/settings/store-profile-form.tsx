"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  removeStoreProfileImage,
  updateStoreProfile,
  uploadStoreProfileImage,
  type StoreProfile,
} from "@/lib/actions/store-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StoreProfileForm({ profile }: { profile: StoreProfile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [tagline, setTagline] = useState(profile.tagline ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp_phone ?? "");
  const [arrivalNotes, setArrivalNotes] = useState(profile.arrival_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateStoreProfile({
      name,
      tagline,
      address,
      city,
      phone,
      email,
      whatsappPhone: whatsapp,
      arrivalNotes,
    });
    setSaving(false);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success("Store profile saved — online booking updated");
    router.refresh();
  }

  async function onUpload(kind: "logo" | "cover", file: File | null) {
    if (!file) return;
    setUploading(kind);
    const result = await uploadStoreProfileImage({ kind, file });
    setUploading(null);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(kind === "logo" ? "Logo uploaded" : "Cover photo uploaded");
    router.refresh();
  }

  async function onRemove(kind: "logo" | "cover") {
    setUploading(kind);
    const result = await removeStoreProfileImage(kind);
    setUploading(null);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(kind === "logo" ? "Logo removed" : "Cover removed");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand images</CardTitle>
          <CardDescription>
            Logo and cover appear on your public booking page and store listing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Logo</Label>
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {profile.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logoUrl} alt="Store logo" className="size-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading !== null}
              onChange={(e) => onUpload("logo", e.target.files?.[0] ?? null)}
            />
            {profile.logoUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading !== null}
                onClick={() => onRemove("logo")}
              >
                Remove logo
              </Button>
            )}
          </div>
          <div className="space-y-3">
            <Label>Cover photo</Label>
            <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {profile.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.coverUrl}
                  alt="Store cover"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-muted-foreground">No cover</span>
              )}
            </div>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading !== null}
              onChange={(e) => onUpload("cover", e.target.files?.[0] ?? null)}
            />
            {profile.coverUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading !== null}
                onClick={() => onRemove("cover")}
              >
                Remove cover
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            JPG, PNG, or WebP · max 5 MB. Booking URL stays{" "}
            <span className="font-mono">/book/{profile.slug}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store details</CardTitle>
          <CardDescription>
            Shown to customers on online booking. Change anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="store-name">Salon name</Label>
              <Input
                id="store-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Precision hair care"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Lahore, Gujranwala, Islamabad"
              />
              <p className="text-xs text-muted-foreground">
                Used for store directory search and city filters.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Street, area"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03XX XXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="03XX XXXXXXX"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@yoursalon.com"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="arrival">Before you arrive (tips)</Label>
              <Textarea
                id="arrival"
                value={arrivalNotes}
                onChange={(e) => setArrivalNotes(e.target.value)}
                rows={4}
                placeholder={"Arrive five minutes early\nBring inspiration photos\nCall 24 hours ahead to cancel"}
              />
              <p className="text-xs text-muted-foreground">One tip per line works best.</p>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save store profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
