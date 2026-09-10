"use client";

import { useEffect, useState, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { notify } from "@/lib/toast";
import {
  checkSalonNameAvailable,
  createSalonOrganization,
} from "@/lib/actions/onboarding";
import { getRememberedPartnerReferral } from "@/lib/actions/partners";
import {
  DEFAULT_STORE_COUNTRY,
} from "@/lib/location/store-location";
import { CountrySearchSelect } from "@/components/features/location/country-search-select";
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
  const [city, setCity] = useState("");
  const [country, setCountry] = useState<string>(DEFAULT_STORE_COUNTRY);
  const [nameOk, setNameOk] = useState<boolean | null>(null);
  const [nameHint, setNameHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [partnerRef, setPartnerRef] = useState<string | null>(null);

  useEffect(() => {
    void getRememberedPartnerReferral().then((code) => {
      if (code) setPartnerRef(code);
    });
  }, []);

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
    if (city.trim().length < 2) {
      notify.error("Enter your city");
      return;
    }
    if (country.trim().length < 2) {
      notify.error("Select your country");
      return;
    }

    setLoading(true);
    const result = await createSalonOrganization({
      salonName: name,
      city,
      country,
      // Quiet defaults — online booking can be configured later
      bookingSlotMinutes: 30,
      bookingDaysAhead: 14,
      referralCode: partnerRef,
    });
    if (result.error) {
      notify.error(result.error);
      setLoading(false);
      return;
    }
    notify.success("Salon ready — welcome to Beautora");
    const { markGuideAutoOpen } = await import("@/lib/guide/storage");
    markGuideAutoOpen();
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
        Start with POS, staff, and sales. City and country help customers find you — and power
        store grouping later.
      </p>

      {userEmail && (
        <p className="mt-3 text-xs text-[var(--m-muted)]">
          Signed in as <span className="font-medium text-[var(--m-ink)]">{userEmail}</span>
        </p>
      )}

      {partnerRef ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          Partner referral <span className="font-semibold">@{partnerRef}</span> will be linked to
          this store.
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="salonName" className="text-sm font-medium text-[var(--m-ink-soft)]">
            Salon name <span className="text-[var(--m-accent)]">*</span>
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
            required
          />
          {nameHint && (
            <p className={cn("text-xs", nameOk === false ? "text-red-700" : "text-[var(--m-muted)]")}>
              {nameHint}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium text-[var(--m-ink-soft)]">
              City <span className="text-[var(--m-accent)]">*</span>
            </label>
            <input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void finish();
              }}
              placeholder="e.g. Lahore"
              className={fieldClassName}
              autoComplete="address-level2"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="country" className="text-sm font-medium text-[var(--m-ink-soft)]">
              Country <span className="text-[var(--m-accent)]">*</span>
            </label>
            <CountrySearchSelect
              id="country"
              name="country"
              value={country}
              onValueChange={setCountry}
              variant="marketing"
              required
              placeholder="Type to search country…"
            />
          </div>
        </div>

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
