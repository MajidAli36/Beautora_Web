"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MessageCircle, Printer } from "lucide-react";
import { createOnlineBooking } from "@/lib/actions/appointments";
import { AppointmentOrderSummary } from "@/components/features/appointments/appointment-order-summary";
import { PublicSlotPicker } from "@/components/features/booking/public-slot-picker";
import {
  BookingDateField,
  defaultBookingDate,
} from "@/components/features/booking/booking-date-field";
import { calculateRequiredAdvance } from "@/lib/booking/pricing";
import { renderAppointmentReceiptHtml } from "@/lib/print/thermal-html";
import { printThermalHtml } from "@/lib/print/browser";
import { getOnlineBookingSalonWhatsAppUrl } from "@/lib/whatsapp/booking-notify";
import {
  PAYMENT_ACCOUNT_TYPE_LABELS,
  type PaymentAccount,
} from "@/lib/store/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addLocalDays, getLocalDateString } from "@/lib/dates/local";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Service = { id: string; name: string; price: number; duration_minutes: number };
type StaffMember = { id: string; full_name: string; job_title: string | null };

type AdvanceSettings = {
  booking_advance_amount?: number | null;
  booking_advance_percent?: number | null;
  booking_payment_instructions?: string | null;
};

export function OnlineBookingForm({
  orgSlug,
  orgName,
  orgPhone,
  orgAddress,
  services,
  staff,
  daysAhead = 30,
  variant = "default",
  advanceSettings,
  paymentAccounts = [],
  orgWhatsApp,
}: {
  orgSlug: string;
  orgName: string;
  orgPhone?: string | null;
  orgAddress?: string | null;
  orgWhatsApp?: string | null;
  services: Service[];
  staff: StaffMember[];
  daysAhead?: number;
  variant?: "default" | "marketing";
  advanceSettings?: AdvanceSettings | null;
  paymentAccounts?: PaymentAccount[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [lastBooking, setLastBooking] = useState<{
    bookingNumber: string;
    customerName: string;
    customerPhone: string;
    staffName: string;
    scheduledAt: string;
    services: { name: string; price: number }[];
    advanceAmount?: number;
  } | null>(null);
  const [date, setDate] = useState("");
  const [minDateStr, setMinDateStr] = useState("");
  const [maxDateStr, setMaxDateStr] = useState("");
  const [staffId, setStaffId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [slotSelected, setSlotSelected] = useState(false);
  const [paymentProofOk, setPaymentProofOk] = useState(false);
  const [proofFileError, setProofFileError] = useState<string | null>(null);

  const isMarketing = variant === "marketing";
  const MAX_PROOF_BYTES = 5 * 1024 * 1024;

  useEffect(() => {
    const min = getLocalDateString();
    setMinDateStr(min);
    setMaxDateStr(addLocalDays(min, daysAhead));
    setDate(defaultBookingDate());
  }, [daysAhead]);

  useEffect(() => {
    if (!staffId && staff.length === 1) {
      setStaffId(staff[0]!.id);
    }
  }, [staff, staffId]);

  const selectedServices = services.filter((s) => serviceIds.includes(s.id));
  const requiredAdvance = advanceSettings
    ? calculateRequiredAdvance(
        selectedServices.reduce((sum, s) => sum + Number(s.price), 0),
        advanceSettings
      )
    : 0;

  useEffect(() => {
    if (requiredAdvance <= 0) {
      setPaymentProofOk(false);
      setProofFileError(null);
    }
  }, [requiredAdvance]);

  const basicsReady =
    firstName.trim().length > 0 &&
    phone.trim().length > 0 &&
    serviceIds.length > 0 &&
    Boolean(staffId) &&
    Boolean(date) &&
    slotSelected;

  const advanceReady = requiredAdvance <= 0 || (paymentProofOk && !proofFileError);
  const canConfirm = !pending && staff.length > 0 && basicsReady && advanceReady;

  function toggleService(id: string) {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);

    const proof = fd.get("payment_proof");
    if (requiredAdvance > 0) {
      if (!(proof instanceof File) || proof.size === 0) {
        const msg = "Please upload a payment screenshot (max 5 MB).";
        setProofFileError(msg);
        notify.error(msg);
        return;
      }
      if (proof.size > MAX_PROOF_BYTES) {
        const msg = "Image must be 5 MB or smaller. Please choose a smaller file.";
        setProofFileError(msg);
        notify.error(msg);
        return;
      }
    }
    setProofFileError(null);

    startTransition(async () => {
      try {
        const result = await createOnlineBooking({
          orgSlug,
          firstName: fd.get("first_name") as string,
          lastName: (fd.get("last_name") as string) || undefined,
          phone: fd.get("phone") as string,
          email: (fd.get("email") as string) || undefined,
          staffId: fd.get("staff_id") as string,
          scheduledAt: fd.get("scheduled_at") as string,
          serviceIds,
          notes: (fd.get("notes") as string) || undefined,
          advanceAmount: requiredAdvance > 0 ? Number(fd.get("advance_amount") ?? requiredAdvance) : undefined,
          advanceMethod: (fd.get("advance_method") as "CASH" | "CARD" | "OTHER") || "OTHER",
          advanceNotes: (fd.get("advance_notes") as string) || undefined,
          paymentProof: (() => {
            const file = fd.get("payment_proof");
            return file instanceof File && file.size > 0 ? file : null;
          })(),
        });
        if (result.error) {
          notify.error(result.error);
          return;
        }

        const firstName = fd.get("first_name") as string;
        const lastName = (fd.get("last_name") as string) || "";
        const phone = fd.get("phone") as string;
        const scheduledAt = fd.get("scheduled_at") as string;
        const staffMember = staff.find((s) => s.id === staffId);
        const bookedServices = selectedServices.map((s) => ({
          name: s.name,
          price: Number(s.price),
        }));
        const advancePaid =
          requiredAdvance > 0 ? Number(fd.get("advance_amount") ?? requiredAdvance) : undefined;
        const awaitingPayment = !!result.pendingApproval;
        const bookingNumber =
          result.bookingNumber ||
          (result.appointmentId
            ? `BK-${result.appointmentId.replace(/-/g, "").slice(0, 8).toUpperCase()}`
            : "BK-PENDING");

        const bookingSummary = {
          bookingNumber,
          customerName: [firstName, lastName].filter(Boolean).join(" "),
          customerPhone: phone,
          staffName: staffMember?.full_name ?? "",
          scheduledAt,
          services: bookedServices,
          advanceAmount: advancePaid,
        };

        setLastBooking(bookingSummary);
        setPendingApproval(awaitingPayment);
        const successMessage = awaitingPayment
          ? "Your request has been sent successfully. We will approve your booking after payment confirmation."
          : "Your appointment is confirmed! We look forward to seeing you.";
        setMessage(successMessage);
        notify.success(
          awaitingPayment ? "Booking request sent" : "Appointment confirmed",
          { description: successMessage }
        );

        const whatsappUrl = getOnlineBookingSalonWhatsAppUrl({
          ...bookingSummary,
          pendingApproval: awaitingPayment,
          salonName: orgName,
          salonWhatsAppPhone: orgWhatsApp || orgPhone,
        });
        if (whatsappUrl) {
          window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        }

        const receiptHtml = renderAppointmentReceiptHtml({
          business: {
            name: orgName,
            phone: orgPhone || undefined,
            address: orgAddress || undefined,
          },
          bookingNumber,
          customerName: bookingSummary.customerName,
          customerPhone: phone,
          staffName: staffMember?.full_name,
          services: bookedServices,
          scheduledAt,
          source: "ONLINE",
          status: awaitingPayment ? "SCHEDULED" : "CONFIRMED",
          advanceAmount: advancePaid,
          pendingApproval: awaitingPayment,
        });
        printThermalHtml(receiptHtml);
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        if (/body exceeded|Body exceeded|1 MB|body size/i.test(raw)) {
          notify.error(
            "Payment screenshot is too large for upload. Please use an image under 5 MB and try again."
          );
        } else {
          notify.error(raw || "Something went wrong. Please try again.");
        }
      }
    });
  }

  if (message) {
    const whatsappUrl = lastBooking
      ? getOnlineBookingSalonWhatsAppUrl({
          ...lastBooking,
          pendingApproval,
          salonName: orgName,
          salonWhatsAppPhone: orgWhatsApp || orgPhone,
        })
      : null;

    return (
      <div
        className={cn(
          "text-center",
          isMarketing
            ? "rounded-2xl border border-emerald-200 bg-white p-12 shadow-sm"
            : "rounded-xl border bg-card p-8"
        )}
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-8" />
        </div>
        <h3 className="mt-6 font-serif text-2xl font-semibold text-stone-900">
          {pendingApproval ? "Request sent successfully" : "You're all set!"}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-stone-600">{message}</p>
        {pendingApproval && (
          <p className="mx-auto mt-2 max-w-md text-sm text-amber-800">
            Our team will review your payment screenshot and confirm your appointment shortly.
          </p>
        )}
        {lastBooking && (
          <div className="mx-auto mt-6 max-w-sm rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-left text-sm text-stone-700">
            <p>
              <span className="text-stone-500">Booking No.</span>
              <br />
              <span className="font-mono text-base font-semibold tracking-wide text-stone-900">
                {lastBooking.bookingNumber}
              </span>
            </p>
            <p className="mt-2">
              <span className="text-stone-500">Visit</span>
              <br />
              <span className="font-medium">{formatDateTime(lastBooking.scheduledAt)}</span>
            </p>
            {lastBooking.staffName ? (
              <p className="mt-2">
                <span className="text-stone-500">Stylist</span>
                <br />
                <span className="font-medium">{lastBooking.staffName}</span>
              </p>
            ) : null}
          </div>
        )}
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {whatsappUrl && (
            <Button
              type="button"
              className="bg-emerald-700 hover:bg-emerald-800"
              render={<a href={whatsappUrl} target="_blank" rel="noopener noreferrer" />}
            >
              <MessageCircle className="mr-2 size-4" />
              Send on WhatsApp
            </Button>
          )}
          {lastBooking && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const receiptHtml = renderAppointmentReceiptHtml({
                  business: {
            name: orgName,
            phone: orgPhone || undefined,
            address: orgAddress || undefined,
          },
                  bookingNumber: lastBooking.bookingNumber,
                  customerName: lastBooking.customerName,
                  customerPhone: lastBooking.customerPhone,
                  staffName: lastBooking.staffName,
                  services: lastBooking.services,
                  scheduledAt: lastBooking.scheduledAt,
                  source: "ONLINE",
                  status: pendingApproval ? "SCHEDULED" : "CONFIRMED",
                  advanceAmount: lastBooking.advanceAmount,
                  pendingApproval,
                });
                printThermalHtml(receiptHtml);
              }}
            >
              <Printer className="mr-2 size-4" />
              Print appointment slip
            </Button>
          )}
        </div>
        {isMarketing && (
          <Button className="mt-8 bg-stone-900 hover:bg-amber-900" render={<Link href="/" />}>
            Back to home
          </Button>
        )}
      </div>
    );
  }

  const selectClass =
    "flex h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 shadow-sm transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20";

  return (
    <div
      className={cn(
        "w-full",
        isMarketing
          ? "border border-[var(--m-line)] bg-white p-6 sm:p-8"
          : "mx-auto max-w-lg rounded-xl border bg-card"
      )}
    >
      {!isMarketing && (
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-semibold">Book at {orgName}</h2>
          <p className="text-sm text-muted-foreground">Pick a stylist and available time.</p>
        </div>
      )}

      {isMarketing && (
        <div className="mb-8 border-b border-[var(--m-line)] pb-6">
          <h2 className="font-display text-2xl font-semibold text-[var(--m-ink)]">Your details</h2>
          <p className="mt-1 text-sm text-[var(--m-muted)]">All fields marked * are required</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={cn("space-y-6", !isMarketing && "p-6")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name" className={isMarketing ? "text-stone-700" : undefined}>
              First name *
            </Label>
            <Input
              id="first_name"
              name="first_name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={isMarketing ? "h-11 rounded-xl border-stone-200" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name" className={isMarketing ? "text-stone-700" : undefined}>
              Last name
            </Label>
            <Input
              id="last_name"
              name="last_name"
              className={isMarketing ? "h-11 rounded-xl border-stone-200" : undefined}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone" className={isMarketing ? "text-stone-700" : undefined}>
              Phone *
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 300 000 0000"
              className={isMarketing ? "h-11 rounded-xl border-stone-200" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className={isMarketing ? "text-stone-700" : undefined}>
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@email.com"
              className={isMarketing ? "h-11 rounded-xl border-stone-200" : undefined}
            />
          </div>
        </div>

        {services.length > 0 && (
          <div className="space-y-3 border-t border-stone-100 pt-6">
            <Label className={isMarketing ? "text-stone-700" : undefined}>Services</Label>
            <p className="text-xs text-muted-foreground">
              Pick services first so available times match the total duration.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((s) => {
                const selected = serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left text-sm transition-all",
                      selected
                        ? "border-amber-400 bg-amber-50 ring-2 ring-amber-400/30"
                        : "border-stone-200 bg-stone-50/50 hover:border-stone-300"
                    )}
                  >
                    <p className="font-medium text-stone-900">{s.name}</p>
                    <p className="mt-1 text-stone-500">
                      {s.duration_minutes} min · {formatCurrency(s.price)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedServices.length > 0 && (
          <AppointmentOrderSummary
            services={selectedServices.map((s) => ({
              name: s.name,
              price: s.price,
              duration_minutes: s.duration_minutes,
            }))}
            advanceSettings={advanceSettings ?? undefined}
            className={isMarketing ? "border-stone-200 bg-stone-50/50" : undefined}
          />
        )}

        <div className="border-t border-stone-100 pt-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-amber-700">
            Appointment
          </p>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="staff_id" className={isMarketing ? "text-stone-700" : undefined}>
                Stylist *
              </Label>
              <select
                id="staff_id"
                name="staff_id"
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                disabled={!staff.length}
                className={selectClass}
              >
                <option value="">
                  {staff.length ? "Select your stylist…" : "No stylists available"}
                </option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                    {s.job_title ? ` — ${s.job_title}` : ""}
                  </option>
                ))}
              </select>
              {!staff.length && (
                <p className="text-xs text-amber-800">
                  This salon has no stylists open for online booking yet. Please call{" "}
                  {orgPhone || "the salon"} to book.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className={isMarketing ? "text-stone-700" : undefined}>
                Date *
              </Label>
              <BookingDateField
                id="date"
                name="date"
                value={date}
                min={minDateStr}
                max={maxDateStr}
                onChange={setDate}
              />
            </div>

            <PublicSlotPicker
              orgSlug={orgSlug}
              date={date}
              staffId={staffId}
              serviceIds={serviceIds}
              onSlotChange={(slot) => setSlotSelected(Boolean(slot))}
              className={isMarketing ? selectClass : undefined}
            />
          </div>
        </div>

        {requiredAdvance > 0 && (
          <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div>
              <p className="font-semibold text-amber-900">Advance payment required</p>
              <p className="mt-1 text-sm text-amber-800">
                Send {formatCurrency(requiredAdvance)} to one of the salon accounts below, then
                upload a screenshot. Confirm stays disabled until your payment proof is attached.
              </p>
              {paymentAccounts.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {paymentAccounts.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg bg-white/80 p-3 text-sm text-stone-700"
                    >
                      <p className="font-medium text-stone-900">
                        {a.label} · {PAYMENT_ACCOUNT_TYPE_LABELS[a.account_type]}
                      </p>
                      {a.account_title && <p>{a.account_title}</p>}
                      {a.bank_name && <p>{a.bank_name}</p>}
                      <p className="font-mono">{a.account_number}</p>
                      {a.extra_note && (
                        <p className="mt-1 text-xs text-stone-500">{a.extra_note}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {advanceSettings?.booking_payment_instructions && (
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-sm text-stone-700">
                  {advanceSettings.booking_payment_instructions}
                </p>
              )}
            </div>
            <input type="hidden" name="advance_amount" value={requiredAdvance} />
            <div className="space-y-2">
              <Label htmlFor="advance_method">Payment method *</Label>
              <select
                id="advance_method"
                name="advance_method"
                required
                defaultValue="OTHER"
                className={selectClass}
              >
                <option value="OTHER">JazzCash / EasyPaisa / Bank</option>
                <option value="CARD">Card</option>
                <option value="CASH">Cash deposit</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_proof">Payment screenshot *</Label>
              <Input
                id="payment_proof"
                name="payment_proof"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                required
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    setPaymentProofOk(false);
                    setProofFileError(null);
                    return;
                  }
                  if (file.size > MAX_PROOF_BYTES) {
                    setPaymentProofOk(false);
                    setProofFileError(
                      "Image must be 5 MB or smaller. Please choose a smaller file."
                    );
                    e.target.value = "";
                    return;
                  }
                  setPaymentProofOk(true);
                  setProofFileError(null);
                }}
                className={cn(
                  "cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-amber-900",
                  isMarketing ? "h-11 rounded-xl border-stone-200" : undefined,
                  proofFileError && "border-red-400"
                )}
              />
              {proofFileError ? (
                <p className="text-xs text-red-600">{proofFileError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, or WebP · max 5 MB. Required to enable Confirm.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="advance_notes">Payment note (optional)</Label>
              <Input
                id="advance_notes"
                name="advance_notes"
                placeholder="Sender name or account used"
                className={isMarketing ? "h-11 rounded-xl border-stone-200" : undefined}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes" className={isMarketing ? "text-stone-700" : undefined}>
            Special requests
          </Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Any notes for your stylist…"
            className={isMarketing ? "rounded-xl border-stone-200" : undefined}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className={cn(
            "w-full",
            isMarketing && "h-12 bg-[var(--m-ink)] text-base hover:bg-[var(--m-ink-soft)]"
          )}
          disabled={!canConfirm}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Confirming…
            </>
          ) : (
            "Confirm appointment"
          )}
        </Button>

        {!staff.length && (
          <p className="text-center text-sm text-stone-500">
            Online booking opens when stylists are available. Please call{" "}
            {orgPhone || "us"} to book, or ask the salon to enable staff under Online booking.
          </p>
        )}
        {staff.length > 0 && basicsReady && requiredAdvance > 0 && !advanceReady && (
          <p className="text-center text-sm text-amber-800">
            Upload your payment screenshot to enable Confirm.
          </p>
        )}
      </form>
    </div>
  );
}
