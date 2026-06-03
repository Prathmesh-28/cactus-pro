/**
 * Email service
 *
 * Generic emails (Compose, Founder emails, LP updates etc):
 *   → Gmail REST API via OAuth2 — no templates, no SMTP issues
 *   Required env vars on Render:
 *     GMAIL_USER          → prathmeshwalimbe.cactuspartners@gmail.com
 *     GMAIL_CLIENT_ID     → from Google Cloud Console OAuth2 credentials
 *     GMAIL_CLIENT_SECRET → from Google Cloud Console OAuth2 credentials
 *     GMAIL_REFRESH_TOKEN → from OAuth Playground (one-time setup)
 *
 * Invite / Password reset emails:
 *   → EmailJS REST API (existing setup, no change)
 */

const APP_URL = process.env.FRONTEND_URL || 'https://cactus-pro.vercel.app';

// ─── Gmail OAuth2 token refresh ───────────────────────────────────────────────

async function getGmailAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail token refresh failed: ${err}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ─── Build RFC 2822 raw email ─────────────────────────────────────────────────

function buildRawEmail({ from, to, cc, bcc, subject, body }) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    ...(cc  ? [`Cc: ${cc}`]  : []),
    ...(bcc ? [`Bcc: ${bcc}`] : []),
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    body,
  ];
  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ─── Send via Gmail API ───────────────────────────────────────────────────────

async function sendViaGmail({ to, subject, body, cc, bcc, from_name }) {
  const user     = process.env.GMAIL_USER;
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!user || !clientId || !clientSecret || !refreshToken) {
    throw new Error('Gmail not configured. Add GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN to Render env vars.');
  }

  const accessToken = await getGmailAccessToken();

  const from = from_name ? `"${from_name}" <${user}>` : user;
  const raw  = buildRawEmail({ from, to, cc, bcc, subject, body });

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail API error ${res.status}: ${err}`);
  }

  console.log(`✓ Email sent via Gmail to ${to} (subject: ${subject})`);
}

// ─── EmailJS (for invite + password reset only) ───────────────────────────────

async function sendViaEmailJS(templateId, params) {
  const serviceId  = process.env.EMAILJS_SERVICE_ID;
  const publicKey  = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !publicKey || !privateKey) {
    throw new Error('EmailJS not configured.');
  }

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

// ─── Public functions ─────────────────────────────────────────────────────────

async function sendGeneric({ to, subject, body, cc, bcc, from_name }) {
  await sendViaGmail({ to, subject, body, cc, bcc, from_name: from_name || 'Cactus Partners' });
}

async function sendInvite({ to, name, token, inviterName }) {
  const link = `${APP_URL}/set-password?token=${token}&type=invite`;
  const templateId = process.env.EMAILJS_INVITE_TPL;
  if (!templateId) throw new Error('EMAILJS_INVITE_TPL env var not set');
  await sendViaEmailJS(templateId, {
    to_email:     to,
    to_name:      name || to,
    invite_link:  link,
    inviter_name: inviterName || 'The Cactus Team',
    firm_name:    'Cactus Partners',
    expiry:       '48 hours',
  });
}

async function sendPasswordReset({ to, token }) {
  const link = `${APP_URL}/set-password?token=${token}&type=reset`;
  const templateId = process.env.EMAILJS_RESET_TPL;
  if (!templateId) throw new Error('EMAILJS_RESET_TPL env var not set');
  await sendViaEmailJS(templateId, {
    to_email:   to,
    reset_link: link,
    firm_name:  'Cactus Partners',
    expiry:     '1 hour',
  });
}

module.exports = { sendGeneric, sendInvite, sendPasswordReset };
