import Link from "next/link";
import { Info, Package, ShoppingBag, FlaskConical } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type DashboardStockToday = {
  unitsSold: number;
  retailRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  marginPercent: number;
  inventoryValueAtCost: number;
  inventoryValueAtRetail: number;
  inventoryUnitsOnHand: number;
  inHouseValueAtCost?: number;
  inHouseUnitsOnHand?: number;
  serviceRevenue: number;
  lowStockCount: number;
  productsSold: { name: string; qty: number; revenue: number; profit: number }[];
};

type DashboardStockPanelProps = {
  stock: DashboardStockToday;
};

export function DashboardStockPanel({ stock }: DashboardStockPanelProps) {
  const inHouseValue = stock.inHouseValueAtCost ?? 0;
  const inHouseUnits = stock.inHouseUnitsOnHand ?? 0;
  const hasSales = stock.unitsSold > 0;
  const hasRetailStock = stock.inventoryUnitsOnHand > 0;
  const hasInHouse = inHouseUnits > 0 || inHouseValue > 0;
  const markupPotential = stock.inventoryValueAtRetail - stock.inventoryValueAtCost;

  return (
    <div className="dashboard-card w-full min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Stock &amp; inventory today</h3>
          <p className="text-xs text-muted-foreground">
            Left = retail products sold at POS. Right = shelf stock. In-house (back-bar) is separate —
            it is not “sold” here; usage shows under Reports → In-house.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pr-14 sm:pr-0">
          <Button type="button" size="sm" variant="outline" className="h-9 flex-1 sm:flex-none" render={<Link href="/finances" />}>
            Finances
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-9 flex-1 sm:flex-none" render={<Link href="/products" />}>
            Retail stock
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-9 flex-1 sm:flex-none" render={<Link href="/in-house" />}>
            In-house
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 gap-0 lg:grid-cols-2">
        <div
          className={`border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r ${
            hasSales ? "bg-primary/[0.04]" : ""
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <ShoppingBag className="size-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Retail stock sold today</span>
          </div>

          {hasSales ? (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <p className="text-2xl font-bold text-foreground sm:text-3xl">
                  {formatCurrency(stock.retailRevenue)}
                </p>
                <span className="delta-pill delta-pill-info">{stock.unitsSold} units</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    COGS
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(stock.costOfGoodsSold)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Profit
                  </p>
                  <p className="font-semibold">
                    <span className="delta-pill delta-pill-positive">
                      {formatCurrency(stock.grossProfit)} · {stock.marginPercent}%
                    </span>
                  </p>
                </div>
              </div>
              {stock.productsSold.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-border pt-3">
                  {stock.productsSold.map((p) => (
                    <li
                      key={p.name}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {p.qty}× {formatCurrency(p.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(0)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                No <strong className="text-foreground">retail</strong> products sold at POS yet
                today. Selling shampoo / retail items on{" "}
                <Link href="/pos" className="font-medium text-primary hover:underline">
                  POS
                </Link>{" "}
                fills this. In-house cream/wax usage does not appear here.
              </p>
              {stock.serviceRevenue > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Service sales today: {formatCurrency(stock.serviceRevenue)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-success/10">
                <Package className="size-4 text-success" />
              </div>
              <span className="text-sm font-medium">Retail on hand</span>
              {stock.lowStockCount > 0 && (
                <Badge variant="secondary" className="bg-warning/10 text-warning">
                  {stock.lowStockCount} low
                </Badge>
              )}
            </div>
            {hasRetailStock ? (
              <>
                <p className="text-2xl font-bold sm:text-3xl">
                  {formatCurrency(stock.inventoryValueAtCost)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stock.inventoryUnitsOnHand} units at cost · retail value{" "}
                  {formatCurrency(stock.inventoryValueAtRetail)}
                </p>
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">Retail markup potential</span>
                      <Tooltip>
                        <TooltipTrigger
                          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="About retail markup potential"
                        >
                          <Info className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          Retail value of sellable stock minus cost. In-house back-bar is excluded so
                          it does not pull this number down.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="mt-1">
                      <span className="delta-pill delta-pill-info">
                        {formatCurrency(markupPotential)}
                      </span>
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No retail products on hand. Add items under{" "}
                <Link href="/products" className="font-medium text-primary hover:underline">
                  Products
                </Link>
                .
              </p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-teal-500/10">
                <FlaskConical className="size-4 text-teal-700 dark:text-teal-400" />
              </div>
              <span className="text-sm font-medium">In-house (back-bar)</span>
            </div>
            {hasInHouse ? (
              <>
                <p className="text-xl font-bold sm:text-2xl">
                  {formatCurrency(inHouseValue)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {inHouseUnits} units at cost · stock value = qty × cost per unit
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Clients-left / usage cost show on each product under{" "}
                  <Link href="/in-house" className="font-medium text-primary hover:underline">
                    In-house
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/reports?tab=in_house"
                    className="font-medium text-primary hover:underline"
                  >
                    Reports → In-house
                  </Link>
                  . Auto-deduct only after you link a service.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No in-house stock value yet. On{" "}
                <Link href="/in-house" className="font-medium text-primary hover:underline">
                  In-house
                </Link>
                , set quantity and cost (or Edit → Update quantity). If qty or cost is 0, this stays{" "}
                {formatCurrency(0)}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
