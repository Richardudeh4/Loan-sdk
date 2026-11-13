import crypto from 'crypto';
import { config } from '../config';
import { sendOtpEmail } from './email';

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(code: string): string {
  return crypto.createHmac('sha256', config.OTP_SECRET).update(code).digest('hex');
}

/**
 * Send an OTP to the user.
 * - If `email` is provided → sends via Resend email
 * - Always logs to console in development so you can test without a real email
 * - SMS can be added later by uncommenting and wiring a provider below
 */
export async function sendOtpSms(
  phone: string,
  code: string,
  email?: string | null,
): Promise<void> {
  // Always log in development so you can copy the code during testing
  if (config.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${phone}: ${code}`);
  }

  // Send via email if the user has one
  if (email) {
    await sendOtpEmail(email, code);
  }

  // TODO: plug in an SMS provider (Termii, Twilio) here when ready
  // await sendSms(phone, `Your Fundly code is ${code}. Valid for 5 minutes.`);
}
