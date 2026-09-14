"use client";

import Link from "next/link";
import { AppointmentOrderSummary } from "@/components/features/appointments/appointment-order-summary";
import { CheckInButton } from "@/components/features/appointments/check-in-button";
import { DepositManagement } from "@/components/features/appointments/deposit-management";
import { ManualPaymentForm } from "@/components/features/appointments/manual-payment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginatedList } from "@/components/ui/table-pagination";
import {
  canCollectAdvance,
  getAdvanceState,
  getApprovedDepositTotal,
  getPendingDepositTotal,
  sumServicePrices,
  type DepositLine,
} from "@/lib/booking/pricing";
import { formatCurrency, formatCustomerName, formatDateTime, formatTime } from "@/lib/format";
import { displayBookingNumber } from "@/lib/booking/booking-number";
import { CancelOnlineButton } from "@/components/features/online-booking/cancel-online-button";
import { MarkNoShowButton } from "@/components/features/online-booking/mark-no-show-button";

export type AppointmentRow = {
  id: string;
  booking_number?: string | null;
  scheduled_at: string;
  created_at?: string;
  status: string;
  source?: string;
  customer: {
    first_name: string;
    last_name: string | null;
    phone: string | null;
    email?: string | null;
  };
  staff: { full_name: string } | null;
  services: { service_name: string; price: number; duration_minutes: number }[];
  deposits: DepositLine[];
};

type Props = {
  appointments: AppointmentRow[];
  mode: "staff" | "online";
  /** Show date + time (for open multi-day online lists). */
  showDateTime?: boolean;
  /** History list — hide open-only actions (cancel / no-show / check-in). */
  historyMode?: boolean;
  advanceSettings?: {
    booking_advance_amount?: number | null;
    booking_advance_percent?: number | null;
  };
  emptyMessage?: string;
  emptyAction?: { label: string; href: string };
  onDepositResolved?: (
    appointmentId: string,
    depositId: string,
    status: "APPROVED" | "REJECTED" | "REFUNDED"
  ) => void;
  onAppointmentCancelled?: (appointmentId: string) => void;
  onAppointmentNoShow?: (appointmentId: string) => void;
  onAppointmentUpdated?: (appointmentId: string, patch: Partial<AppointmentRow>) => void;
  canReviewDeposits?: boolean;
  canRefundDeposits?: boolean;
  canCancelOnline?: boolean;
  canMarkNoShow?: boolean;
  canCheckIn?: boolean;
  canCollectPayment?: boolean;
};

function appointmentSearchText(a: AppointmentRow): string {
  const customer = a.customer;
  const services = (a.services ?? []).map((s) => s.service_name).join(" ");
  const bookingNo = displayBookingNumber(a.booking_number, a.id);
  const sourceLabel =
    (a.source ?? "").toUpperCase() === "ONLINE"
      ? "Online"
      : (a.source ?? "").toUpperCase() === "STAFF"
        ? "In-house"
        : (a.source ?? "").toUpperCase() === "PHONE"
          ? "Phone"
          : (a.source ?? "").toUpperCase() === "WALK_IN"
            ? "Walk-in"
            : (a.source ?? "");
  const statusLabel =
    a.status === "NO_SHOW"
      ? "No-show"
      : a.status === "COMPLETED"
        ? "Completed"
        : a.status === "CANCELLED"
          ? "Cancelled"
          : a.status;
  return [
    bookingNo,
    formatCustomerName(customer.first_name, customer.last_name),
    customer.phone ?? "",
    customer.email ?? "",
    a.staff?.full_name ?? "",
    services,
    statusLabel,
    sourceLabel,
  ].join(" ");
}

export function AppointmentsScheduleTable({
  appointments,
  mode,
  showDateTime = false,
  historyMode = false,
  advanceSettings,
  emptyMessage = "No appointments on this date.",
  emptyAction,
  onDepositResolved,
  onAppointmentCancelled,
  onAppointmentNoShow,
  canReviewDeposits = true,
  canRefundDeposits = true,
  canCancelOnline = true,
  canMarkNoShow = true,
  canCheckIn = true,
  canCollectPayment = true,
}: Props) {
  return (
    <PaginatedList
      items={appointments}
      empty={
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          {emptyAction && (
            <Button className="mt-4" render={<Link href={emptyAction.href} />}>
              {emptyAction.label}
            </Button>
          )}
        </div>
      }
      search={{
        placeholder: "Search customer, staff, services, booking #…",
        getText: appointmentSearchText,
        emptyFiltered: (
          <p className="text-sm text-muted-foreground">No appointments match your search.</p>
        ),
      }}
    >
      {(slice) => (
        <div className="space-y-4">
          {slice.map((a) => {
            const customer = a.customer;
            const staffMember = a.staff;
            const services = a.services ?? [];
            const deposits = a.deposits ?? [];
            const serviceTotal = sumServicePrices(services);
            const approvedAdvance = getApprovedDepositTotal(deposits);
            const pendingAdvance = getPendingDepositTotal(deposits);
            const isOnline = (a.source ?? "").toUpperCase() === "ONLINE";
            // Online advance settings apply ONLY to public online bookings — never in-house/staff.
            const rowAdvanceSettings = isOnline ? advanceSettings : undefined;
            const balanceDue = getAdvanceState(deposits, serviceTotal, rowAdvanceSettings)
              .balanceDue;
            const showOpenActions =
              !historyMode && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(a.status);
            const showManualPayment =
              !isOnline &&
              canCollectPayment &&
              showOpenActions &&
              canCollectAdvance(deposits, serviceTotal, undefined);
            const bookingNo = displayBookingNumber(a.booking_number, a.id);
            const sourceLabel =
              (a.source ?? "").toUpperCase() === "ONLINE"
                ? "Online"
                : (a.source ?? "").toUpperCase() === "STAFF"
                  ? "In-house"
                  : (a.source ?? "").toUpperCase() === "PHONE"
                    ? "Phone"
                    : (a.source ?? "").toUpperCase() === "WALK_IN"
                      ? "Walk-in"
                      : a.source
                        ? a.source
                        : null;

            return (
              <div
                key={a.id}
                className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold tracking-wide text-primary">
                        {bookingNo}
                      </span>
                      <span className="text-lg font-semibold">
                        {showDateTime
                          ? formatDateTime(a.scheduled_at)
                          : formatTime(a.scheduled_at)}
                      </span>
                      {sourceLabel ? (
                        <Badge variant="secondary" className="font-normal">
                          {sourceLabel}
                        </Badge>
                      ) : null}
                      <Badge
                        variant="outline"
                        className={
                          a.status === "NO_SHOW"
                            ? "border-amber-500 text-amber-700"
                            : a.status === "COMPLETED"
                              ? "border-primary/40 text-primary"
                              : a.status === "CANCELLED"
                                ? "border-destructive/40 text-destructive"
                                : undefined
                        }
                      >
                        {a.status === "NO_SHOW"
                          ? "No-show"
                          : a.status === "COMPLETED"
                            ? "Completed"
                            : a.status === "CANCELLED"
                              ? "Cancelled"
                              : a.status}
                      </Badge>
                      {pendingAdvance > 0 && showOpenActions && (
                        <Badge className="bg-amber-600">Advance pending</Badge>
                      )}
                    </div>
                    <p className="font-medium">
                      {formatCustomerName(customer.first_name, customer.last_name)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {customer.phone ?? "—"}
                      {customer.email ? ` · ${customer.email}` : ""}
                      {staffMember ? ` · ${staffMember.full_name}` : ""}
                    </p>
                    {a.created_at ? (
                      <p className="text-xs text-muted-foreground">
                        Date added: {formatDateTime(a.created_at)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isOnline &&
                      canCheckIn &&
                      showOpenActions &&
                      ["SCHEDULED", "CONFIRMED"].includes(a.status) && (
                        <CheckInButton
                          appointmentId={a.id}
                          customerName={formatCustomerName(
                            customer.first_name,
                            customer.last_name
                          )}
                          customerPhone={customer.phone}
                        />
                      )}
                    {isOnline && canCancelOnline && showOpenActions && (
                      <CancelOnlineButton
                        appointmentId={a.id}
                        onCancelled={onAppointmentCancelled}
                      />
                    )}
                    {canMarkNoShow && showOpenActions && (
                      <MarkNoShowButton
                        appointmentId={a.id}
                        onMarked={onAppointmentNoShow}
                      />
                    )}
                    {showOpenActions && canCollectPayment && (
                      <Button size="sm" variant="outline" render={<Link href="/pos" />}>
                        Open POS
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <AppointmentOrderSummary
                    services={services}
                    deposits={deposits}
                    advanceSettings={rowAdvanceSettings}
                    compact
                  />

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:text-center">
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 sm:block sm:p-2">
                        <p className="text-xs text-muted-foreground">Services</p>
                        <p className="font-semibold">{formatCurrency(serviceTotal)}</p>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-primary/5 p-2.5 sm:block sm:p-2">
                        <p className="text-xs text-muted-foreground">Advance</p>
                        <p className="font-semibold text-primary">
                          {approvedAdvance > 0
                            ? formatCurrency(approvedAdvance)
                            : pendingAdvance > 0
                              ? `${formatCurrency(pendingAdvance)}*`
                              : "—"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 sm:block sm:p-2">
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="font-semibold">{formatCurrency(balanceDue)}</p>
                      </div>
                    </div>

                    {deposits.length > 0 && (
                      <DepositManagement
                        appointmentId={a.id}
                        bookingNumber={bookingNo}
                        deposits={deposits}
                        onUpdated={onDepositResolved}
                        canReview={canReviewDeposits}
                        canRefund={canRefundDeposits}
                      />
                    )}

                    {showManualPayment && <ManualPaymentForm appointmentId={a.id} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PaginatedList>
  );
}
