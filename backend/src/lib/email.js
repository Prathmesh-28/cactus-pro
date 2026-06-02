const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: (process.env.SMTP_PASS || '').replace(/\s/g, ''), // strip spaces from App Password
  },
  tls: { rejectUnauthorized: false },
  logger: true,
  debug: process.env.NODE_ENV !== 'production',
});

// Verify connection on startup
transporter.verify().then(() => {
  console.log('✓ SMTP connection verified');
}).catch(err => {
  console.error('✗ SMTP connection failed:', err.message);
});

const FROM = process.env.SMTP_FROM || `"Cactus Partners" <${process.env.SMTP_USER}>`;
const APP_URL = process.env.FRONTEND_URL || 'https://cactus-pro.vercel.app';

async function sendInvite({ to, name, token, inviterName }) {
  const link = `${APP_URL}/set-password?token=${token}&type=invite`;
  await transporter.sendMail({
    from: FROM, to,
    subject: `You've been invited to Cactus Pro`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#1C4B42;padding:32px 40px;border-radius:12px 12px 0 0">
          <h1 style="color:#86CA0F;margin:0;font-size:22px">🌵 Cactus Partners</h1>
          <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:13px">Portfolio Management Portal</p>
        </div>
        <div style="background:#fff;padding:32px 40px;border:1px solid #E3EDE9;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="color:#191c14;margin:0 0 12px">Hi ${name || to},</h2>
          <p style="color:#555951;line-height:1.6">
            <strong>${inviterName || 'A team member'}</strong> has invited you to access the
            <strong>Cactus Partners</strong> portfolio management portal.
          </p>
          <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1C4B42;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
            Accept Invite & Set Password
          </a>
          <p style="color:#999;font-size:12px">This link expires in 48 hours. If you didn't expect this, ignore it.</p>
        </div>
      </div>`,
  });
}

async function sendPasswordReset({ to, token }) {
  const link = `${APP_URL}/set-password?token=${token}&type=reset`;
  await transporter.sendMail({
    from: FROM, to,
    subject: `Reset your Cactus Pro password`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#1C4B42;padding:32px 40px;border-radius:12px 12px 0 0">
          <h1 style="color:#86CA0F;margin:0;font-size:22px">🌵 Cactus Partners</h1>
        </div>
        <div style="background:#fff;padding:32px 40px;border:1px solid #E3EDE9;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="color:#191c14;margin:0 0 12px">Password reset</h2>
          <p style="color:#555951">Click below to set a new password. This link expires in 1 hour.</p>
          <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1C4B42;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
            Reset Password
          </a>
          <p style="color:#999;font-size:12px">If you didn't request this, ignore it.</p>
        </div>
      </div>`,
  });
}

module.exports = { sendInvite, sendPasswordReset };
