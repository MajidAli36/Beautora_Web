"use client";

import { useEffect, useState, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
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
import {
  PRODUCT_INTENT_OPTIONS,
  type ProductIntent,
} from "@/lib/auth/account-types";
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
  const [productIntent, setProductIntent] = useState<ProductIntent | null>(null);
  const [salonName, setSalonName] = useState(initialSalonName);
  const [phone, setPhone] = useState("");
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
    if (!productIntent) {
      notify.error("Choose Marketplace, Salon POS, or Both");
      return;
    }
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
    if (phone.trim().replace(/\D/g, "").length < 7) {
      notify.error("Enter a valid phone number");
      return;
    }

    setLoading(true);
    const result = await createSalonOrganization({
      salonName: name,
      city,
      country,
      phone,
      bookingSlotMinutes: 30,
      bookingDaysAhead: 14,
      referralCode: partnerRef,
      productIntent,
    });
    if (result.error) {
      notify.error(result.error);
      setLoading(false);
      return;
    }
    notify.success("Salon ready — welcome to Beautora");
    const { markGuideAutoOpen } = await import("@/lib/guide/storage");
    markGuideAutoOpen();
    router.push(result.landingPath ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-card w-full max-w-[480px] border border-[var(--m-line)] bg-white/90 p-4 sm:p-7 lg:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--m-accent)]">
        Quick start
      </p>
      <h2 className="mt-1.5 font-display text-[1.45rem] font-semibold tracking-tight text-[var(--m-ink)] sm:text-[1.75rem]">
        Configure your Beautora workspace
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">
        Choose what you want to run, then name your store. You can refine settings later.
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

      <div className="mt-6 space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[var(--m-ink-soft)]">
            What do you want to configure? <span className="text-[var(--m-accent)]">*</span>
          </legend>
          <div className="space-y-2">
            {PRODUCT_INTENT_OPTIONS.map((opt) => {
              const selected = productIntent === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setProductIntent(opt.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border px-3 py-3 text-left transition-colors",
                    selected
                      ? "border-[var(--m-ink)] bg-[var(--m-mist)]"
                      : "border-[var(--m-line)] hover:border-[var(--m-accent)]/50"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center border",
                      selected
                        ? "border-[var(--m-ink)] bg-[var(--m-ink)] text-white"
                        : "border-[var(--m-line)]"
                    )}
                  >
                    {selected ? <Check className="size-3" /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--m-ink)]">
                      {opt.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[var(--m-muted)]">
                      {opt.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

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
            autoComplete="organization"
            required
          />
          {nameHint && (
            <p className={cn("text-xs", nameOk === false ? "text-red-700" : "text-[var(--m-muted)]")}>
              {nameHint}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-[var(--m-ink-soft)]">
            Phone number <span className="text-[var(--m-accent)]">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void finish();
            }}
            placeholder="e.g. 0301 1234567"
            className={fieldClassName}
            autoComplete="tel"
            required
          />
          <p className="text-xs text-[var(--m-muted)]">
            Required for bookings, WhatsApp, and platform review.
          </p>
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
          disabled={loading || nameOk === false || !productIntent}
          onClick={() => void finish()}
          className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[var(--m-ink)] text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)] disabled:opacity-60"
        >
          {loading
            ? "Opening workspace…"
            : productIntent === "marketplace"
              ? "Open Marketplace"
              : productIntent === "salon_pos"
                ? "Open Salon POS"
                : "Open workspace"}
          {!loading && <ArrowRight className="size-4" />}
        </button>

        <p className="text-center text-[11px] text-[var(--m-muted)]">
          You can refine booking hours and WhatsApp templates later under Settings.
        </p>
      </div>
    </div>
  );
}

const fieldClassName =
  "h-11 w-full border border-[var(--m-line)] bg-white px-3.5 text-base text-[var(--m-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--m-muted)]/70 focus:border-[var(--m-accent)] focus:ring-4 focus:ring-[var(--m-accent)]/15 sm:h-12 sm:text-sm";
