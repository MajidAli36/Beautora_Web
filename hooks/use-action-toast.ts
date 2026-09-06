"use client";

import { useEffect, useRef } from "react";
import { notify } from "@/lib/toast";

type ActionLike = {
  error?: string;
  success?: boolean;
};

type UseActionToastOptions = {
  /** Shown when `state.success` is true. Omit to skip the success toast. */
  successMessage?: string;
  /** Called after a success toast (or when success has no message). */
  onSuccess?: () => void;
  /** Override the error toast body. Defaults to `state.error`. */
  errorMessage?: string | ((error: string) => string);
};

/**
 * Turns `useActionState` / ActionResult into Sonner toasts.
 * Dedupes by state object identity so the same result is not toasted twice.
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
      if (successMessage) notify.success(successMessage);
      onSuccess?.();
    }
  }, [state]);
}
