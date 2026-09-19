"use client";

import { useEffect, useEffectEvent, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import {
  HOW_IT_WORKS_VIDEO,
  HOW_IT_WORKS_VIDEO_MP4,
  HOW_IT_WORKS_VIDEO_MP4_MOBILE,
} from "@/lib/marketing/how-it-works-video";
import { cn } from "@/lib/utils";

type HowItWorksVideoProps = {
  className?: string;
};

function pickSrc() {
  if (typeof window === "undefined") return HOW_IT_WORKS_VIDEO_MP4;
  return window.matchMedia("(max-width: 640px)").matches
    ? HOW_IT_WORKS_VIDEO_MP4_MOBILE
    : HOW_IT_WORKS_VIDEO_MP4;
}

/**
 * Fast-loading walkthrough player:
 * - Poster paints immediately (no video bytes)
 * - Source attaches only when near viewport
 * - Muted autoplay once ready; user can unmute
 */
export function HowItWorksVideo({ className }: HowItWorksVideoProps) {
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

  useEffect(() => {
    if (!shouldLoad) return;
    const video = videoRef.current;
    if (!video) return;

    const src = pickSrc();
    if (video.dataset.src === src) return;
    video.dataset.src = src;

    // Clear then set for clean load on mobile/desktop swap
    video.removeAttribute("src");
    while (video.firstChild) video.removeChild(video.firstChild);
    const source = document.createElement("source");
    source.src = src;
    source.type = "video/mp4";
    video.appendChild(source);
    video.load();
  }, [shouldLoad]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    const onCanPlay = () => {
      setReady(true);
      setFailed(false);
      video.muted = true;
      setMuted(true);
      void video.play().then(() => setPlaying(true)).catch(() => {
        setPlaying(false);
      });
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
  }, [shouldLoad]);

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
    >
      {/* Instant paint */}
      <Image
        src={HOW_IT_WORKS_VIDEO.poster}
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
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-500",
          ready ? "opacity-100" : "opacity-0"
        )}
        playsInline
        muted
        loop
        preload="none"
        poster={HOW_IT_WORKS_VIDEO.poster}
        aria-label={HOW_IT_WORKS_VIDEO.title}
      />

      {/* Soft vignette so controls read on any frame */}
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
        <p className="max-w-[16rem] text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 sm:max-w-xs">
          Beautora walkthrough
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
