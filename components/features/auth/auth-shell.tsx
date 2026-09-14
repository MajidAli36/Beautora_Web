import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthBrandPanel } from "@/components/features/auth/auth-brand-panel";
import { BeautoraWordmark } from "@/components/brand/beautora-logo";

type AuthShellProps = {
  children: React.ReactNode;
  /** Kept for call-site compatibility; panel always starts on CEO once. */
  slide?: number;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="auth-screen grid min-h-dvh flex-1 grid-cols-1 lg:grid-cols-2">
      {/* Mobile top chrome */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[var(--m-ink)] px-4 py-3 sm:px-5 lg:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/75 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <Link href="/" className="transition-opacity hover:opacity-90" aria-label="Beautora home">
          <BeautoraWordmark size="sm" textClassName="text-white" />
        </Link>
      </header>

      {/* Left 50% — desktop brand */}
      <div className="hidden min-h-0 lg:block lg:h-dvh lg:overflow-hidden">
        <AuthBrandPanel />
      </div>

      {/* Right 50% — form */}
      <section className="relative flex min-h-0 min-w-0 flex-col overflow-y-auto overscroll-contain bg-[var(--m-paper)] lg:h-dvh">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_420px_at_85%_0%,rgba(61,107,95,0.08),transparent_55%)]"
        />
        <div className="relative mx-auto flex w-full max-w-[min(100%,28rem)] flex-1 flex-col justify-start px-[clamp(1rem,3.5vw,2.5rem)] py-[clamp(1.25rem,3.5vh,2.75rem)] lg:max-w-[min(92%,26rem)] lg:justify-center xl:max-w-[28rem]">
          {children}
        </div>
      </section>
    </div>
  );
}
