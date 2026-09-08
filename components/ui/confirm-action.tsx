"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";

type ConfirmResult = { error?: string; success?: boolean } | void;

type ConfirmActionProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  /** Toast on success. Pass empty string to skip toast. Default: "Done." */
  successMessage?: string;
  variant?: "default" | "destructive" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "xs";
  className?: string;
  disabled?: boolean;
  onConfirm: () => ConfirmResult | Promise<ConfirmResult>;
  children: React.ReactNode;
};

export function ConfirmAction({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pendingLabel,
  successMessage = "Done.",
  variant = "destructive",
  size = "sm",
  className,
  disabled,
  onConfirm,
  children,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const result = await onConfirm();
        if (result && typeof result === "object" && result.error) {
          notify.error(result.error);
          return;
        }
        if (successMessage) {
          notify.success(successMessage);
        }
        setOpen(false);
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant={variant}
            size={size}
            className={className}
            disabled={disabled}
          />
        }
      >
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? pendingLabel ?? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
