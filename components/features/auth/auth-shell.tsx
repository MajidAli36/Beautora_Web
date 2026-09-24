import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthBrandPanel } from "@/components/features/auth/auth-brand-panel";
import { BeautoraWordmark } from "@/components/brand/beautora-logo";

type AuthShellProps = {
  children: React.ReactNode;
  /** Kept for call-site compatibility; panel always starts on CEO once. */
  slide?: number;
};

/**
 * Auth chrome for login / signup / reset / invite / onboarding.
 * Always locks to the viewport and scrolls the form column — required on mobile
 * where tall signup forms otherwise clip with no usable scroll.
 */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="auth-screen flex h-dvh max-h-dvh w-full flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-2">
      {/* Mobile top chrome */}
      <header className="z-30 flex shrink-0 items-center justify-between border-b border-white/10 bg-[var(--m-ink)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 lg:hidden">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-white/75 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4 shrink-0" />
          Back
        </Link>
        <Link href="/" className="transition-opacity hover:opacity-90" aria-label="Beautora home">
          <BeautoraWordmark size="sm" textClassName="text-white" />
        </Link>
      </header>

      {/* Left — desktop brand only */}
      <div className="hidden min-h-0 lg:block lg:h-full lg:overflow-hidden">
        <AuthBrandPanel />
      </div>

      {/* Form column — the only scrollport (mobile + desktop) */}
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-[var(--m-paper)] [-webkit-overflow-scrolling:touch]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_420px_at_85%_0%,rgba(61,107,95,0.08),transparent_55%)]"
        />
        <div className="relative mx-auto flex w-full max-w-[min(100%,28rem)] flex-1 flex-col justify-start px-[clamp(1rem,4vw,2.5rem)] py-[clamp(1rem,3vh,2.75rem)] pb-[max(2rem,env(safe-area-inset-bottom))] lg:max-w-[min(92%,26rem)] lg:justify-center xl:max-w-[28rem]">
          {children}
        </div>
      </section>
    </div>
  );
}
