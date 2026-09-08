import { formatCurrency } from "@/lib/format";
import { Users, UserPlus, Repeat, Wallet } from "lucide-react";

type CustomerInsightsProps = {
  totalCustomers: number;
  newThisWeek: number;
  returning: number;
  averageSpend: number;
  retentionRate: number | null;
};

export function CustomerInsights({
  totalCustomers,
  newThisWeek,
  returning,
  averageSpend,
  retentionRate,
}: CustomerInsightsProps) {
  const cards = [
    {
      label: "Total Customers",
      value: String(totalCustomers),
      sub: "Active in salon",
      icon: Users,
    },
    {
      label: "New This Week",
      value: String(newThisWeek),
      sub: newThisWeek > 0 ? "Recent sign-ups" : "No new customers",
      icon: UserPlus,
    },
    {
      label: "Returning",
      value: String(returning),
      sub: "Repeat buyers",
      icon: Repeat,
    },
    {
      label: "Avg Lifetime Spend",
      value: formatCurrency(averageSpend),
      sub:
        retentionRate != null
          ? `${retentionRate.toFixed(0)}% retention`
          : "Per customer with sales",
      icon: Wallet,
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Customer Insights</h3>
        <p className="text-xs text-muted-foreground">Growth and loyalty metrics</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {cards.map((card) => (
          <div key={card.label} className="dashboard-card w-full p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-lg font-bold text-foreground sm:text-xl">{card.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{card.sub}</p>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <card.icon className="size-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
