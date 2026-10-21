"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeCheckout } from "@/lib/actions/sales";
import { previewCheckoutUsage, searchPosCustomers } from "@/lib/actions/products";
import {
  getCustomerDueInvoices,
  receiveCustomerAccountPayment,
} from "@/lib/actions/payments";
import { notify } from "@/lib/toast";
import { getCustomerAdvanceAppointments, type PosAppointment } from "@/lib/actions/appointments";
import { printSaleReceipt } from "@/components/features/sales/print-receipt-button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatCustomerName, formatDate, formatDateTime, formatTime } from "@/lib/format";
import { calculateInvoiceTotals, roundMoney } from "@/lib/sales/calculate";
import { roundQty } from "@/lib/products/kinds";
import type { CartItem, PaymentMethod } from "@/types/commerce";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { CustomerPicker } from "@/components/features/customers/customer-picker";
import { MarkNoShowButton } from "@/components/features/online-booking/mark-no-show-button";
import { AppointmentPicker } from "@/components/features/pos/appointment-picker";

type CatalogService = { id: string; name: string; price: number; duration_minutes: number };
type CatalogProduct = { id: string; name: string; retail_price: number; stock_quantity: number };
type CatalogPackage = { id: string; name: string; price: number };
type CatalogCustomer = { id: string; first_name: string; last_name: string | null; phone: string | null };
type CatalogStaff = { id: string; full_name: string };

type DueInvoiceRow = Awaited<ReturnType<typeof getCustomerDueInvoices>>[number];

type UsageLine = {
  productId: string;
  productName: string;
  recipeQty: number;
  quantity: number;
  unitLabel?: string | null;
  unitCost: number;
  dirty: boolean;
};

type PosTerminalProps = {
  services: CatalogService[];
  products: CatalogProduct[];
  packages: CatalogPackage[];
  customers: CatalogCustomer[];
  staff: CatalogStaff[];
  appointments: PosAppointment[];
  canManage?: boolean;
  canMarkNoShow?: boolean;
};

export function PosTerminal({
  services,
  products,
  packages,
  customers,
  staff,
  appointments: initialAppointments,
  canManage = false,
  canMarkNoShow = false,
}: PosTerminalProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState(initialAppointments);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [depositCredit, setDepositCredit] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState("");
  const [applyTax, setApplyTax] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [tenderedAmount, setTenderedAmount] = useState<string>("");
  const [confirmPartial, setConfirmPartial] = useState(false);
  const [allowUnpaid, setAllowUnpaid] = useState(false);
  const [search, setSearch] = useState("");
  const [customerLookupPending, startCustomerLookup] = useTransition();
  const [dueInvoices, setDueInvoices] = useState<DueInvoiceRow[]>([]);
  const [selectedDueIds, setSelectedDueIds] = useState<Set<string>>(new Set());
  const [duesLoading, setDuesLoading] = useState(false);
  const [usageLines, setUsageLines] = useState<UsageLine[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    setAppointments(initialAppointments);
  }, [initialAppointments]);

  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.id === appointmentId) ?? null,
    [appointments, appointmentId]
  );

  const appointmentsWithAdvance = useMemo(
    () => appointments.filter((a) => a.depositBalance > 0),
    [appointments]
  );

  useEffect(() => {
    let cancelled = false;
    setSelectedDueIds(new Set());
    setAmountReceived("");
    setTenderedAmount("");
    setConfirmPartial(false);

    if (!customerId) {
      setDueInvoices([]);
      setDuesLoading(false);
      return;
    }

    setDuesLoading(true);
    void (async () => {
      try {
        const dues = await getCustomerDueInvoices(customerId);
        if (!cancelled) setDueInvoices(dues);
      } catch (e) {
        if (!cancelled) {
          setDueInvoices([]);
          notify.error(e instanceof Error ? e.message : "Could not load past dues");
        }
      } finally {
        if (!cancelled) setDuesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // Auto-load in-house usage from service recipes when cart services/packages change
  useEffect(() => {
    let cancelled = false;
    const serviceOrPackage = cart.filter(
      (c) => c.itemType === "SERVICE" || c.itemType === "PACKAGE"
    );
    if (!serviceOrPackage.length) {
      setUsageLines([]);
      return;
    }

    setUsageLoading(true);
    void (async () => {
      try {
        const result = await previewCheckoutUsage(
          serviceOrPackage.map((c) => ({
            itemType: c.itemType,
            itemId: c.itemId,
            quantity: c.quantity,
          }))
        );
        if (cancelled) return;
        if (result.error) {
          notify.error(result.error);
          setUsageLines([]);
          return;
        }
        setUsageLines((prev) => {
          const prevById = new Map(prev.map((l) => [l.productId, l]));
          return result.requirements.map((r) => {
            const existing = prevById.get(r.productId);
            if (existing?.dirty) {
              return {
                ...existing,
                recipeQty: r.quantity,
                productName: r.productName,
                unitLabel: r.unitLabel,
                unitCost: r.unitCost,
              };
            }
            return {
              productId: r.productId,
              productName: r.productName,
              recipeQty: r.quantity,
              quantity: r.quantity,
              unitLabel: r.unitLabel,
              unitCost: r.unitCost,
              dirty: false,
            };
          });
        });
      } catch (e) {
        if (!cancelled) {
          setUsageLines([]);
          notify.error(e instanceof Error ? e.message : "Could not load in-house usage");
        }
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cart]);

  const invoiceTotals = useMemo(
    () =>
      calculateInvoiceTotals(
        cart.map((i) => ({
          itemType: i.itemType,
          itemId: i.itemId,
          name: i.name,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
        })),
        discount,
        applyTax ? Number(tax) || 0 : 0
      ),
    [cart, discount, applyTax, tax]
  );
  const subtotal = invoiceTotals.subtotal;
  const discountAmount = invoiceTotals.discount;
  const taxAmount = invoiceTotals.tax;
  const total = invoiceTotals.total;
  const appliedDeposit = roundMoney(Math.min(depositCredit, total));
  /** Amount to collect for the new sale only (after advance). */
  const saleCollect = roundMoney(Math.max(0, total - appliedDeposit));
  const selectedDueInvoices = useMemo(
    () => dueInvoices.filter((d) => selectedDueIds.has(d.saleId)),
    [dueInvoices, selectedDueIds]
  );
  const selectedDuesTotal = roundMoney(
    selectedDueInvoices.reduce((s, d) => s + Number(d.amountDue), 0)
  );
  const collectTarget = roundMoney(saleCollect + selectedDuesTotal);
  const hasCart = cart.length > 0;
  const duesOnly = !hasCart && selectedDuesTotal > 0.009;
  const receivedNow =
    amountReceived === ""
      ? collectTarget
      : roundMoney(Math.max(0, Number(amountReceived) || 0));
  /** Cash/card applied to the new sale after covering selected past dues. */
  const saleReceived = roundMoney(Math.max(0, receivedNow - selectedDuesTotal));
  const remainingDue = roundMoney(Math.max(0, saleCollect - saleReceived));
  const tendered =
    tenderedAmount === ""
      ? receivedNow
      : roundMoney(Math.max(0, Number(tenderedAmount) || 0));
  const changeGiven = roundMoney(Math.max(0, tendered - receivedNow));
  const isWalkIn = !customerId;
  const isPartial = hasCart && remainingDue > 0.009;
  const isUnpaid = hasCart && saleReceived <= 0 && saleCollect > 0;

  function applyAppointment(appt: PosAppointment, loadServices = true) {
    setAppointmentId(appt.id);
    setCustomerId(appt.customerId);
    setDepositCredit(appt.depositBalance);
    if (appt.staffId) setStaffIds([appt.staffId]);
    if (loadServices && appt.services.length > 0) {
      setCart(
        appt.services.map((s) => ({
          itemType: "SERVICE" as const,
          itemId: s.serviceId,
          name: s.name,
          unitPrice: s.price,
          quantity: 1,
        }))
      );
    }
  }

  function loadAppointment(apptId: string, loadServices = true) {
    if (!apptId) {
      setAppointmentId("");
      setDepositCredit(0);
      return;
    }
    const appt = appointments.find((a) => a.id === apptId);
    if (appt) applyAppointment(appt, loadServices);
  }

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);

    if (!nextCustomerId) {
      setAppointmentId("");
      setDepositCredit(0);
      setStaffIds([]);
      return;
    }

    const customerAppts = appointments.filter((a) => a.customerId === nextCustomerId);
    const withAdvance = customerAppts.filter((a) => a.depositBalance > 0);

    if (withAdvance.length === 1) {
      applyAppointment(withAdvance[0], false);
      return;
    }

    if (withAdvance.length > 1) {
      const alreadyLinked = withAdvance.find((a) => a.id === appointmentId);
      if (alreadyLinked) {
        setDepositCredit(alreadyLinked.depositBalance);
        return;
      }
      setAppointmentId("");
      setDepositCredit(0);
      return;
    }

    const onlyAppt = customerAppts[0];
    if (onlyAppt && customerAppts.length === 1) {
      setAppointmentId(onlyAppt.id);
      setDepositCredit(onlyAppt.depositBalance);
      return;
    }

  if (appointmentId) {
      const linked = appointments.find((a) => a.id === appointmentId);
      if (!linked || linked.customerId !== nextCustomerId) {
        setAppointmentId("");
        setDepositCredit(0);
      }
    }

    startCustomerLookup(async () => {
      const remote = await getCustomerAdvanceAppointments(nextCustomerId);
      if (remote.length === 1) {
        applyAppointment(remote[0], false);
      } else if (remote.length > 1 && !appointmentId) {
        setDepositCredit(0);
      }
    });
  }

  function addItem(item: CartItem) {
    setCart((prev) => {
      const existing = prev.find(
        (c) => c.itemId === item.itemId && c.itemType === item.itemType
      );
      const nextQty = (existing?.quantity ?? 0) + 1;
      if (item.itemType === "PRODUCT") {
        const product = products.find((p) => p.id === item.itemId);
        const stock = product?.stock_quantity ?? 0;
        if (nextQty > stock) {
          notify.error(`Only ${stock} in stock for ${item.name}`);
          return prev;
        }
      }
      if (existing) {
        return prev.map((c) =>
          c.itemId === item.itemId && c.itemType === item.itemType
            ? { ...c, quantity: nextQty }
            : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function updateQty(itemType: string, itemId: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => !(c.itemType === itemType && c.itemId === itemId)));
      return;
    }
    if (itemType === "PRODUCT") {
      const product = products.find((p) => p.id === itemId);
      const stock = product?.stock_quantity ?? 0;
      if (qty > stock) {
        notify.error(`Only ${stock} in stock for ${product?.name ?? "product"}`);
        qty = stock;
      }
    }
    setCart((prev) =>
      prev.map((c) =>
        c.itemType === itemType && c.itemId === itemId ? { ...c, quantity: qty } : c
      )
    );
  }

  function toggleDueInvoice(saleId: string) {
    setSelectedDueIds((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) next.delete(saleId);
      else next.add(saleId);
      return next;
    });
    setAmountReceived("");
    setTenderedAmount("");
    setConfirmPartial(false);
    setAllowUnpaid(false);
  }

  async function reloadDues() {
    if (!customerId) return;
    try {
      const dues = await getCustomerDueInvoices(customerId);
      setDueInvoices(dues);
      setSelectedDueIds((prev) => {
        const valid = new Set(dues.map((d) => d.saleId));
        return new Set([...prev].filter((id) => valid.has(id)));
      });
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Could not reload past dues");
    }
  }

  async function runCheckout() {
    if (depositCredit > 0 && !appointmentId && hasCart) {
      return { error: "Select the appointment linked to this advance before completing sale." };
    }
    if (selectedDuesTotal > 0.009 && receivedNow + 0.009 < selectedDuesTotal) {
      return {
        error: `Pay selected past dues in full (${formatCurrency(selectedDuesTotal)}) or uncheck them.`,
      };
    }
    if (isWalkIn && isPartial) {
      return { error: "Walk-in customers must pay the full amount." };
    }
    if (isPartial && !confirmPartial) {
      return { error: "Confirm that the remaining balance will be customer due." };
    }
    if (isUnpaid && (!allowUnpaid || !canManage)) {
      return { error: "Creating an unpaid invoice requires a manager." };
    }

    const priorDuePayments = selectedDueInvoices.map((d) => ({
      saleId: d.saleId,
      amount: roundMoney(Number(d.amountDue)),
      expectedPaymentVersion: d.paymentVersion,
    }));

    const usageOverrides = usageLines
      .filter((l) => l.dirty || l.quantity !== l.recipeQty)
      .map((l) => ({
        productId: l.productId,
        quantity: roundQty(l.quantity),
      }));
    // Also send removals: recipe products set to 0
    for (const l of usageLines) {
      if (l.quantity <= 0 && !usageOverrides.some((o) => o.productId === l.productId)) {
        usageOverrides.push({ productId: l.productId, quantity: 0 });
      }
    }

    if (duesOnly) {
      if (!customerId) return { error: "Select a customer to pay past dues" };
      const result = await receiveCustomerAccountPayment({
        customerId,
        amount: selectedDuesTotal,
        method: paymentMethod,
        notes: "Past dues paid at POS",
        allocations: priorDuePayments.map((l) => ({
          saleId: l.saleId,
          amount: l.amount,
          expectedPaymentVersion: l.expectedPaymentVersion,
        })),
      });
      if (result.error) {
        await reloadDues();
        return result;
      }
      notify.success("Past dues paid.");
      setSelectedDueIds(new Set());
      await reloadDues();
      router.refresh();
      return { success: true };
    }

    if (!hasCart) {
      return { error: "Add items to the cart, or select past dues to collect." };
    }

    const saleTendered =
      paymentMethod === "CASH"
        ? roundMoney(Math.max(0, tendered - selectedDuesTotal))
        : saleReceived;

    const result = await completeCheckout({
      items: cart,
      customerId: customerId || null,
      appointmentId: appointmentId || null,
      staffId: staffIds[0] ?? null,
      staffIds,
      discount: discountAmount,
      tax: taxAmount > 0 ? taxAmount : undefined,
      paymentMethod,
      amountReceived: saleReceived,
      tenderedAmount: saleTendered,
      allowUnpaid: allowUnpaid && canManage,
      priorDuePayments: priorDuePayments.length ? priorDuePayments : undefined,
      usageOverrides: usageOverrides.length ? usageOverrides : undefined,
    });
    if (result.error && !result.saleId) {
      if (result.error.toLowerCase().includes("past")) {
        await reloadDues();
      }
      return result;
    }
    if (result.warning) {
      notify.warning(result.warning);
    } else if (result.error && result.saleId) {
      notify.warning(result.error);
    } else {
      notify.success(
        priorDuePayments.length ? "Sale completed · past dues paid." : "Sale completed."
      );
    }
    // Drop billed appointment from POS list immediately (before navigation).
    if (appointmentId) {
      setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
      setAppointmentId("");
      setDepositCredit(0);
    }
    if (result.saleId) {
      setCart([]);
      await printSaleReceipt(result.saleId);
      router.push(`/sales/${result.saleId}`);
      router.refresh();
    }
    return result;
  }

  const checkoutLabel = duesOnly
    ? `Collect past dues · ${formatCurrency(selectedDuesTotal)}`
    : appliedDeposit > 0
      ? `Complete sale · collect ${formatCurrency(receivedNow)}`
      : isPartial
        ? `Complete · due ${formatCurrency(remainingDue)}`
        : selectedDuesTotal > 0
          ? `Complete · collect ${formatCurrency(collectTarget)}`
          : "Complete sale";

  const checkoutDescription = duesOnly
    ? `Collect ${formatCurrency(selectedDuesTotal)} against ${selectedDueInvoices.length} past invoice${selectedDueInvoices.length === 1 ? "" : "s"} via ${paymentMethod}? Unchecked dues stay for next time.`
    : isPartial
      ? `Sale ${formatCurrency(total)}${selectedDuesTotal > 0 ? ` + past dues ${formatCurrency(selectedDuesTotal)}` : ""}. Collecting ${formatCurrency(receivedNow)} now. New-sale balance due: ${formatCurrency(remainingDue)}.`
      : collectTarget > 0
        ? `Confirm collection of ${formatCurrency(collectTarget)} via ${paymentMethod}?${selectedDuesTotal > 0 ? ` Includes ${formatCurrency(selectedDuesTotal)} past dues.` : ""} A receipt will print after completion.`
        : `Confirm this sale? Advance covers the full amount. A receipt will print after completion.`;

  const q = search.toLowerCase();
  const filteredServices = services.filter((s) => s.name.toLowerCase().includes(q));
  const filteredProducts = products.filter((s) => s.name.toLowerCase().includes(q));
  const filteredPackages = packages.filter((s) => s.name.toLowerCase().includes(q));

  const customerAppointments = customerId
    ? appointments.filter((a) => a.customerId === customerId)
    : appointments;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-4">
        <Input
          placeholder="Search services, products, packages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filteredServices.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Services</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    addItem({
                      itemType: "SERVICE",
                      itemId: s.id,
                      name: s.name,
                      unitPrice: Number(s.price),
                      quantity: 1,
                    })
                  }
                  className="rounded-lg border p-3 text-left hover:bg-muted/50"
                >
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(s.price)}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {filteredProducts.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Products</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={p.stock_quantity <= 0}
                  onClick={() =>
                    addItem({
                      itemType: "PRODUCT",
                      itemId: p.id,
                      name: p.name,
                      unitPrice: Number(p.retail_price),
                      quantity: 1,
                    })
                  }
                  className="rounded-lg border p-3 text-left hover:bg-muted/50 disabled:opacity-50"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(p.retail_price)} · Stock: {p.stock_quantity}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {filteredPackages.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Packages</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredPackages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    addItem({
                      itemType: "PACKAGE",
                      itemId: p.id,
                      name: p.name,
                      unitPrice: Number(p.price),
                      quantity: 1,
                    })
                  }
                  className="rounded-lg border p-3 text-left hover:bg-muted/50"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(p.price)}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="lg:col-span-2 rounded-lg border p-4 space-y-4 h-fit lg:sticky lg:top-20">
        <h2 className="font-semibold">Cart</h2>

        <div
          className={cn(
            "space-y-3 rounded-lg border p-3",
            depositCredit > 0 ? "border-primary/40 bg-primary/5" : "border-dashed bg-muted/20"
          )}
        >
          <div>
            <p className="text-sm font-medium">Appointment &amp; advance</p>
            <p className="text-xs text-muted-foreground">
              Open appointments from any date — past, today, or upcoming. Search by name, date, or
              time, then link to apply any advance.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment">Select appointment</Label>
            <AppointmentPicker
              id="appointment"
              appointments={customerId ? customerAppointments : appointments}
              value={appointmentId}
              onValueChange={(id) => loadAppointment(id)}
              placeholder="Search by name, date, or time…"
            />
          </div>

          {appointmentsWithAdvance.length > 0 && !appointmentId && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Quick pick — has unapplied advance
              </p>
              {appointmentsWithAdvance.slice(0, 6).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => applyAppointment(a)}
                  className="flex w-full items-center justify-between rounded-md border border-primary/20 bg-background px-2.5 py-2 text-left text-xs hover:bg-primary/10"
                >
                  <span className="truncate pr-2">
                    {formatDate(a.scheduledAt)} {formatTime(a.scheduledAt)} — {a.customerName}
                    <span className="text-muted-foreground">
                      {" "}
                      · added {formatDate(a.createdAt)}
                    </span>
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-primary">
                    {formatCurrency(a.depositBalance)}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {depositCredit > 0 && (
            <div className="rounded-md bg-primary/10 px-3 py-2 text-sm">
              <span className="font-semibold text-primary">{formatCurrency(depositCredit)}</span>
              <span className="text-primary/80"> advance will be deducted at checkout</span>
            </div>
          )}

          {selectedAppointment && (
            <div className="space-y-2 rounded-md border bg-background px-3 py-2 text-xs">
              <p>
                <span className="text-muted-foreground">Scheduled: </span>
                {formatDate(selectedAppointment.scheduledAt)}{" "}
                {formatTime(selectedAppointment.scheduledAt)}
              </p>
              <p>
                <span className="text-muted-foreground">Date added: </span>
                {formatDateTime(selectedAppointment.createdAt)}
              </p>
              <p className="text-muted-foreground">
                Checkout → Completed in History. Didn&apos;t come? Mark no-show.
              </p>
              {canMarkNoShow ? (
                <MarkNoShowButton
                  appointmentId={selectedAppointment.id}
                  onMarked={(id) => {
                    setAppointments((prev) => prev.filter((a) => a.id !== id));
                    setAppointmentId("");
                    setDepositCredit(0);
                    router.refresh();
                  }}
                />
              ) : null}
            </div>
          )}

          {customerLookupPending && (
            <p className="text-xs text-muted-foreground">Checking customer advances…</p>
          )}

          {appointments.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No open appointments. Book one on the Appointments page first.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Served by</Label>
          <p className="text-xs text-muted-foreground">Select one or more</p>
          <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-input p-2">
            {staff.length === 0 ? (
              <p className="px-1 py-1 text-xs text-muted-foreground">No active staff</p>
            ) : (
              staff.map((s) => {
                const checked = staffIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setStaffIds((prev) =>
                          checked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                        );
                      }}
                      className="size-3.5 accent-primary"
                    />
                    <span>{s.full_name}</span>
                  </label>
                );
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Counts toward staff performance (split equally). Auto-fills from the linked appointment.
          </p>
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add items to begin checkout
            {customerId && dueInvoices.length > 0
              ? ", or check past dues below to collect them alone."
              : "."}
          </p>
        ) : (
          <ul className="space-y-2">
            {cart.map((item) => (
              <li
                key={`${item.itemType}-${item.itemId}`}
                className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border/60 p-2 text-sm sm:flex sm:border-0 sm:p-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <Badge variant="secondary" className="text-xs">{item.itemType}</Badge>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1 sm:contents">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateQty(item.itemType, item.itemId, Number(e.target.value))}
                    className="h-10 w-16 sm:h-8"
                  />
                  <span className="w-20 text-right tabular-nums">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                  <ConfirmAction
                    title="Remove item?"
                    description={`Remove “${item.name}” from this sale?`}
                    confirmLabel="Remove"
                    pendingLabel="Removing…"
                    variant="ghost"
                    size="icon"
                    className="size-10 sm:size-7"
                    successMessage="Item removed."
                    onConfirm={async () => {
                      setCart((prev) =>
                        prev.filter(
                          (c) => !(c.itemType === item.itemType && c.itemId === item.itemId)
                        )
                      );
                    }}
                  >
                    <X className="size-3.5" />
                  </ConfirmAction>
                </div>
              </li>
            ))}
          </ul>
        )}

        {(usageLoading || usageLines.length > 0) && (
          <div className="space-y-2 rounded-lg border border-teal-200/80 bg-teal-50/50 p-3 dark:border-teal-900/40 dark:bg-teal-950/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">In-house used (this sale)</p>
              {usageLoading ? (
                <span className="text-xs text-muted-foreground">Updating…</span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Internal stock only — not charged to customer
                </span>
              )}
            </div>
            {usageLines.length === 0 && !usageLoading ? (
              <p className="text-xs text-muted-foreground">No in-house recipe linked to these services.</p>
            ) : (
              <ul className="space-y-1.5">
                {usageLines.map((line) => (
                  <li
                    key={line.productId}
                    className="flex flex-wrap items-center gap-2 rounded-md bg-background/80 px-2 py-1.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{line.productName}</span>
                    {line.unitLabel ? (
                      <Badge variant="outline" className="text-xs">
                        {line.unitLabel}
                      </Badge>
                    ) : null}
                    <Input
                      type="number"
                      min={0}
                      step="0.001"
                      className="h-8 w-24"
                      value={line.quantity}
                      onChange={(e) => {
                        const qty = roundQty(Math.max(0, Number(e.target.value) || 0));
                        setUsageLines((prev) =>
                          prev.map((row) =>
                            row.productId === line.productId
                              ? { ...row, quantity: qty, dirty: true }
                              : row
                          )
                        );
                      }}
                    />
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setUsageLines((prev) =>
                          prev.map((row) =>
                            row.productId === line.productId
                              ? { ...row, quantity: row.recipeQty, dirty: false }
                              : row
                          )
                        )
                      }
                    >
                      Reset
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="customer">Customer</Label>
          <CustomerPicker
            id="customer"
            customers={customers}
            value={customerId}
            onValueChange={handleCustomerChange}
            allowEmpty
            emptyLabel="Walk-in"
            placeholder="Search customer name or phone…"
            searchRemote={searchPosCustomers}
          />
          {selectedAppointment && (
            <p className="text-xs text-muted-foreground">
              Linked: {selectedAppointment.customerName} · {selectedAppointment.status}
            </p>
          )}
        </div>

        {customerId ? (
          <div className="space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Outstanding dues</p>
              {duesLoading ? (
                <span className="text-xs text-muted-foreground">Loading…</span>
              ) : dueInvoices.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  Check to collect now · leave unchecked for next visit
                </span>
              ) : null}
            </div>
            {!duesLoading && dueInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground">No unpaid invoices for this customer.</p>
            ) : null}
            {dueInvoices.length > 0 ? (
              <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                {dueInvoices.map((d) => {
                  const checked = selectedDueIds.has(d.saleId);
                  const label = d.invoiceNumber ?? d.saleId.slice(0, 8);
                  return (
                    <label
                      key={d.saleId}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm",
                        checked
                          ? "border-amber-400/70 bg-background"
                          : "border-transparent bg-background/60 hover:bg-background"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDueInvoice(d.saleId)}
                        className="size-4 rounded border-input accent-primary"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
                      {d.completedAt ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(d.completedAt)}
                        </span>
                      ) : null}
                      <span className="shrink-0 tabular-nums font-semibold">
                        {formatCurrency(d.amountDue)}
                      </span>
                    </label>
                  );
                })}
              </ul>
            ) : null}
            {selectedDuesTotal > 0.009 ? (
              <div className="flex justify-between border-t border-amber-200/60 pt-2 text-sm font-medium">
                <span>Past dues selected</span>
                <span>{formatCurrency(selectedDuesTotal)}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="discount">Discount</Label>
            <Input
              id="discount"
              type="number"
              min={0}
              step={1}
              value={discount || ""}
              placeholder="0"
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment">Payment</Label>
            <select
              id="payment"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={applyTax}
              onChange={(e) => {
                setApplyTax(e.target.checked);
                if (!e.target.checked) setTax("");
              }}
              className="size-4 rounded border-input accent-primary"
            />
            <span className="font-medium">Add tax</span>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          {applyTax && (
            <div className="space-y-1.5">
              <Label htmlFor="tax" className="text-xs text-muted-foreground">
                Tax amount
              </Label>
              <Input
                id="tax"
                type="number"
                min={0}
                step={1}
                value={tax}
                placeholder="e.g. 150"
                onChange={(e) => setTax(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>+{formatCurrency(taxAmount)}</span>
            </div>
          )}
          {total > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sale total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          )}
          {appliedDeposit > 0 && (
            <div className="flex justify-between font-medium text-primary">
              <span>Advance paid</span>
              <span>-{formatCurrency(appliedDeposit)}</span>
            </div>
          )}
          {hasCart ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">This sale</span>
              <span>{formatCurrency(saleCollect)}</span>
            </div>
          ) : null}
          {selectedDuesTotal > 0.009 ? (
            <div className="flex justify-between text-amber-800 dark:text-amber-300">
              <span>Past dues selected</span>
              <span>+{formatCurrency(selectedDuesTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-2 font-semibold text-base">
            <span>Collect now</span>
            <span>{formatCurrency(collectTarget)}</span>
          </div>
          {appliedDeposit > 0 && saleCollect === 0 && selectedDuesTotal <= 0 && (
            <p className="text-xs text-green-600">Fully covered by advance — no payment needed today.</p>
          )}
        </div>

        {collectTarget > 0 ? (
          <div className="space-y-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold">Payment now</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={
                  Math.abs(receivedNow - collectTarget) < 0.01 && !isPartial ? "default" : "outline"
                }
                onClick={() => {
                  setAmountReceived(String(collectTarget));
                  setTenderedAmount(String(collectTarget));
                  setConfirmPartial(false);
                  setAllowUnpaid(false);
                }}
              >
                Pay full ({formatCurrency(collectTarget)})
              </Button>
              {hasCart && !isWalkIn ? (
                <Button
                  type="button"
                  size="sm"
                  variant={isPartial ? "default" : "outline"}
                  onClick={() => {
                    const halfSale = Math.round((saleCollect / 2) * 100) / 100;
                    const partialTotal = roundMoney(halfSale + selectedDuesTotal);
                    setAmountReceived(String(partialTotal));
                    setTenderedAmount(String(partialTotal));
                  }}
                >
                  Partial on sale
                </Button>
              ) : hasCart && isWalkIn ? (
                <p className="text-xs text-muted-foreground self-center">
                  Walk-in must pay full amount
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount-received">Amount customer is paying now</Label>
              <Input
                id="amount-received"
                type="number"
                min={0}
                step={1}
                value={amountReceived === "" ? collectTarget : amountReceived}
                onChange={(e) => {
                  setAmountReceived(e.target.value);
                  setTenderedAmount(e.target.value);
                }}
              />
              {selectedDuesTotal > 0.009 ? (
                <p className="text-xs text-muted-foreground">
                  Includes {formatCurrency(selectedDuesTotal)} past dues (must be paid in full).
                  Toward this sale: {formatCurrency(saleReceived)}.
                </p>
              ) : null}
            </div>
            {paymentMethod === "CASH" ? (
              <div className="space-y-1">
                <Label htmlFor="tendered">Cash tendered (optional)</Label>
                <Input
                  id="tendered"
                  type="number"
                  min={0}
                  step={1}
                  value={tenderedAmount === "" ? receivedNow : tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value)}
                />
                {changeGiven > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Change to return: {formatCurrency(changeGiven)}
                  </p>
                ) : null}
              </div>
            ) : null}
            {hasCart ? (
              <div className="flex justify-between rounded-md bg-background px-2 py-1.5 text-sm">
                <span className="text-muted-foreground">Remaining due (this sale)</span>
                <span
                  className={
                    remainingDue > 0
                      ? "font-semibold text-amber-700 dark:text-amber-400"
                      : "font-semibold"
                  }
                >
                  {formatCurrency(remainingDue)}
                </span>
              </div>
            ) : null}
            {isPartial && !isWalkIn ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirmPartial}
                  onChange={(e) => setConfirmPartial(e.target.checked)}
                />
                <span>
                  I confirm {formatCurrency(remainingDue)} will stay as customer due for{" "}
                  {customers.find((c) => c.id === customerId)
                    ? formatCustomerName(
                        customers.find((c) => c.id === customerId)!.first_name,
                        customers.find((c) => c.id === customerId)!.last_name
                      )
                    : "this customer"}
                  .
                </span>
              </label>
            ) : null}
            {isUnpaid && canManage && !isWalkIn ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={allowUnpaid}
                  onChange={(e) => setAllowUnpaid(e.target.checked)}
                />
                <span>Create as unpaid invoice (manager approval)</span>
              </label>
            ) : null}
            {isWalkIn && isPartial ? (
              <p className="text-xs text-destructive">
                Walk-in must pay in full. Select a customer to leave a due balance.
              </p>
            ) : null}
          </div>
        ) : null}

        <ConfirmAction
          title={duesOnly ? "Collect past dues?" : "Complete this sale?"}
          description={checkoutDescription}
          confirmLabel={checkoutLabel}
          pendingLabel="Processing…"
          variant="default"
          size="default"
          className="w-full"
          disabled={
            (!hasCart && !duesOnly) ||
            (isPartial && !isWalkIn && !confirmPartial) ||
            (isUnpaid && (!allowUnpaid || !canManage))
          }
          onConfirm={runCheckout}
          successMessage=""
        >
          {checkoutLabel}
        </ConfirmAction>
      </div>
    </div>
  );
}
