"use client";

import { useEffect, useEffectEvent, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { HowItWorksVideoSource } from "@/lib/marketing/how-it-works-video";
import { cn } from "@/lib/utils";

type HowItWorksVideoProps = {
  source: HowItWorksVideoSource;
  className?: string;
  /** Restart load when the language/source changes */
  sourceKey: string;
};

function pickSrc(source: HowItWorksVideoSource) {
  if (typeof window === "undefined") return source.mp4;
  return window.matchMedia("(max-width: 640px)").matches
    ? source.mp4Mobile
    : source.mp4;
}

/**
 * Fast-loading walkthrough player:
 * - Poster paints immediately (no video bytes)
 * - Source attaches only when near viewport
 * - Reloads cleanly when language tab changes
 */
export function HowItWorksVideo({ source, sourceKey, className }: HowItWorksVideoProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  const onIntersect = useEffectEvent((near: boolean) => {
    if (near) setShouldLoad(true);
  });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onIntersect(true);
      },
      { rootMargin: "240px 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reset playback state when switching language
  useEffect(() => {
    setReady(false);
    setPlaying(false);
    setFailed(false);
    setMuted(true);
    const video = videoRef.current;
    if (video) {
      video.pause();
      delete video.dataset.src;
      video.removeAttribute("src");
      while (video.firstChild) video.removeChild(video.firstChild);
    }
  }, [sourceKey]);

  useEffect(() => {
    if (!shouldLoad) return;
    const video = videoRef.current;
    if (!video) return;

    const src = pickSrc(source);
    if (video.dataset.src === src) return;
    video.dataset.src = src;

    video.removeAttribute("src");
    while (video.firstChild) video.removeChild(video.firstChild);
    const el = document.createElement("source");
    el.src = src;
    el.type = "video/mp4";
    video.appendChild(el);
    video.load();
  }, [shouldLoad, source, sourceKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    const onCanPlay = () => {
      setReady(true);
      setFailed(false);
      video.muted = true;
      setMuted(true);
      void video
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setFailed(true);

    video.addEventListener("canplay", onCanPlay, { once: true });
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
    };
  }, [shouldLoad, sourceKey]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (!shouldLoad) {
      setShouldLoad(true);
      return;
    }
    if (video.paused) void video.play();
    else video.pause();
  }

  function toggleMute(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "group relative aspect-video w-full overflow-hidden bg-[var(--m-ink)]",
        className
      )}
      lang={source.lang}
      dir={source.dir ?? "ltr"}
    >
      <Image
        key={`poster-${sourceKey}`}
        src={source.poster}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 1120px"
        className={cn(
          "object-cover transition-opacity duration-500",
          ready && playing ? "opacity-0" : "opacity-100"
        )}
        priority={false}
      />

      <video
        ref={videoRef}
        key={`video-${sourceKey}`}
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-500",
          ready ? "opacity-100" : "opacity-0"
        )}
        playsInline
        muted
        loop
        preload="none"
        poster={source.poster}
        aria-label={source.title}
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,33,29,0.15)_0%,transparent_35%,transparent_65%,rgba(6,33,29,0.55)_100%)]"
        aria-hidden
      />

      <button
        type="button"
        onClick={togglePlay}
        className="absolute inset-0 z-[1] flex items-center justify-center"
        aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
      >
        <span
          className={cn(
            "inline-flex size-16 items-center justify-center bg-white text-[var(--m-ink)] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.55)] transition-all duration-300 sm:size-[4.5rem]",
            playing
              ? "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
              : "opacity-100 scale-100"
          )}
        >
          {playing ? (
            <Pause className="size-6 fill-current sm:size-7" />
          ) : (
            <Play className="size-6 fill-current translate-x-0.5 sm:size-7" />
          )}
        </span>
      </button>

      <div className="absolute bottom-4 left-4 right-4 z-[2] flex items-end justify-between gap-3 sm:bottom-5 sm:left-5 sm:right-5">
        <p className="max-w-[18rem] text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 sm:max-w-xs">
          {source.nativeLabel ?? source.label} · Beautora
        </p>
        <button
          type="button"
          onClick={toggleMute}
          className="inline-flex size-10 items-center justify-center border border-white/25 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      {!ready && shouldLoad && !failed ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-0.5 overflow-hidden bg-white/10">
          <div className="h-full w-1/3 animate-pulse bg-[var(--m-accent-soft)]" />
        </div>
      ) : null}

      {failed ? (
        <p className="absolute inset-x-0 bottom-16 z-[2] px-4 text-center text-sm text-white/80">
          Video couldn&apos;t load. Tap play to retry.
        </p>
      ) : null}
    </div>
  );
}
