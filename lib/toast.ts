import { toast } from "sonner";

type NotifyOptions = {
  description?: string;
  duration?: number;
  id?: string | number;
};

export const notify = {
  success(message: string, options?: NotifyOptions) {
    return toast.success(message, options);
  },
  error(message: string, options?: NotifyOptions) {
    return toast.error(message, options);
  },
  info(message: string, options?: NotifyOptions) {
    return toast.info(message, options);
  },
  warning(message: string, options?: NotifyOptions) {
    return toast.warning(message, options);
  },
  loading(message: string, options?: NotifyOptions) {
    return toast.loading(message, options);
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
  promise: toast.promise,
};
