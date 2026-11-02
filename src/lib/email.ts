import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site-config";

/**
 * Transactional email via Resend's REST API (installed from the Vercel
 * Marketplace, which provisions RESEND_API_KEY). Plain fetch rather than
 * the SDK — one endpoint doesn't justify a dependency.
 *
 * EMAIL_FROM must be an address on a domain verified in Resend, e.g.
 * "Supply Chain Manager <briefing@supplychainmanager.app>".
 */
export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type SendEmailResult = { sent: true } | { sent: false; reason: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${input.subject}"`);
    return { sent: false, reason: "not_configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || `${SITE_NAME} <${CONTACT_EMAIL}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email] Resend ${res.status} for "${input.subject}": ${body.slice(0, 300)}`);
    return { sent: false, reason: `http_${res.status}` };
  }
  return { sent: true };
}

/** Internal notification to the founder inbox. Never throws — a failed notification must not fail the submission it reports on. */
export async function notifyFounder(subject: string, fields: Record<string, string | number>): Promise<void> {
  const rows = Object.entries(fields);
  try {
    await sendEmail({
      to: process.env.NOTIFY_EMAIL || CONTACT_EMAIL,
      subject,
      text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      html: `<table cellpadding="4">${rows
        .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
        .join("")}</table>`,
      replyTo: typeof fields["Work email"] === "string" ? fields["Work email"] : undefined,
    });
  } catch (err) {
    console.error("[email] notifyFounder failed:", err);
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
