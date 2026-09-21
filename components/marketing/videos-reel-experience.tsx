"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  MapPin,
  Music2,
  Play,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { BeautoraLogo } from "@/components/brand/beautora-logo";
import {
  DEFAULT_MARKETPLACE_REEL_FILTERS,
  MARKETPLACE_REEL_META,
  MARKETPLACE_REELS,
  countryFlag,
  filterMarketplaceReels,
  listReelCities,
  listReelCountries,
  type MarketplaceReel,
  type MarketplaceReelFilters,
} from "@/lib/marketing/videos-reels";
import { SYNCOPS } from "@/lib/print/syncops";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const full = Math.floor(rating);
  const cls = size === "md" ? "size-3.5" : "size-3";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            cls,
            i < full ? "fill-amber-300 text-amber-300" : "fill-transparent text-white/35"
          )}
        />
      ))}
    </span>
  );
}

function SidebarSection({
  title,
  open,
  onToggle,
  children,
  badge,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <section className="border-b border-white/10">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-white/5"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--m-accent-soft)]">
            {title}
          </span>
          {badge ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
              {badge}
            </span>
          ) : null}
        </span>
        {open ? <ChevronUp className="size-4 text-white/55" /> : <ChevronDown className="size-4 text-white/55" />}
      </button>
      {open ? <div className="px-3 pb-4">{children}</div> : null}
    </section>
  );
}

function ReelSlide({
  reel,
  active,
  muted,
  onToggleMute,
  onPlayingChange,
}: {
  reel: MarketplaceReel;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onPlayingChange: (playing: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const syncPlayback = useEffectEvent(async () => {
    const el = videoRef.current;
    if (!el || failed) return;
    el.muted = muted;
    if (active) {
      try {
        await el.play();
        setStarted(true);
        setPlaying(true);
        onPlayingChange(true);
      } catch {
        setPlaying(false);
        onPlayingChange(false);
      }
    } else {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      onPlayingChange(false);
    }
  });

  useEffect(() => {
    void syncPlayback();
  }, [active, muted, failed, syncPlayback]);

  const togglePlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el || failed) {
      setStarted(true);
      return;
    }
    if (el.paused) {
      try {
        await el.play();
        setStarted(true);
        setPlaying(true);
        onPlayingChange(true);
      } catch {
        /* autoplay */
      }
    } else {
      el.pause();
      setPlaying(false);
      onPlayingChange(false);
    }
  }, [failed, onPlayingChange]);

  return (
    <article className="relative flex h-full w-full shrink-0 snap-start snap-always items-center justify-center px-3 py-3 sm:px-4">
      <div className="relative aspect-[9/16] h-full max-h-full w-auto max-w-[min(100%,420px)] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-28px_rgba(0,0,0,0.75)]">
        <div className="absolute inset-0">
          <Image
            src={reel.poster}
            alt=""
            fill
            sizes="420px"
            className={cn(
              "object-cover transition-transform duration-[12s] ease-out",
              active && started ? "scale-110" : "scale-100",
              !failed && playing ? "opacity-0" : "opacity-100"
            )}
            priority={active}
          />
          {!failed ? (
            <video
              ref={videoRef}
              className={cn(
                "absolute inset-0 size-full object-cover",
                playing ? "opacity-100" : "opacity-0"
              )}
              src={reel.src}
              poster={reel.poster}
              playsInline
              loop
              muted={muted}
              preload={active ? "auto" : "metadata"}
              onError={() => setFailed(true)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                setCurrentTime(v.currentTime || 0);
                if (v.duration) setProgress(v.currentTime / v.duration);
                setDuration(v.duration || 0);
              }}
              onPlay={() => {
                setPlaying(true);
                onPlayingChange(true);
              }}
              onPause={() => {
                setPlaying(false);
                onPlayingChange(false);
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,33,29,0.4)_0%,transparent_26%,transparent_52%,rgba(6,33,29,0.92)_100%)]" />
        </div>

        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => void togglePlay()}
          className="absolute inset-0 z-10"
        />

        {!playing ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
            <span className="flex size-16 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm">
              <Play className="size-7 fill-white" />
            </span>
            <p className="text-xs font-medium tracking-wide text-white/80">Tap to play</p>
          </div>
        ) : null}

        <div className="absolute left-3 top-3 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/85 backdrop-blur-md">
            Marketplace
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 p-4 pb-5">
          <div className="pointer-events-auto">
            <div className="flex items-center gap-2 text-[11px] text-white/75">
              <span>
                {countryFlag(reel.countryCode)} {reel.city}, {reel.country}
              </span>
              <span className="text-white/35">·</span>
              <span>{reel.category}</span>
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-[var(--m-ink)]">
                <BeautoraLogo size="sm" className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">@{reel.handle}</p>
                <p className="truncate text-[11px] text-white/65">{reel.shopName}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-lg font-semibold text-white">
                  {reel.currency} {reel.priceLabel}
                </p>
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  <Stars rating={reel.rating} />
                  <span className="text-[10px] tabular-nums text-white/70">
                    {reel.rating.toFixed(1)} ({reel.reviewCount})
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-3 font-display text-xl font-semibold leading-tight text-white">
              {reel.title}
            </p>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/85">
              {reel.caption}
            </p>

            <Link
              href={reel.href}
              className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-4 text-xs font-semibold text-[var(--m-ink)] transition-colors hover:bg-[var(--m-mist)]"
              onClick={(e) => e.stopPropagation()}
            >
              View product
            </Link>

            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/70">
              <Music2 className="size-3.5 shrink-0" />
              <span className="truncate">{reel.sound}</span>
            </p>
          </div>

          <div className="mt-4">
            <div className="h-0.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-150"
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-white/55">
              <span>{formatTime(failed ? 0 : currentTime)}</span>
              <span>{failed || !duration ? reel.durationLabel : formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

const RATING_OPTIONS: { value: MarketplaceReelFilters["minRating"]; label: string }[] = [
  { value: 0, label: "Any rating" },
  { value: 3, label: "3+ stars" },
  { value: 4, label: "4+ stars" },
  { value: 4.5, label: "4.5+ stars" },
];

export function VideosReelExperience({
  initialReels = MARKETPLACE_REELS,
}: {
  initialReels?: MarketplaceReel[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(true);
  const [ratingOpen, setRatingOpen] = useState(true);
  const [filters, setFilters] = useState<MarketplaceReelFilters>(DEFAULT_MARKETPLACE_REEL_FILTERS);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  const catalog = initialReels.length > 0 ? initialReels : MARKETPLACE_REELS;
  const countries = useMemo(() => listReelCountries(catalog), [catalog]);
  const cities = useMemo(
    () => listReelCities(filters.country, catalog),
    [filters.country, catalog]
  );
  const reels = useMemo(
    () => filterMarketplaceReels(filters, catalog),
    [filters, catalog]
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setSidebarOpen(mq.matches);
  }, []);

  useEffect(() => {
    setIndex(0);
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [filters]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const patchFilters = useCallback((partial: Partial<MarketplaceReelFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...partial };
      if (partial.country !== undefined && partial.country !== prev.country) {
        next.city = "all";
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_MARKETPLACE_REEL_FILTERS);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(reels.length - 1, next));
      setIndex(clamped);
      const slide = scrollerRef.current?.children[clamped] as HTMLElement | undefined;
      slide?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    [reels.length]
  );

  const onScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node || !reels.length) return;
    const i = Math.round(node.scrollTop / node.clientHeight);
    setIndex(Math.max(0, Math.min(reels.length - 1, i)));
  }, [reels.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === "m" || e.key === "M") {
        setMuted((v) => !v);
      } else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        const video = scrollerRef.current?.querySelectorAll("video")?.[index] as
          | HTMLVideoElement
          | undefined;
        if (!video) return;
        if (video.paused) void video.play();
        else video.pause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index]);

  const active = reels[index];
  const hasActiveFilters =
    filters.country !== "all" ||
    filters.city !== "all" ||
    filters.minRating > 0 ||
    filters.q.trim().length > 0 ||
    filters.sort !== "rating";

  return (
    <div className="fixed inset-0 z-[80] flex bg-[var(--m-ink)] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, #0f3a33 0%, #06211d 55%, #031512 100%)",
        }}
      />

      {/* Left panel */}
      <aside
        className={cn(
          "relative z-10 flex h-full w-[min(100%,300px)] shrink-0 flex-col border-r border-white/10 bg-[rgba(3,21,18,0.88)] backdrop-blur-xl transition-all duration-300",
          sidebarOpen
            ? "translate-x-0"
            : "pointer-events-none absolute -translate-x-full opacity-0 lg:relative lg:w-0 lg:border-0 lg:overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--m-accent-soft)]">
              {MARKETPLACE_REEL_META.eyebrow}
            </p>
            <p className="mt-1 text-sm font-medium text-white/90">Marketplace filters</p>
          </div>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full border border-white/15 text-white/80 hover:bg-white/10"
            aria-label="Hide filters"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-white/10 px-4 py-3">
          <label className="sr-only" htmlFor="marketplace-reel-search">
            Search products
          </label>
          <input
            id="marketplace-reel-search"
            type="search"
            value={filters.q}
            placeholder="Search products, shops, cities…"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--m-accent)]"
            onChange={(e) => patchFilters({ q: e.target.value })}
          />
          <p className="mt-2 text-[11px] text-white/45">
            {reels.length} of {MARKETPLACE_REELS.length} product reels
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarSection
            title="Location"
            open={locationOpen}
            onToggle={() => setLocationOpen((v) => !v)}
            badge={
              filters.country === "all"
                ? "All"
                : filters.city === "all"
                  ? filters.country
                  : filters.city
            }
          >
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Country
            </p>
            <ul className="mb-4 space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => patchFilters({ country: "all", city: "all" })}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    filters.country === "all"
                      ? "bg-[var(--m-accent)]/25 text-white ring-1 ring-[var(--m-accent)]/45"
                      : "text-white/75 hover:bg-white/5"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden>🌐</span>
                    All countries
                  </span>
                  {filters.country === "all" ? (
                    <Check className="size-4 text-[var(--m-accent-soft)]" />
                  ) : (
                    <span className="text-[11px] text-white/40">{MARKETPLACE_REELS.length}</span>
                  )}
                </button>
              </li>
              {countries.map((c) => {
                const selected = filters.country === c.country;
                return (
                  <li key={c.country}>
                    <button
                      type="button"
                      onClick={() => patchFilters({ country: c.country })}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "bg-[var(--m-accent)]/25 text-white ring-1 ring-[var(--m-accent)]/45"
                          : "text-white/75 hover:bg-white/5"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden>{countryFlag(c.countryCode)}</span>
                        {c.country}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] text-white/40">{c.count}</span>
                        {selected ? <Check className="size-4 text-[var(--m-accent-soft)]" /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              City
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => patchFilters({ city: "all" })}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    filters.city === "all"
                      ? "bg-[var(--m-accent)]/25 text-white ring-1 ring-[var(--m-accent)]/45"
                      : "text-white/75 hover:bg-white/5"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-white/45" />
                    All cities
                    {filters.country !== "all" ? (
                      <span className="text-[10px] text-white/40">in {filters.country}</span>
                    ) : null}
                  </span>
                  {filters.city === "all" ? (
                    <Check className="size-4 text-[var(--m-accent-soft)]" />
                  ) : null}
                </button>
              </li>
              {cities.map((c) => {
                const selected = filters.city === c.city;
                return (
                  <li key={c.city}>
                    <button
                      type="button"
                      onClick={() => patchFilters({ city: c.city })}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "bg-[var(--m-accent)]/25 text-white ring-1 ring-[var(--m-accent)]/45"
                          : "text-white/75 hover:bg-white/5"
                      )}
                    >
                      <span>{c.city}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] text-white/40">{c.count}</span>
                        {selected ? <Check className="size-4 text-[var(--m-accent-soft)]" /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </SidebarSection>

          <SidebarSection
            title="Rating & products"
            open={ratingOpen}
            onToggle={() => setRatingOpen((v) => !v)}
            badge={filters.minRating === 0 ? "Any" : `${filters.minRating}+`}
          >
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Minimum rating
            </p>
            <ul className="mb-4 space-y-1">
              {RATING_OPTIONS.map((opt) => {
                const selected = filters.minRating === opt.value;
                return (
                  <li key={opt.label}>
                    <button
                      type="button"
                      onClick={() => patchFilters({ minRating: opt.value })}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "bg-[var(--m-accent)]/25 text-white ring-1 ring-[var(--m-accent)]/45"
                          : "text-white/75 hover:bg-white/5"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Star className="size-3.5 fill-amber-300/80 text-amber-300/80" />
                        {opt.label}
                      </span>
                      {selected ? <Check className="size-4 text-[var(--m-accent-soft)]" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Sort products
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => patchFilters({ sort: "rating" })}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                  filters.sort === "rating"
                    ? "bg-white text-[var(--m-ink)]"
                    : "border border-white/15 text-white/75 hover:bg-white/5"
                )}
              >
                Rating wise
              </button>
              <button
                type="button"
                onClick={() => patchFilters({ sort: "newest" })}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                  filters.sort === "newest"
                    ? "bg-white text-[var(--m-ink)]"
                    : "border border-white/15 text-white/75 hover:bg-white/5"
                )}
              >
                Catalogue order
              </button>
            </div>

            <p className="mt-4 px-1 text-[11px] leading-relaxed text-white/45">
              Products appear highest-rated first when Rating wise is on — same idea as browsing
              top Marketplace listings.
            </p>
          </SidebarSection>
        </div>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="h-10 w-full rounded-xl border border-white/15 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear all filters
          </button>
        </div>
      </aside>

      {/* Stage */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            {!sidebarOpen ? (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-medium text-white/85 hover:bg-white/10"
              >
                <Filter className="size-3.5" />
                Filters
              </button>
            ) : null}
            <Link
              href="/shop"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-medium text-white/85 hover:bg-white/10"
            >
              <ArrowLeft className="size-3.5" />
              Shop
            </Link>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <BeautoraLogo size="sm" className="size-6 opacity-90" />
            <p className="text-xs font-semibold tracking-wide text-white/80">
              {MARKETPLACE_REEL_META.title}
            </p>
          </div>
          <p className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Powered by {SYNCOPS.builder.name}
          </p>
        </header>

        <div className="relative flex min-h-0 flex-1 items-stretch justify-center gap-3 px-2 pb-4 sm:gap-5 sm:px-4">
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            className="h-full w-full max-w-[460px] snap-y snap-mandatory overflow-y-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {reels.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-white/70">No Marketplace products match these filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-9 rounded-full border border-white/20 px-4 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              reels.map((reel, i) => (
                <div key={reel.id} className="h-full">
                  <ReelSlide
                    reel={reel}
                    active={i === index}
                    muted={muted}
                    onToggleMute={() => setMuted((v) => !v)}
                    onPlayingChange={setPlaying}
                  />
                </div>
              ))
            )}
          </div>

          <div className="hidden flex-col items-center justify-center gap-3 self-center sm:flex">
            <button
              type="button"
              aria-label="Previous reel"
              disabled={index <= 0 || reels.length === 0}
              onClick={() => goTo(index - 1)}
              className="inline-flex size-12 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition enabled:hover:bg-white/15 disabled:opacity-30"
            >
              <ChevronUp className="size-6" />
            </button>
            <p className="text-[11px] tabular-nums text-white/55">
              {reels.length ? index + 1 : 0}/{reels.length}
            </p>
            <button
              type="button"
              aria-label="Next reel"
              disabled={index >= reels.length - 1 || reels.length === 0}
              onClick={() => goTo(index + 1)}
              className="inline-flex size-12 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition enabled:hover:bg-white/15 disabled:opacity-30"
            >
              <ChevronDown className="size-6" />
            </button>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3 text-[10px] text-white/45 sm:px-6">
          <p>
            {active
              ? `${active.title} · ${active.city}, ${active.country} · ★ ${active.rating.toFixed(1)}`
              : "Beautora Marketplace reels"}
            {playing ? " · Playing" : ""}
          </p>
          <p className="hidden sm:block">
            <kbd className="rounded border border-white/15 px-1">↑↓</kbd> Navigate ·{" "}
            <kbd className="rounded border border-white/15 px-1">Space</kbd> Play/Pause ·{" "}
            <kbd className="rounded border border-white/15 px-1">M</kbd> Mute
          </p>
        </footer>
      </div>
    </div>
  );
}
