import { toast } from "sonner";

type NotifyOptions = {
  description?: string;
  /** Auto-dismiss ms. Defaults to 3200. */
  duration?: number;
  id?: string | number;
};

const DEFAULT_DURATION = 3200;

export const notify = {
  success(message: string, options?: NotifyOptions) {
    return toast.success(message, { duration: DEFAULT_DURATION, ...options });
  },
  error(message: string, options?: NotifyOptions) {
    return toast.error(message, { duration: 5200, ...options });
  },
  info(message: string, options?: NotifyOptions) {
    return toast.info(message, { duration: DEFAULT_DURATION, ...options });
  },
  warning(message: string, options?: NotifyOptions) {
    return toast.warning(message, { duration: 4500, ...options });
  },
  loading(message: string, options?: NotifyOptions) {
    return toast.loading(message, options);
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
  promise: toast.promise,
};

type ActionLike = { error?: string; success?: boolean } | void;

/**
 * Run a mutation and always surface a toast (error or success).
 * Use from button onClick / startTransition handlers.
 */
export async function runWithToast(
  action: () => Promise<ActionLike>,
  successMessage = "Saved successfully."
): Promise<boolean> {
  try {
    const result = await action();
    if (result && typeof result === "object" && result.error) {
      notify.error(result.error);
      return false;
    }
    if (successMessage) notify.success(successMessage);
    return true;
  } catch (e) {
    notify.error(e instanceof Error ? e.message : "Something went wrong");
    return false;
  }
}
