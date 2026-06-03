/**
 * Email service using EmailJS REST API
 * No SMTP, no IPv6 issues — just HTTPS to api.emailjs.com
 * 
 * Required env vars in Render:
 *   EMAILJS_SERVICE_ID    → your EmailJS service ID
 *   EMAILJS_INVITE_TPL    → template ID for invite emails
 *   EMAILJS_RESET_TPL     → template ID for password reset emails
 *   EMAILJS_PUBLIC_KEY    → your EmailJS public key (User ID)
 *   EMAILJS_PRIVATE_KEY   → your EmailJS private key (for server-side)
 */

const APP_URL = process.env.FRONTEND_URL || 'https://cactus-pro.vercel.app';

async function sendViaEmailJS(templateId, params) {
  const serviceId  = process.env.EMAILJS_SERVICE_ID;
  const publicKey  = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !publicKey || !privateKey) {
    throw new Error(
      'EmailJS not configured. Add EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY to Render env vars.'
    );
  }

  const body = {
    service_id:   serviceId,
    template_id:  templateId,
    user_id:      publicKey,
    accessToken:  privateKey,
    template_params: params,
  };

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`EmailJS error ${res.status}: ${text}`);
  }

  console.log(`✓ Email sent via EmailJS (template: ${templateId}) to ${params.to_email}`);
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
    to_email:    to,
    reset_link:  link,
    firm_name:   'Cactus Partners',
    expiry:      '1 hour',
  });
}

async function sendGeneric({ to, subject, body, cc, from_name }) {
  const templateId = process.env.EMAILJS_GENERIC_TPL;
  if (!templateId) {
    // Fallback: log and return ok (user configured mailto on frontend)
    console.log(`[Email] Generic template not set. Would send to ${to}: ${subject}`);
    return;
  }
  await sendViaEmailJS(templateId, {
    to_email:   to,
    to_cc:      cc || '',
    subject:    subject,
    message:    body,
    from_name:  from_name || 'Cactus Partners',
    firm_name:  'Cactus Partners',
  });
}

module.exports = { sendInvite, sendPasswordReset, sendGeneric };
