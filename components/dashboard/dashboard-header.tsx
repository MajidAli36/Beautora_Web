import Link from "next/link";
import { Calendar, Plus, ShoppingCart } from "lucide-react";
import { formatDate, getGreeting } from "@/lib/format";
import { Button } from "@/components/ui/button";

type DashboardHeaderProps = {
  organizationName?: string;
  userEmail?: string;
};

export function DashboardHeader({ organizationName, userEmail }: DashboardHeaderProps) {
  const today = new Date();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {getGreeting(userEmail)} 👋
        </h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening at{" "}
          <span className="font-medium text-foreground">
            {organizationName ?? "your salon"}
          </span>{" "}
          today.
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(today, "weekday")}</p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        <Button
          variant="outline"
          size="sm"
          className="h-11 shrink-0 touch-target sm:h-8"
          render={<Link href="/appointments/new" />}
        >
          <Calendar className="size-4" />
          New Appointment
        </Button>
        <Button
          size="sm"
          className="h-11 shrink-0 touch-target sm:h-8"
          render={<Link href="/pos" />}
        >
          <Plus className="size-4" />
          New Sale
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="hidden h-11 shrink-0 touch-target sm:inline-flex sm:h-8"
          render={<Link href="/pos" />}
        >
          <ShoppingCart className="size-4" />
          Open POS
        </Button>
      </div>
    </div>
  );
}
