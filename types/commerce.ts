export type ActionResult = {
  error?: string;
  success?: boolean;
  recordDate?: string;
};

export type SaleItemType = "SERVICE" | "PRODUCT" | "PACKAGE";
export type PaymentMethod = "CASH" | "CARD" | "OTHER";
export type SaleStatus = "DRAFT" | "COMPLETED" | "AMENDED" | "VOID" | "REFUNDED";
export type SalePaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export type CartItem = {
  itemType: SaleItemType;
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type CheckoutPaymentLine = {
  amount: number;
  method: PaymentMethod;
};

export type PriorDuePaymentLine = {
  saleId: string;
  amount: number;
  expectedPaymentVersion: number;
};

export type CheckoutPayload = {
  items: CartItem[];
  customerId?: string | null;
  appointmentId?: string | null;
  /** Primary stylist (first selected) — kept for receipts / legacy */
  staffId?: string | null;
  /** All stylists who served on this sale (equal-share reports) */
  staffIds?: string[];
  discount: number;
  /** Optional flat tax amount in PKR — omit or 0 when not applied */
  tax?: number;
  /** Primary method when using single amountReceived */
  paymentMethod: PaymentMethod;
  /** Amount collected now toward THIS sale only (partial allowed for named customers). */
  amountReceived?: number;
  /** Split tender lines; if set, overrides amountReceived */
  payments?: CheckoutPaymentLine[];
  /** Cash tendered (for change); optional */
  tenderedAmount?: number;
  /** Explicit unpaid/credit sale — requires manager */
  allowUnpaid?: boolean;
  notes?: string;
  /**
   * Optional past invoices to settle fully in the same POS visit.
   * Amount for each line must equal that invoice's current amount_due.
   * Validated before the new sale is created; applied after it succeeds.
   */
  priorDuePayments?: PriorDuePaymentLine[];
};
