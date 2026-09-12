"use client";

import { useActionState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import {
  updateRoleActionPermission,
  updateRoleNavPermission,
  resetRoleNavPermissions,
} from "@/lib/actions/role-permissions";
import type { RolePermissionMatrix } from "@/lib/actions/role-permissions";
import { useActionToast } from "@/hooks/use-action-toast";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import type { ActionKey } from "@/lib/permissions/actions";
import type { MemberRole } from "@/types";
import type { NavKey } from "@/lib/permissions/nav";
import type { ActionResult } from "@/types/commerce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RoleNavMatrixRow = {
  role: MemberRole;
  roleLabel: string;
  permissions: Record<NavKey, boolean>;
};

type RolePermissionsEditorProps = {
  matrix: RolePermissionMatrix[];
};

export function RolePermissionsEditor({ matrix }: RolePermissionsEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Features & actions by role</CardTitle>
        <CardDescription>
          Turn a feature Off to hide it from the sidebar. Leave it On and switch individual
          actions On/Off for that role — including Receptionist. Admin overrides always apply
          (no separate “security level” lock beyond Owner/Admin-only controls). Owner always has
          full access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={matrix[0]?.role ?? "STAFF"}>
          <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
            {matrix.map((row) => (
              <TabsTrigger key={row.role} value={row.role} className="text-xs sm:text-sm">
                {row.roleLabel}
              </TabsTrigger>
            ))}
          </TabsList>
          {matrix.map((row) => (
            <TabsContent key={row.role} value={row.role}>
              <RoleFeatureTable role={row.role} features={row.features} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RoleFeatureTable({
  role,
  features,
}: {
  role: MemberRole;
  features: RolePermissionMatrix["features"];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[role]} — feature visibility + actions
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await resetRoleNavPermissions(role);
            })
          }
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          Reset defaults
        </Button>
      </div>

      <div className="space-y-3">
        {features.map((feature) => (
          <FeaturePermissionCard key={feature.feature} role={role} feature={feature} />
        ))}
      </div>
    </div>
  );
}

function FeaturePermissionCard({
  role,
  feature,
}: {
  role: MemberRole;
  feature: RolePermissionMatrix["features"][number];
}) {
  const [navState, navAction, navPending] = useActionState(
    updateRoleNavPermission,
    {} as ActionResult
  );
  useActionToast(navState, { successMessage: "Feature visibility saved." });

  const settingsLocked =
    role === "ADMIN" &&
    (feature.feature === "settings" || feature.feature === "staff");

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        feature.visible ? "border-border bg-card" : "border-dashed bg-muted/30"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">{feature.featureLabel}</p>
          <p className="text-xs text-muted-foreground">
            {feature.visible
              ? feature.actions.length
                ? "Visible — control actions below"
                : "Visible in sidebar"
              : "Hidden from sidebar and blocked from actions"}
          </p>
        </div>
        <form action={navAction}>
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="navKey" value={feature.feature} />
          <input
            type="hidden"
            name="enabled"
            value={feature.visible ? "false" : "true"}
          />
          <Button
            type="submit"
            size="sm"
            variant={feature.visible ? "default" : "outline"}
            disabled={navPending || settingsLocked}
            className="min-w-[88px]"
          >
            {navPending ? "…" : feature.visible ? "Feature On" : "Feature Off"}
          </Button>
        </form>
      </div>

      {feature.actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {feature.actions.map((action) => (
            <ActionToggle
              key={action.key}
              role={role}
              actionKey={action.key}
              label={action.label}
              enabled={action.enabled}
              disabled={!feature.visible}
            />
          ))}
        </div>
      )}

      {feature.actions.length === 0 && feature.visible && (
        <div className="mt-3 border-t pt-3">
          <Badge variant="secondary">View only</Badge>
        </div>
      )}
    </div>
  );
}

function ActionToggle({
  role,
  actionKey,
  label,
  enabled,
  disabled,
}: {
  role: MemberRole;
  actionKey: ActionKey;
  label: string;
  enabled: boolean;
  disabled?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateRoleActionPermission,
    {} as ActionResult
  );
  useActionToast(state, { successMessage: "Action permission saved." });

  const lockedAdminAction =
    role === "ADMIN" &&
    (actionKey === "staff.manage_permissions" ||
      actionKey === "staff.manage_logins" ||
      actionKey === "settings.manage");

  return (
    <form action={formAction}>
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="actionKey" value={actionKey} />
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <Button
        type="submit"
        size="sm"
        variant={enabled ? "secondary" : "outline"}
        disabled={isPending || disabled || lockedAdminAction}
        className={cn(
          "h-8 text-xs",
          enabled && "border border-primary/30",
          (disabled || lockedAdminAction) && "opacity-50"
        )}
        title={
          lockedAdminAction
            ? "Admin must keep this action"
            : disabled
              ? "Turn the feature On to configure actions"
              : enabled
                ? `Disable ${label}`
                : `Enable ${label}`
        }
      >
        {isPending ? "…" : `${label}: ${enabled ? "On" : "Off"}`}
      </Button>
    </form>
  );
}
