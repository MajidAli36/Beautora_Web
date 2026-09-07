"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { checkSlugAvailable } from "@/lib/actions/onboarding";
import { slugify } from "@/lib/onboarding/slug";
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

type BrandKind = "logo" | "cover";

function BrandImageControl({
  kind,
  label,
  hint,
  imageUrl,
  busy,
  disabled,
  onUpload,
  onRemove,
}: {
  kind: BrandKind;
  label: string;
  hint: string;
  imageUrl: string | null;
  busy: boolean;
  disabled: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const isLogo = kind === "logo";

  function takeFile(file: File | undefined | null) {
    if (!file || disabled || busy) return;
    onUpload(file);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </Label>
        {imageUrl ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            Live on booking page
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            Recommended
          </span>
        )}
      </div>

      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          takeFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "group relative flex cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all outline-none",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
          isLogo ? "aspect-square max-w-[220px]" : "aspect-[16/9] w-full",
          imageUrl
            ? "border-border bg-muted"
            : "border-primary/35 bg-gradient-to-br from-muted/80 via-background to-primary/5",
          dragging && "scale-[1.01] border-primary bg-primary/5",
          (disabled || busy) && "pointer-events-none opacity-70"
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={label} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15">
              <ImagePlus className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {isLogo ? "Upload salon logo" : "Upload cover photo"}
              </p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm">
              <Upload className="size-3.5" />
              Choose image
            </span>
          </div>
        )}

        {imageUrl && !busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow">
              <Upload className="size-3.5" />
              Replace {isLogo ? "logo" : "cover"}
            </span>
            <span className="text-[11px] text-white/85">Click or drop a new image</span>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-[1px]">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-xs font-medium text-foreground">
              {imageUrl ? "Updating…" : "Uploading…"}
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          className="sr-only"
          onChange={(e) => {
            takeFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {imageUrl ? "Replace" : "Upload"}
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

export function StoreProfileForm({ profile }: { profile: StoreProfile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [slug, setSlug] = useState(profile.slug);
  const [tagline, setTagline] = useState(profile.tagline ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp_phone ?? "");
  const [arrivalNotes, setArrivalNotes] = useState(profile.arrival_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<BrandKind | null>(null);
  const [slugHint, setSlugHint] = useState<string | null>(null);
  const [slugOk, setSlugOk] = useState<boolean | null>(null);

  useEffect(() => {
    setSlug(profile.slug);
  }, [profile.slug]);

  useEffect(() => {
    const normalized = slugify(slug);
    if (!normalized) {
      setSlugOk(false);
      setSlugHint("Enter a booking URL (letters, numbers, and hyphens).");
      return;
    }
    if (normalized === profile.slug) {
      setSlugOk(true);
      setSlugHint("This is your current booking URL.");
      return;
    }
    const handle = window.setTimeout(async () => {
      const result = await checkSlugAvailable(normalized, {
        excludeOrganizationId: profile.id,
        currentSlug: profile.slug,
      });
      setSlugOk(result.available);
      setSlugHint(
        result.available
          ? `Available — customers will use /book/${result.slug}`
          : result.error ?? "This booking URL is not available."
      );
    }, 350);
    return () => window.clearTimeout(handle);
  }, [slug, profile.id, profile.slug]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const normalized = slugify(slug);
    if (!normalized) {
      notify.error("Enter a valid booking URL before saving.");
      return;
    }
    if (slugOk === false) {
      notify.error(slugHint ?? "That booking URL is already taken.");
      return;
    }
    setSaving(true);
    const result = await updateStoreProfile({
      name,
      slug: normalized,
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
      setSlugOk(false);
      setSlugHint(result.error);
      return;
    }
    notify.success(
      normalized !== profile.slug
        ? `Store saved — booking URL is now /book/${normalized}`
        : "Store profile saved — online booking updated"
    );
    router.refresh();
  }

  async function onUpload(kind: BrandKind, file: File) {
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

  async function onRemove(kind: BrandKind) {
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
        <CardContent className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <BrandImageControl
            kind="logo"
            label="Logo"
            hint="Square works best · drag & drop ok"
            imageUrl={profile.logoUrl}
            busy={uploading === "logo"}
            disabled={uploading !== null}
            onUpload={(file) => onUpload("logo", file)}
            onRemove={() => onRemove("logo")}
          />
          <BrandImageControl
            kind="cover"
            label="Cover photo"
            hint="Wide image · drag & drop ok"
            imageUrl={profile.coverUrl}
            busy={uploading === "cover"}
            disabled={uploading !== null}
            onUpload={(file) => onUpload("cover", file)}
            onRemove={() => onRemove("cover")}
          />
          <p className="text-xs text-muted-foreground lg:col-span-2">
            JPG, PNG, or WebP · max 5 MB
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
              <Label htmlFor="store-slug">Booking URL</Label>
              <div className="flex overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground">
                  /book/
                </span>
                <Input
                  id="store-slug"
                  value={slug}
                  onChange={(e) =>
                    setSlug(slugify(e.target.value) || e.target.value.toLowerCase())
                  }
                  required
                  spellCheck={false}
                  autoComplete="off"
                  className="rounded-none border-0 focus-visible:ring-0"
                  placeholder="your-salon"
                />
              </div>
              {slugHint && (
                <p
                  className={cn(
                    "text-xs",
                    slugOk === false
                      ? "font-medium text-destructive"
                      : slugOk
                        ? "text-emerald-700"
                        : "text-muted-foreground"
                  )}
                >
                  {slugHint}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Unique per store. If another salon already uses this link, you cannot take it.
              </p>
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
                placeholder={
                  "Arrive five minutes early\nBring inspiration photos\nCall 24 hours ahead to cancel"
                }
              />
              <p className="text-xs text-muted-foreground">One tip per line works best.</p>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving || slugOk === false}>
                {saving ? "Saving…" : "Save store profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
