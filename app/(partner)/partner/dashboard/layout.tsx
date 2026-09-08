import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner dashboard",
  robots: { index: false, follow: false },
};

/** Partner-only shell — no salon sidebar/header. */
export default function PartnerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-[#FAFAFA] text-foreground antialiased">
      {children}
    </div>
  );
}
