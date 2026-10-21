"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { ProductIntent } from "@/lib/auth/account-types";
import type { AppMode } from "@/lib/marketplace/constants";
import { setAppMode } from "@/lib/marketplace/actions";
import { notify } from "@/lib/toast";
import {
  canAccessWorkspace,
  getWorkspace,
  type WorkspaceId,
} from "@/lib/workspaces";

function confirmLeaveIfUnsaved(): boolean {
  if (typeof document === "undefined") return true;
  const dirty = document.querySelector('[data-unsaved-changes="true"]');
  if (!dirty) return true;
  return window.confirm(
    "You have unsaved changes. Leave this page and switch workspace anyway?"
  );
}

export type UseWorkspaceSwitchOptions = {
  mode: AppMode;
  productIntent?: ProductIntent | null;
  customerAppEnabled?: boolean;
  /** Called after a successful switch (e.g. close a popover). */
  onSwitched?: () => void;
};

/** Shared Salon POS · Marketplace · App dashboard switch — used by sidebar + app launcher. */
export function useWorkspaceSwitch({
  mode,
  productIntent = "both",
  customerAppEnabled = false,
  onSwitched,
}: UseWorkspaceSwitchOptions) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchTo = useCallback(
    (next: WorkspaceId) => {
      if (next === mode || pending) return;

      if (!canAccessWorkspace(next, { productIntent, customerAppEnabled })) {
        if (next === "customer_app") {
          notify.error(
            "App dashboard not enabled yet. Ask Beautora Super Admin (Platform → Customer apps)."
          );
        } else {
          notify.error("This product is not enabled for your workspace.");
        }
        return;
      }

      if (!confirmLeaveIfUnsaved()) return;

      startTransition(async () => {
        const res = await setAppMode(next);
        if (res.error) {
          notify.error(res.error);
          return;
        }
        const workspace = getWorkspace(next);
        notify.success(`Switched to ${workspace.name}.`);
        onSwitched?.();
        router.push(workspace.href);
        router.refresh();
      });
    },
    [mode, pending, productIntent, customerAppEnabled, onSwitched, router]
  );

  return { pending, switchTo };
}
