"use client";

import { useEffect, useState, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { notify } from "@/lib/toast";
import {
  checkSalonNameAvailable,
  createSalonOrganization,
} from "@/lib/actions/onboarding";
import { slugify } from "@/lib/onboarding/slug";
import { cn } from "@/lib/utils";

type OrganizationOnboardingProps = {
  initialSalonName?: string;
  userEmail?: string;
};

export function OrganizationOnboarding({
  initialSalonName = "",
  userEmail,
}: OrganizationOnboardingProps) {
  const router = useRouter();
  const [salonName, setSalonName] = useState(initialSalonName);
  const [nameOk, setNameOk] = useState<boolean | null>(null);
  const [nameHint, setNameHint] = useState<string | null>(null);
  const [seedStarterServices, setSeedStarterServices] = useState(true);
  const [loading, setLoading] = useState(false);

  const checkName = useEffectEvent(async (name: string) => {
    if (name.trim().length < 2) {
      setNameOk(null);
      setNameHint(null);
      return;
    }
    const result = await checkSalonNameAvailable(name);
    setNameOk(result.available);
    setNameHint(result.available ? null : result.error ?? null);
  });

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void checkName(salonName);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [salonName]);

  async function finish() {
    const name = salonName.trim();
    if (name.length < 2) {
      notify.error("Enter your salon name");
      return;
    }
    if (nameOk === false) {
      notify.error(nameHint ?? "This salon name is already taken");
      return;
    }

    setLoading(true);
    const result = await createSalonOrganization({
      salonName: name,
      slug: slugify(name),
      seedStarterServices,
      // Quiet defaults — online booking can be configured later
      bookingSlotMinutes: 30,
      bookingDaysAhead: 14,
    });
    if (result.error) {
      notify.error(result.error);
      setLoading(false);
      return;
    }
    notify.success("Salon ready — welcome to Beautora");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-card w-full max-w-[420px] border border-[var(--m-line)] bg-white/90 p-7 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--m-accent)]">
        Quick start
      </p>
      <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-[1.75rem]">
        Name your salon
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">
        Start with POS, staff, and sales. Online booking is optional — turn it on later when you
        want it.
      </p>

      {userEmail && (
        <p className="mt-3 text-xs text-[var(--m-muted)]">
          Signed in as <span className="font-medium text-[var(--m-ink)]">{userEmail}</span>
        </p>
      )}

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="salonName" className="text-sm font-medium text-[var(--m-ink-soft)]">
            Salon name
          </label>
          <input
            id="salonName"
            value={salonName}
            onChange={(e) => setSalonName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void finish();
            }}
            placeholder="e.g. Glow Studio"
            className={fieldClassName}
            autoFocus
            autoComplete="organization"
          />
          {nameHint && (
            <p className={cn("text-xs", nameOk === false ? "text-red-700" : "text-[var(--m-muted)]")}>
              {nameHint}
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3 border border-[var(--m-line)] bg-[var(--m-mist)]/70 p-3.5">
          <input
            type="checkbox"
            checked={seedStarterServices}
            onChange={(e) => setSeedStarterServices(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--m-ink)]"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--m-ink)]">
              <Sparkles className="size-3.5 text-[var(--m-accent)]" />
              Add a few starter services
            </span>
            <span className="mt-0.5 block text-xs text-[var(--m-muted)]">
              Helps POS &amp; sales right away. Edit anytime.
            </span>
          </span>
        </label>

        <button
          type="button"
          disabled={loading || nameOk === false}
          onClick={() => void finish()}
          className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[var(--m-ink)] text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)] disabled:opacity-60"
        >
          {loading ? "Opening dashboard…" : "Open dashboard"}
          {!loading && <ArrowRight className="size-4" />}
        </button>

        <p className="text-center text-[11px] text-[var(--m-muted)]">
          Booking page &amp; WhatsApp can be set later under Settings.
        </p>
      </div>
    </div>
  );
}

const fieldClassName =
  "h-12 w-full border border-[var(--m-line)] bg-white px-3.5 text-sm text-[var(--m-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--m-muted)]/70 focus:border-[var(--m-accent)] focus:ring-4 focus:ring-[var(--m-accent)]/15";
