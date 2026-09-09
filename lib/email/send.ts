import { Resend } from "resend";
import { getEmailConfig } from "@/lib/email/config";
import type { SendEmailInput, SendEmailResult } from "@/lib/email/types";

let client: Resend | null = null;

function getResendClient(apiKey: string): Resend {
  if (!client) client = new Resend(apiKey);
  return client;
}

/**
 * Central transactional email sender (Resend HTTP API).
 * SMTP_PASSWORD / RESEND_API_KEY is the Resend API key (also used as smtp.resend.com password).
 * Never throws — callers must not fail business operations on email errors.
 * Never logs API keys or auth tokens.
 */
export async function sendTransactionalEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const config = getEmailConfig();

  console.info("[email] requested", {
    type: input.type,
    to: input.to,
    from: config.fromEmail,
    appBaseUrl: config.appBaseUrl,
    production: config.isProduction,
  });

  if (!config.configured) {
    console.warn("[email] skipped — SMTP_PASSWORD / RESEND_API_KEY not set", {
      type: input.type,
      production: config.isProduction,
    });
    return { ok: false, error: "Email is not configured", skipped: true };
  }

  // Production safety: never send verify/reset links that point at localhost
  if (config.isProduction && /localhost|127\.0\.0\.1/i.test(config.appBaseUrl)) {
    console.error("[email] blocked — production APP_BASE_URL resolves to localhost", {
      type: input.type,
      appBaseUrl: config.appBaseUrl,
    });
    return {
      ok: false,
      error: "Production email links misconfigured (localhost)",
    };
  }

  try {
    const resend = getResendClient(config.apiKey);
    const { data, error } = await resend.emails.send(
      {
        from: config.fromHeader,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo || config.replyTo,
      },
      input.idempotencyKey
        ? { idempotencyKey: input.idempotencyKey.slice(0, 256) }
        : undefined
    );

    if (error) {
      console.error("[email] sending failed", {
        type: input.type,
        to: input.to,
        message: error.message,
        hint:
          /domain|not verified|from/i.test(error.message)
            ? "Verify beautora.app in Resend and use no-reply@beautora.app"
            : undefined,
      });
      return { ok: false, error: error.message };
    }

    console.info("[email] sent successfully", {
      type: input.type,
      to: input.to,
      id: data?.id,
    });
    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error("[email] sending failed", {
      type: input.type,
      to: input.to,
      message,
    });
    return { ok: false, error: message };
  }
}
