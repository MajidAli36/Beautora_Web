"use client";

import { useEffect, useRef } from "react";
import { notify } from "@/lib/toast";

type ActionLike = {
  error?: string;
  success?: boolean;
};

type UseActionToastOptions = {
  /** Shown when `state.success` is true. Defaults to "Saved successfully." */
  successMessage?: string;
  /**
   * Called after a successful save — typically close the dialog/drawer.
   * Prefer closing here; call `router.refresh()` via `scheduleRefresh` so the toast stays visible.
   */
  onSuccess?: () => void;
  /** Override the error toast body. Defaults to `state.error`. */
  errorMessage?: string | ((error: string) => string);
};

/**
 * Close a dialog/drawer, show a success toast on top, then refresh the page.
 * Keeps the toast visible (not trapped under the drawer, not cleared by an instant refresh).
 */
export function finishDialogSuccess(options: {
  close: () => void;
  message: string;
  refresh?: () => void;
  refreshDelayMs?: number;
}) {
  const { close, message, refresh, refreshDelayMs = 320 } = options;
  close();
  // Next frame: drawer gone → toast sits above the page
  requestAnimationFrame(() => {
    notify.success(message);
  });
  if (refresh) {
    window.setTimeout(refresh, refreshDelayMs);
  }
}

/**
 * Turns `useActionState` / ActionResult into Sonner toasts.
 * Dedupes by state object identity so the same result is not toasted twice.
 *
 * On success: closes dialog via `onSuccess` first, then shows the toast
 * (so toasts are not hidden under the right-side drawer).
 */
export function useActionToast(
  state: ActionLike | null | undefined,
  options: UseActionToastOptions = {}
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const lastStateRef = useRef<ActionLike | null | undefined>(undefined);

  useEffect(() => {
    if (!state || state === lastStateRef.current) return;
    if (!state.error && !state.success) return;

    lastStateRef.current = state;
    const { successMessage, onSuccess, errorMessage } = optionsRef.current;

    if (state.error) {
      const message =
        typeof errorMessage === "function"
          ? errorMessage(state.error)
          : (errorMessage ?? state.error);
      notify.error(message);
      return;
    }

    if (state.success) {
      // Close drawer/dialog first so the toast is not covered by z-50 panel
      onSuccess?.();
      requestAnimationFrame(() => {
        notify.success(successMessage ?? "Saved successfully.");
      });
    }
  }, [state]);
}
