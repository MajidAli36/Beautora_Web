/**
 * SyncOps Salon — shared design system (step 1 of app-wide polish)
 *
 * Import from here when building/upgrading screens so styling stays consistent.
 *
 * Brand tokens live in `app/globals.css` (:root):
 *   primary #0F9D8C · success #16A34A · danger #DC2626 · warning #D97706
 *   bg #FAFAFA · card #FFFFFF · border #EAEAEA · text #111827 / #6B7280
 *
 * Layout:
 *   - AppShell + AppSidebar + AppHeader (sticky 64px)
 *   - AppPage — title / subtitle / actions / content wrapper
 *   - QuickActionFab — mobile expandable "+"
 *
 * Surfaces & feedback:
 *   - Surface — white bordered panel (optional interactive hover)
 *   - Card / EmptyState / SearchField (300ms debounce)
 *   - Button · Badge · Input · Table · ConfirmAction · Sheet · Toast
 *
 * Next: upgrade screens one-by-one to AppPage + Surface + EmptyState + SearchField.
 */

export { Button, buttonVariants } from "@/components/ui/button";
export { Badge, badgeVariants } from "@/components/ui/badge";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
export { Surface } from "@/components/ui/surface";
export { EmptyState } from "@/components/ui/empty-state";
export { SearchField } from "@/components/ui/search-field";
export { Input } from "@/components/ui/input";
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
export { AppPage } from "@/components/layout/app-page";
