/**
 * Email service
 *
 * Generic emails → Resend API (free, 100/day, works on Render, no SMTP)
 *   Required env vars on Render:
 *     RESEND_API_KEY    → get from resend.com (free account, 2 mins)
 *     RESEND_FROM       → e.g. "Cactus Partners <you@yourdomain.com>"
 *                         OR leave blank to use onboarding@resend.dev (for testing)
 *
 * Invite / Password reset → EmailJS (unchanged)
 */

const APP_URL = process.env.FRONTEND_URL || 'https://cactus-pro.vercel.app';

// ─── Resend API (HTTPS, no SMTP, works everywhere) ───────────────────────────

async function sendViaResend({ to, subject, body, cc, bcc, from_name }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set. Sign up free at resend.com and add the key to Render.');

  const from = process.env.RESEND_FROM || `${from_name || 'Cactus Partners'} <onboarding@resend.dev>`;

  const payload = {
    from,
    to:      Array.isArray(to) ? to : [to],
    subject,
    text:    body,
    html:    `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${body}</pre>`,
    ...(cc  ? { cc:  Array.isArray(cc)  ? cc  : [cc]  } : {}),
    ...(bcc ? { bcc: Array.isArray(bcc) ? bcc : [bcc] } : {}),
  };

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`Resend error ${res.status}: ${err.message || JSON.stringify(err)}`);
  }

  const data = await res.json();
  console.log(`✓ Email sent via Resend to ${to} — id: ${data.id}`);
}

// ─── EmailJS (invite + password reset only — unchanged) ──────────────────────

async function sendViaEmailJS(templateId, params) {
  const serviceId  = process.env.EMAILJS_SERVICE_ID;
  const publicKey  = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !publicKey || !privateKey) throw new Error('EmailJS not configured.');

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      service_id:      serviceId,
      template_id:     templateId,
      user_id:         publicKey,
      accessToken:     privateKey,
      template_params: params,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`EmailJS error ${res.status}: ${text}`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function sendGeneric({ to, subject, body, cc, bcc, from_name }) {
  await sendViaResend({ to, subject, body, cc, bcc, from_name });
}

async function sendInvite({ to, name, token, inviterName }) {
  const link = `${APP_URL}/set-password?token=${token}&type=invite`;
  const templateId = process.env.EMAILJS_INVITE_TPL;
  if (!templateId) throw new Error('EMAILJS_INVITE_TPL env var not set');
  await sendViaEmailJS(templateId, {
    to_email: to, to_name: name || to, invite_link: link,
    inviter_name: inviterName || 'The Cactus Team',
    firm_name: 'Cactus Partners', expiry: '48 hours',
  });
}

async function sendPasswordReset({ to, token }) {
  const link = `${APP_URL}/set-password?token=${token}&type=reset`;
  const templateId = process.env.EMAILJS_RESET_TPL;
  if (!templateId) throw new Error('EMAILJS_RESET_TPL env var not set');
  await sendViaEmailJS(templateId, {
    to_email: to, reset_link: link,
    firm_name: 'Cactus Partners', expiry: '1 hour',
  });
}

module.exports = { sendGeneric, sendInvite, sendPasswordReset };
