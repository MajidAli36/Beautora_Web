import { Resend } from "resend";
import { getEmailConfig } from "@/lib/email/config";
import { SYNCOPS } from "@/lib/print/syncops";
import type { SendEmailInput, SendEmailResult } from "@/lib/email/types";

let client: Resend | null = null;

function getResendClient(apiKey: string): Resend {
  if (!client) client = new Resend(apiKey);
  return client;
}

/**
 * Central transactional email sender (Resend HTTP API).
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
    emailLinkBaseUrl: config.emailLinkBaseUrl,
    production: config.isProduction,
  });

  if (!config.configured) {
    console.warn("[email] skipped — SMTP_PASSWORD / RESEND_API_KEY not set", {
      type: input.type,
      production: config.isProduction,
    });
    return { ok: false, error: "Email is not configured", skipped: true };
  }

  if (
    config.isProduction &&
    /localhost|127\.0\.0\.1/i.test(config.emailLinkBaseUrl)
  ) {
    console.error("[email] blocked — production email link base resolves to localhost", {
      type: input.type,
      emailLinkBaseUrl: config.emailLinkBaseUrl,
    });
    return {
      ok: false,
      error: "Production email links misconfigured (localhost)",
    };
  }

  const supportMailto = `mailto:${config.replyTo}?subject=${encodeURIComponent(
    `Unsubscribe request (${SYNCOPS.name})`
  )}`;
  const entityRef =
    input.idempotencyKey?.slice(0, 64) ||
    `${input.type}:${input.to}:${Date.now()}`;

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
        headers: {
          "List-Unsubscribe": `<${supportMailto}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Entity-Ref-ID": entityRef,
          "X-Beautora-Mail-Type": input.type,
        },
        tags: [
          { name: "category", value: "transactional" },
          { name: "mail_type", value: input.type },
        ],
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
            ? "Verify beautora.app domain in Resend (SPF/DKIM/DMARC) and use no-reply@beautora.app"
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
