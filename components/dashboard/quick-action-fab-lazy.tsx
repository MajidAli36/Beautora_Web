"use client";

import dynamic from "next/dynamic";
import type { NavPermissionsConfig } from "@/lib/permissions/nav";
import type { MemberRole } from "@/types";

const QuickActionFab = dynamic(
  () =>
    import("@/components/dashboard/quick-action-fab").then((m) => ({
      default: m.QuickActionFab,
    })),
  { ssr: false, loading: () => null }
);

type Props = {
  memberRole: MemberRole;
  navOverrides: NavPermissionsConfig;
};

/** Deferred FAB so the main app shell JS stays smaller on first paint. */
export function QuickActionFabLazy(props: Props) {
  return <QuickActionFab {...props} />;
}
