/**
 * Email service
 *
 * Generic emails → Gmail SMTP via Nodemailer + App Password (no OAuth needed)
 *   Required env vars on Render:
 *     GMAIL_USER         prathmeshwalimbe.cactuspartners@gmail.com
 *     GMAIL_APP_PASSWORD  16-char app password from Google Account settings
 *
 * Invite / Password reset → EmailJS (unchanged)
 */

const nodemailer = require('nodemailer');
const APP_URL = process.env.FRONTEND_URL || 'https://cactus-pro.vercel.app';

// ─── Gmail SMTP transporter ───────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   587,
    secure: false,
    family: 4,          // force IPv4 — Render free tier blocks IPv6 outbound
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });
}

async function sendViaGmail({ to, subject, body, cc, bcc, from_name }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('Gmail not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to Render env vars.');
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from:    `"${from_name || 'Cactus Partners'}" <${user}>`,
    to,
    cc:      cc  || undefined,
    bcc:     bcc || undefined,
    subject,
    text:    body,
    // Also send HTML version with line breaks preserved
    html:    `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${body}</pre>`,
  });

  console.log(`✓ Email sent via Gmail SMTP to ${to} — "${subject}"`);
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
  await sendViaGmail({ to, subject, body, cc, bcc, from_name });
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
