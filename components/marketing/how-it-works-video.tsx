"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { HowItWorksVideoSource } from "@/lib/marketing/how-it-works-video";
import { cn } from "@/lib/utils";

type HowItWorksVideoProps = {
  source: HowItWorksVideoSource;
  className?: string;
  /** Restart load when the language/source changes */
  sourceKey: string;
};

const SKIP_SECONDS = 10;

function pickSrc(source: HowItWorksVideoSource) {
  if (typeof window === "undefined") return source.mp4;
  return window.matchMedia("(max-width: 640px)").matches
    ? source.mp4Mobile
    : source.mp4;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Fast-loading walkthrough player with seek + fullscreen:
 * - Poster first, video loads near viewport
 * - Scrub bar + ±10s so guests can jump anytime
 * - Fullscreen on the player stage
 */
export function HowItWorksVideo({ source, sourceKey, className }: HowItWorksVideoProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

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
    setReady(false);
    setPlaying(false);
    setFailed(false);
    setMuted(true);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
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

    const syncBuffer = () => {
      try {
        if (video.buffered.length > 0) {
          setBuffered(video.buffered.end(video.buffered.length - 1));
        }
      } catch {
        /* ignore */
      }
    };

    const onCanPlay = () => {
      setReady(true);
      setFailed(false);
      if (Number.isFinite(video.duration)) setDuration(video.duration);
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
    const onTime = () => {
      if (!scrubbing) setCurrentTime(video.currentTime);
      syncBuffer();
    };
    const onMeta = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration);
      syncBuffer();
    };

    video.addEventListener("canplay", onCanPlay, { once: true });
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("progress", syncBuffer);
    video.addEventListener("durationchange", onMeta);
    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("progress", syncBuffer);
      video.removeEventListener("durationchange", onMeta);
    };
  }, [shouldLoad, sourceKey, scrubbing]);

  useEffect(() => {
    const onFs = () => {
      const node = rootRef.current;
      const active =
        document.fullscreenElement === node ||
        // Safari
        (document as Document & { webkitFullscreenElement?: Element })
          .webkitFullscreenElement === node;
      setIsFullscreen(Boolean(active));
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs as EventListener);
    };
  }, []);

  function ensureLoaded() {
    if (!shouldLoad) setShouldLoad(true);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    ensureLoaded();
    if (!shouldLoad) return;
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

  function seekBy(delta: number, e?: MouseEvent) {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video || !ready) {
      ensureLoaded();
      return;
    }
    const next = Math.min(
      Math.max(0, video.currentTime + delta),
      Number.isFinite(video.duration) ? video.duration : video.currentTime + delta
    );
    video.currentTime = next;
    setCurrentTime(next);
  }

  function seekToRatio(ratio: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const next = Math.min(Math.max(0, ratio), 1) * video.duration;
    video.currentTime = next;
    setCurrentTime(next);
  }

  function onScrubPointer(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    const track = e.currentTarget;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    seekToRatio(ratio);
  }

  function onScrubDown(e: ReactPointerEvent<HTMLDivElement>) {
    ensureLoaded();
    setScrubbing(true);
    onScrubPointer(e);
    const track = e.currentTarget;
    track.setPointerCapture(e.pointerId);
  }

  function onScrubMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!scrubbing) return;
    onScrubPointer(e);
  }

  function onScrubUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!scrubbing) return;
    setScrubbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  async function toggleFullscreen(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const node = rootRef.current;
    if (!node) return;

    type FsEl = HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element;
    };

    const active =
      document.fullscreenElement === node || doc.webkitFullscreenElement === node;

    try {
      if (active) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } else {
        const el = node as FsEl;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    } catch {
      /* browser blocked fullscreen */
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={rootRef}
      className={cn(
        "group relative aspect-video w-full overflow-hidden bg-[var(--m-ink)]",
        isFullscreen && "aspect-auto h-full min-h-[100dvh] rounded-none",
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
          ready && (playing || currentTime > 0.2) ? "opacity-0" : "opacity-100"
        )}
        priority={false}
      />

      <video
        ref={videoRef}
        key={`video-${sourceKey}`}
        className={cn(
          "absolute inset-0 size-full object-contain bg-black transition-opacity duration-500",
          ready ? "opacity-100" : "opacity-0"
        )}
        playsInline
        muted
        preload="none"
        poster={source.poster}
        aria-label={source.title}
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,33,29,0.2)_0%,transparent_28%,transparent_55%,rgba(6,33,29,0.75)_100%)]"
        aria-hidden
      />

      {/* Center play — only toggles play, not seeking */}
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

      {/* Control bar — always interactive for scrub / fullscreen */}
      <div
        className="absolute inset-x-0 bottom-0 z-[3] space-y-2 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 pb-3 pt-10 sm:px-4 sm:pb-4"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Seek track */}
        <div
          role="slider"
          aria-label="Seek video"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          className="group/seek relative h-2 cursor-pointer touch-none rounded-full bg-white/20"
          onPointerDown={onScrubDown}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubUp}
          onPointerCancel={onScrubUp}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") seekBy(SKIP_SECONDS);
            if (e.key === "ArrowLeft") seekBy(-SKIP_SECONDS);
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/35"
            style={{ width: `${Math.min(bufferedPct, 100)}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--m-accent-soft)]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
          <div
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow opacity-100 sm:opacity-0 sm:group-hover/seek:opacity-100"
            style={{ left: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="inline-flex size-9 items-center justify-center text-white transition-colors hover:bg-white/10 sm:size-10"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="size-4 fill-current translate-x-px" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => seekBy(-SKIP_SECONDS, e)}
            className="inline-flex size-9 items-center justify-center text-white transition-colors hover:bg-white/10 sm:size-10"
            aria-label={`Back ${SKIP_SECONDS} seconds`}
            title={`−${SKIP_SECONDS}s`}
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            type="button"
            onClick={(e) => seekBy(SKIP_SECONDS, e)}
            className="inline-flex size-9 items-center justify-center text-white transition-colors hover:bg-white/10 sm:size-10"
            aria-label={`Forward ${SKIP_SECONDS} seconds`}
            title={`+${SKIP_SECONDS}s`}
          >
            <RotateCw className="size-4" />
          </button>

          <p className="ml-1 min-w-[5.5rem] text-[11px] tabular-nums tracking-wide text-white/85 sm:text-xs">
            {formatTime(currentTime)}
            <span className="text-white/45"> / </span>
            {formatTime(duration)}
          </p>

          <p className="ml-auto hidden max-w-[12rem] truncate text-[10px] font-medium uppercase tracking-[0.16em] text-white/70 sm:block">
            {source.nativeLabel ?? source.label}
          </p>

          <button
            type="button"
            onClick={toggleMute}
            className="inline-flex size-9 items-center justify-center text-white transition-colors hover:bg-white/10 sm:size-10"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex size-9 items-center justify-center text-white transition-colors hover:bg-white/10 sm:size-10"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
        </div>
      </div>

      {!ready && shouldLoad && !failed ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-0.5 overflow-hidden bg-white/10">
          <div className="h-full w-1/3 animate-pulse bg-[var(--m-accent-soft)]" />
        </div>
      ) : null}

      {failed ? (
        <p className="absolute inset-x-0 bottom-24 z-[2] px-4 text-center text-sm text-white/80">
          Video couldn&apos;t load. Tap play to retry.
        </p>
      ) : null}
    </div>
  );
}
