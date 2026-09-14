"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="light"
      position="top-center"
      richColors
      closeButton
      expand
      visibleToasts={5}
      duration={3500}
      gap={12}
      offset={{ top: 20 }}
      className="!z-[200000]"
      style={{ zIndex: 200000 }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !z-[200000] !border !border-border/80 !bg-card !text-card-foreground !shadow-lg !shadow-black/5 !rounded-xl !font-[family-name:var(--font-geist-sans)]",
          title: "!text-sm !font-semibold !tracking-tight",
          description: "!text-sm !text-muted-foreground",
          actionButton:
            "!bg-primary !text-primary-foreground !font-medium !rounded-lg",
          cancelButton: "!bg-muted !text-muted-foreground !rounded-lg",
          closeButton:
            "!border-border/80 !bg-card !text-muted-foreground hover:!bg-muted hover:!text-foreground",
          success:
            "!border-emerald-200/90 !bg-emerald-50 !text-emerald-950 [&_[data-icon]]:!text-emerald-600",
          error:
            "!border-red-200/90 !bg-red-50 !text-red-950 [&_[data-icon]]:!text-red-600",
          warning:
            "!border-amber-200/90 !bg-amber-50 !text-amber-950 [&_[data-icon]]:!text-amber-600",
          info: "!border-teal-200/90 !bg-teal-50 !text-teal-950 [&_[data-icon]]:!text-teal-700",
          loading: "!border-border/80 !bg-card",
        },
      }}
    />
  );
}
