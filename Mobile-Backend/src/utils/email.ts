import { Resend } from 'resend';
import { config } from '../config';

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

// ── HTML template ─────────────────────────────────────────────────────────────
function otpEmailHtml(code: string, expiryMinutes = 5): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Fundly OTP</title>
</head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#208AEF;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                💙 Fundly
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 8px;color:#1A1A2E;font-size:20px;font-weight:600;">
                Verify your identity
              </h2>
              <p style="margin:0 0 32px;color:#64748B;font-size:15px;line-height:1.6;">
                Use the code below to complete your verification. It expires in
                <strong>${expiryMinutes} minutes</strong>.
              </p>

              <!-- OTP box -->
              <div style="background:#E8F3FD;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
                <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#208AEF;font-family:monospace;">
                  ${code}
                </span>
              </div>

              <p style="margin:0;color:#94A3B8;font-size:13px;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email.
                Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F7F9FC;padding:24px 32px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="margin:0;color:#94A3B8;font-size:12px;">
                © ${new Date().getFullYear()} Fundly. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ── Send OTP email via Resend ─────────────────────────────────────────────────
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!resend) {
    // No API key configured — log to console in dev, skip silently in prod
    if (config.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP email to ${to}: ${code}`);
    }
    return;
  }

  const { error } = await resend.emails.send({
    from: `Fundly <${config.RESEND_FROM_EMAIL}>`,
    to,
    subject: `${code} is your Fundly verification code`,
    html: otpEmailHtml(code),
  });

  if (error) {
    // Log but don't throw — a failed email shouldn't break the signup flow
    console.error('[Resend] Failed to send OTP email:', error);
  }
}

// ── Loan notification emails ──────────────────────────────────────────────────
export async function sendLoanApprovedEmail(to: string, amountNaira: number): Promise<void> {
  if (!resend) return;

  const formatted = '₦' + (amountNaira / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });

  await resend.emails.send({
    from: `Fundly <${config.RESEND_FROM_EMAIL}>`,
    to,
    subject: 'Your Fundly loan has been approved',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;">
        <h2 style="color:#208AEF;">💙 Loan Approved</h2>
        <p>Great news! Your loan of <strong>${formatted}</strong> has been approved and disbursed to your account.</p>
        <p>Log in to the Fundly app to view your repayment schedule.</p>
        <p style="color:#94A3B8;font-size:12px;margin-top:40px;">© ${new Date().getFullYear()} Fundly</p>
      </div>
    `,
  }).catch((err) => console.error('[Resend] loan approved email failed:', err));
}

export async function sendPaymentReceivedEmail(
  to: string,
  amountNaira: number,
  remainingNaira: number,
): Promise<void> {
  if (!resend) return;

  const fmt = (n: number) => '₦' + (n / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });

  await resend.emails.send({
    from: `Fundly <${config.RESEND_FROM_EMAIL}>`,
    to,
    subject: 'Payment received — Fundly',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;">
        <h2 style="color:#16C79A;">✓ Payment Received</h2>
        <p>We've received your payment of <strong>${fmt(amountNaira)}</strong>.</p>
        <p>Your outstanding balance is now <strong>${fmt(remainingNaira)}</strong>.</p>
        <p>Log in to the Fundly app to view your updated repayment schedule.</p>
        <p style="color:#94A3B8;font-size:12px;margin-top:40px;">© ${new Date().getFullYear()} Fundly</p>
      </div>
    `,
  }).catch((err) => console.error('[Resend] payment received email failed:', err));
}
