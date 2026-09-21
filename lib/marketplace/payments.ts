/** Payment provider abstraction — COD at launch; gateways later. */

export type PaymentIntentStatus =
  | "created"
  | "pending"
  | "succeeded"
  | "failed"
  | "refunded"
  | "cancelled";

export type CreatePaymentInput = {
  orderId: string;
  amount: number;
  currency?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type PaymentIntentResult = {
  id: string;
  provider: string;
  status: PaymentIntentStatus;
  providerRef?: string | null;
  amount: number;
  currency: string;
};

export type PaymentResult = {
  intentId: string;
  status: PaymentIntentStatus;
};

export type RefundResult = {
  intentId: string;
  status: PaymentIntentStatus;
  amount: number;
};

export type WebhookEvent = {
  type: string;
  intentId?: string;
  providerRef?: string;
  raw: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentIntentResult>;
  confirmPayment(id: string): Promise<PaymentResult>;
  refundPayment(id: string, amount?: number): Promise<RefundResult>;
  getPaymentStatus(id: string): Promise<PaymentIntentStatus>;
  verifyWebhook(headers: Headers, body: string): Promise<WebhookEvent>;
}

/** COD: no capture at checkout; unpaid until delivery/collection. */
export class CodPaymentProvider implements PaymentProvider {
  readonly name = "cod";

  async createPayment(input: CreatePaymentInput): Promise<PaymentIntentResult> {
    return {
      id: `cod_${input.orderId}`,
      provider: this.name,
      status: "created",
      providerRef: input.idempotencyKey,
      amount: input.amount,
      currency: input.currency ?? "PKR",
    };
  }

  async confirmPayment(id: string): Promise<PaymentResult> {
    return { intentId: id, status: "pending" };
  }

  async refundPayment(id: string, amount = 0): Promise<RefundResult> {
    return { intentId: id, status: "cancelled", amount };
  }

  async getPaymentStatus(_id: string): Promise<PaymentIntentStatus> {
    return "pending";
  }

  async verifyWebhook(_headers: Headers, body: string): Promise<WebhookEvent> {
    return { type: "cod.noop", raw: body };
  }
}

/** Card / online: intent pending until gateway confirms; invoice on paid. */
export class CardPaymentProvider implements PaymentProvider {
  readonly name = "card";

  async createPayment(input: CreatePaymentInput): Promise<PaymentIntentResult> {
    return {
      id: `card_${input.orderId}`,
      provider: this.name,
      status: "pending",
      providerRef: input.idempotencyKey,
      amount: input.amount,
      currency: input.currency ?? "PKR",
    };
  }

  async confirmPayment(id: string): Promise<PaymentResult> {
    return { intentId: id, status: "succeeded" };
  }

  async refundPayment(id: string, amount = 0): Promise<RefundResult> {
    return { intentId: id, status: "refunded", amount };
  }

  async getPaymentStatus(_id: string): Promise<PaymentIntentStatus> {
    return "pending";
  }

  async verifyWebhook(_headers: Headers, body: string): Promise<WebhookEvent> {
    return { type: "card.webhook", raw: body };
  }
}

export function getPaymentProvider(provider = "cod"): PaymentProvider {
  if (provider === "card") return new CardPaymentProvider();
  return new CodPaymentProvider();
}
