import { revalidatePath } from "next/cache";

/**
 * Targeted cache invalidation after mutations.
 * Prefer these over blasting dashboard/reports/finances on every save —
 * those pages are already dynamic (auth cookies) and refresh on next visit.
 */

export function revalidateProducts(productId?: string) {
  revalidatePath("/products");
  revalidatePath("/in-house");
  revalidatePath("/pos");
  if (productId) revalidatePath(`/in-house/${productId}`);
}

export function revalidateServices() {
  revalidatePath("/services");
  revalidatePath("/pos");
  revalidatePath("/appointments");
}

export function revalidateCustomers(customerId?: string | null) {
  revalidatePath("/customers");
  revalidatePath("/pos");
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
  }
}

export function revalidateSales(saleId?: string, customerId?: string | null) {
  revalidatePath("/sales");
  revalidatePath("/pos");
  if (saleId) {
    revalidatePath(`/sales/${saleId}`);
    revalidatePath(`/sales/${saleId}/edit`);
  }
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
  }
}

export function revalidateCheckout(customerId?: string | null) {
  revalidatePath("/pos");
  revalidatePath("/sales");
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
  }
}

export function revalidateAppointments() {
  revalidatePath("/appointments");
  revalidatePath("/pos");
  revalidatePath("/queue");
}

export function revalidateStaff(staffId?: string) {
  revalidatePath("/staff");
  if (staffId) revalidatePath(`/staff/${staffId}`);
}

export function revalidateAppShell() {
  // Full shell (nav / role gates) — only after permission or billing lock changes
  revalidatePath("/", "layout");
}
