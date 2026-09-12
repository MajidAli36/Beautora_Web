import { SYNCOPS } from "@/lib/print/syncops";
import { getEmailLinkBaseUrl } from "@/lib/email/config";
import { escapeHtml } from "@/lib/email/escape";

type LayoutInput = {
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

export function renderEmailLayout(input: LayoutInput): { html: string; text: string } {
  const base = getEmailLinkBaseUrl();
  const title = escapeHtml(input.title);
  const preheader = escapeHtml(input.preheader);
  const ctaLabel = input.ctaLabel ? escapeHtml(input.ctaLabel) : null;
  const ctaUrl = input.ctaUrl ?? null;
  const footerNote = input.footerNote
    ? escapeHtml(input.footerNote)
    : "You’re receiving this because of activity on your Beautora account.";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F6F3;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#06211D;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F6F3;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #E4E7E2;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#06211D;padding:28px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${base}/brand/beautora-logo.png" width="36" height="32" alt="${escapeHtml(SYNCOPS.name)}" style="display:block;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#F5F6F3;">${escapeHtml(SYNCOPS.name)}</p>
                    <p style="margin:6px 0 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(245,246,243,0.55);">${escapeHtml(SYNCOPS.builder.short)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:650;color:#06211D;">${title}</h1>
              <div style="font-size:15px;line-height:1.65;color:#3D4A46;">
                ${input.bodyHtml}
              </div>
              ${
                ctaLabel && ctaUrl
                  ? `<p style="margin:28px 0 0;">
                      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#06211D;color:#F5F6F3;text-decoration:none;font-size:14px;font-weight:600;padding:14px 22px;border-radius:8px;">${ctaLabel}</a>
                    </p>
                    <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#6B7672;word-break:break-all;">
                      Or open this link:<br /><a href="${escapeHtml(ctaUrl)}" style="color:#0F9D8C;">${escapeHtml(ctaUrl)}</a>
                    </p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #E4E7E2;background:#FAFBFA;">
              <p style="margin:0;font-size:12px;line-height:1.55;color:#6B7672;">${footerNote}</p>
              <p style="margin:12px 0 0;font-size:12px;color:#6B7672;">
                <a href="${escapeHtml(base)}" style="color:#0F9D8C;text-decoration:none;">${escapeHtml(SYNCOPS.domain)}</a>
                · Built by
                <a href="${escapeHtml(SYNCOPS.builder.url)}" style="color:#0F9D8C;text-decoration:none;">${escapeHtml(SYNCOPS.builder.name)}</a>
                · Support:
                <a href="mailto:${escapeHtml(SYNCOPS.email)}" style="color:#0F9D8C;text-decoration:none;">${escapeHtml(SYNCOPS.email)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    input.title,
    "",
    stripHtml(input.bodyHtml),
    "",
    ctaLabel && ctaUrl ? `${ctaLabel}: ${ctaUrl}` : null,
    "",
    footerNote,
    `${SYNCOPS.domain} · Built by ${SYNCOPS.builder.name} · ${SYNCOPS.email}`,
  ].filter(Boolean);

  return { html, text: textParts.join("\n") };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
