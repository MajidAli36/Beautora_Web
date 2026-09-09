import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getOrganizationSubscription,
  listMySubscriptionPayments,
} from "@/lib/actions/billing";
import { BillingPaymentForm } from "@/components/billing/billing-payment-form";
import { ViewSubscriptionInvoiceButton } from "@/components/billing/view-subscription-invoice-button";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function phaseBadge(phase: string) {
  if (phase === "trial") return <Badge variant="secondary">Free trial</Badge>;
  if (phase === "active") return <Badge className="bg-emerald-600">Active</Badge>;
  if (phase === "grace") return <Badge className="bg-amber-500">Grace ({SUBSCRIPTION.graceDays}-day caution)</Badge>;
  return <Badge variant="destructive">Locked</Badge>;
}

export default async function BillingPage() {
  const sub = await getOrganizationSubscription();
  if (!sub) redirect("/onboarding");

  const payments = await listMySubscriptionPayments();
  const { snapshot, orgName } = sub;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Billing"
        description={`Beautora subscription for ${orgName}`}
      />

      {snapshot.phase === "locked" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle>Store access paused</CardTitle>
            <CardDescription>
              The {SUBSCRIPTION.graceDays}-day caution window has ended. Send{" "}
              {SUBSCRIPTION.currencyLabel}{" "}
              {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")} via JazzCash to{" "}
              <strong>{SUBSCRIPTION.jazzcashDisplay}</strong>, then submit proof below. After
              Beautora verifies the payment, your store is re-enabled for{" "}
              {SUBSCRIPTION.periodDays} days.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Plan status</CardTitle>
            <CardDescription>
              1 month free trial → then {SUBSCRIPTION.currencyLabel}{" "}
              {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}/month (JazzCash)
            </CardDescription>
          </div>
          {phaseBadge(snapshot.phase)}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {snapshot.phase === "trial" && (
            <p>
              Trial ends in{" "}
              <strong>
                {snapshot.daysLeftInTrial} day{snapshot.daysLeftInTrial === 1 ? "" : "s"}
              </strong>
              {snapshot.trialEndsAt
                ? ` (${snapshot.trialEndsAt.toLocaleDateString("en-PK")})`
                : ""}
              . After that you get a{" "}
              <strong>{SUBSCRIPTION.graceDays}-day caution</strong> (hourly reminders) before
              lock.
            </p>
          )}
          {snapshot.phase === "active" && snapshot.subscriptionEndsAt && (
            <p>
              Paid through{" "}
              <strong>{snapshot.subscriptionEndsAt.toLocaleDateString("en-PK")}</strong>.
            </p>
          )}
          {snapshot.phase === "grace" && (
            <p>
              Caution period — about{" "}
              <strong>
                {snapshot.hoursLeftInGrace} hour
                {snapshot.hoursLeftInGrace === 1 ? "" : "s"}
              </strong>{" "}
              left. The salon still works; renew now to avoid lock.
            </p>
          )}
          <p className="text-muted-foreground">
            JazzCash: {SUBSCRIPTION.jazzcashDisplay} · Amount: {SUBSCRIPTION.currencyLabel}{" "}
            {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit JazzCash payment</CardTitle>
          <CardDescription>
            Manual verification by Beautora — we re-enable your store after approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillingPaymentForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments submitted yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">Ref {p.transaction_ref}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("en-PK")} ·{" "}
                      {SUBSCRIPTION.currencyLabel} {Number(p.amount).toLocaleString("en-PK")}
                    </p>
                    {p.has_invoice && (
                      <div className="mt-2">
                        <ViewSubscriptionInvoiceButton paymentId={p.id} />
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={
                      p.status === "approved"
                        ? "default"
                        : p.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {p.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Need help?{" "}
        <Link href="/syncops" className="underline-offset-2 hover:underline">
          Contact Beautora
        </Link>
      </p>
    </div>
  );
}
