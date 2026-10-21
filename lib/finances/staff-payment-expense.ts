import { STAFF_PAYMENT_TYPE_LABELS, type StaffPaymentType } from "@/lib/finances/categories";

type SupabaseLike = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
    delete: () => {
      eq: (col: string, val: string) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

/** Mirror a staff payment into expenses (PAYROLL) so it appears in expense reports. */
export async function createExpenseForStaffPayment(
  supabase: SupabaseLike,
  input: {
    organizationId: string;
    staffPaymentId: string;
    staffId: string;
    staffName?: string | null;
    amount: number;
    paymentType: StaffPaymentType | string;
    paymentMethod: string;
    paymentDate: string;
    notes?: string | null;
    createdBy?: string | null;
  }
): Promise<{ error?: string }> {
  const typeLabel =
    STAFF_PAYMENT_TYPE_LABELS[input.paymentType as StaffPaymentType] ??
    input.paymentType;
  const who = input.staffName?.trim() || "Staff";
  const noteBit = input.notes?.trim() ? ` — ${input.notes.trim()}` : "";
  const description = `Payroll · ${typeLabel} · ${who}${noteBit}`;

  const { error } = await supabase.from("expenses").insert({
    organization_id: input.organizationId,
    category: "PAYROLL",
    amount: input.amount,
    description,
    expense_date: input.paymentDate,
    payment_method: input.paymentMethod,
    staff_id: input.staffId,
    staff_payment_id: input.staffPaymentId,
    created_by: input.createdBy ?? null,
  });

  if (error) return { error: error.message };
  return {};
}
