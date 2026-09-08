import { cn } from "@/lib/utils";

type AppPageProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Extra class for the header row only */
  headerClassName?: string;
};

/**
 * Standard SyncOps page chrome:
 * Title + subtitle → primary actions (top-right) → content
 */
export function AppPage({
  title,
  description,
  actions,
  children,
  className,
  headerClassName,
}: AppPageProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6 lg:space-y-8",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
          headerClassName
        )}
      >
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
