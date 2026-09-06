import { AuthBrandPanel } from "@/components/features/auth/auth-brand-panel";

type AuthShellProps = {
  children: React.ReactNode;
  slide?: 0 | 1 | 2;
};

export function AuthShell({ children, slide = 0 }: AuthShellProps) {
  return (
    <div className="auth-screen flex min-h-full flex-1 flex-col lg:flex-row">
      <div className="order-2 lg:order-1 lg:contents">
        <AuthBrandPanel slide={slide} />
      </div>
      <section className="relative order-1 flex flex-1 items-start justify-center bg-[var(--m-paper)] px-4 py-8 sm:items-center sm:px-8 sm:py-10 lg:order-2 lg:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_420px_at_85%_0%,rgba(61,107,95,0.08),transparent_55%)]"
        />
        <div className="relative w-full max-w-[420px]">{children}</div>
      </section>
    </div>
  );
}
