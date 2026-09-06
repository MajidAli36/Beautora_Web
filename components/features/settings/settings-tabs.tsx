"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoreProfileForm } from "@/components/features/settings/store-profile-form";
import { StoreHoursForm } from "@/components/features/settings/store-hours-form";
import { StorePaymentAccountsForm } from "@/components/features/settings/store-payment-accounts-form";
import { AuditLogTable } from "@/components/features/settings/audit-log-table";
import { DeletedRecordsPanel } from "@/components/features/settings/deleted-records-panel";
import type { StoreProfile } from "@/lib/actions/store-profile";
import type { AuditLogRow } from "@/lib/actions/audit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DeletedRecord = Parameters<typeof DeletedRecordsPanel>[0]["records"][number];

export function SettingsTabs({
  profile,
  canManage,
  auditLogs,
  deletedRecords,
  roleLabel,
}: {
  profile: StoreProfile;
  canManage: boolean;
  auditLogs: AuditLogRow[];
  deletedRecords: DeletedRecord[];
  roleLabel: string;
}) {
  return (
    <Tabs defaultValue="profile" className="gap-6">
      <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="profile" className="px-3 py-2">
          Store profile
        </TabsTrigger>
        <TabsTrigger value="hours" className="px-3 py-2">
          Hours
        </TabsTrigger>
        <TabsTrigger value="payments" className="px-3 py-2">
          Payment accounts
        </TabsTrigger>
        <TabsTrigger value="system" className="px-3 py-2">
          System
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-4">
        {canManage ? (
          <StoreProfileForm profile={profile} />
        ) : (
          <ReadOnlyNotice />
        )}
      </TabsContent>

      <TabsContent value="hours">
        {canManage ? (
          <StoreHoursForm hours={profile.business_hours} />
        ) : (
          <ReadOnlyNotice />
        )}
      </TabsContent>

      <TabsContent value="payments">
        {canManage ? (
          <StorePaymentAccountsForm accounts={profile.paymentAccounts} />
        ) : (
          <ReadOnlyNotice />
        )}
      </TabsContent>

      <TabsContent value="system" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span> {profile.name}
            </p>
            <p>
              <span className="text-muted-foreground">Booking URL:</span>{" "}
              <span className="font-mono">/book/{profile.slug}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Your role:</span> {roleLabel}
            </p>
            <p className="pt-2 text-muted-foreground">
              Staff profiles and role permissions are managed on the{" "}
              <Button variant="link" className="h-auto p-0" render={<Link href="/staff" />}>
                Staff
              </Button>{" "}
              page. Advance amounts are on{" "}
              <Button
                variant="link"
                className="h-auto p-0"
                render={<Link href="/online-booking" />}
              >
                Online booking
              </Button>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Webhook endpoints for external services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            <p>
              Device register:{" "}
              <span className="text-muted-foreground">/api/devices/register</span>
            </p>
            <p>
              Online booking:{" "}
              <span className="text-muted-foreground">/book/{profile.slug}</span>
            </p>
            <p>
              Health: <span className="text-muted-foreground">/api/health</span>
            </p>
          </CardContent>
        </Card>

        {canManage && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Activity & audit trail</CardTitle>
                <CardDescription>
                  History of sales, payments, deletes, and other sensitive actions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLogTable logs={auditLogs} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Deleted records</CardTitle>
                <CardDescription>
                  Soft-deleted core records kept for tracking.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeletedRecordsPanel records={deletedRecords} />
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function ReadOnlyNotice() {
  return (
    <Card>
      <CardContent className="py-8 text-sm text-muted-foreground">
        Only managers and above can edit store profile, hours, and payment accounts.
      </CardContent>
    </Card>
  );
}
