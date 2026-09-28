import nodemailer from "nodemailer";
import { Resend } from "resend";

// Outgoing email (sign-up codes, password resets). Which service sends it:
//
//   SMTP   when SMTP_HOST + SMTP_USER + SMTP_PASSWORD are set - e.g. a Gmail
//          account with an app password (free, ~500/day): SMTP_HOST=smtp.gmail.com,
//          SMTP_PORT=465, SMTP_USER=<gmail address>, SMTP_PASSWORD=<app password>.
//   Resend when RESEND_API_KEY is set. Without a verified domain Resend can
//          only deliver to the Resend account owner's own address.
//   log    otherwise, or when EMAIL_DELIVERY=log (the e2e tests set this):
//          nothing is sent; the message is written to the SERVER log only.
//
// EMAIL_DELIVERY=smtp|resend|log forces one. EMAIL_FROM sets the sender
// (defaults to the SMTP user, or RESEND_FROM_EMAIL for Resend). Every
// failure throws EmailSendError - callers decide what the user sees.

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailDelivery = "smtp" | "resend" | "log";

export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

function smtpReady(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
}

export function emailDelivery(env: Record<string, string | undefined> = process.env): EmailDelivery {
  const forced = env.EMAIL_DELIVERY;
  if (forced === "smtp" || forced === "resend" || forced === "log") return forced;
  if (smtpReady(env)) return "smtp";
  if (env.RESEND_API_KEY) return "resend";
  return "log";
}

// Gmail shows app passwords in groups of four ("abcd efgh ijkl mnop"); the
// spaces aren't part of the password, however it was pasted.
export function smtpPassword(env: Record<string, string | undefined> = process.env): string | undefined {
  const pass = env.SMTP_PASSWORD;
  return pass && /(^|\.)gmail\.com$/i.test(env.SMTP_HOST ?? "") ? pass.replace(/\s+/g, "") : pass;
}

function fromAddress(delivery: EmailDelivery): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (delivery === "smtp") return `VocalisAi <${process.env.SMTP_USER}>`;
  return process.env.RESEND_FROM_EMAIL ?? "VocalisAi <onboarding@resend.dev>";
}

export async function sendEmail(message: OutgoingEmail): Promise<void> {
  const delivery = emailDelivery();

  if (delivery === "log") {
    // Never on the live site: a code in the logs would reach nobody.
    if (process.env.VERCEL_ENV === "production") throw new EmailSendError("No email service is configured for production.");
    console.log(`[email:log] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return;
  }

  if (delivery === "smtp") {
    if (!smtpReady()) throw new EmailSendError("SMTP is selected but SMTP_HOST/SMTP_USER/SMTP_PASSWORD are not all set.");
    const port = Number(process.env.SMTP_PORT) || 465;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: smtpPassword() },
    });
    try {
      await transport.sendMail({ from: fromAddress(delivery), ...message });
    } catch (err) {
      throw new EmailSendError(err instanceof Error ? err.message : "SMTP send failed");
    }
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new EmailSendError("Resend is selected but RESEND_API_KEY is not set.");
  // The Resend SDK reports failures (e.g. "you can only send testing emails
  // to your own address") in `error` rather than throwing.
  const { error } = await new Resend(apiKey).emails.send({ from: fromAddress(delivery), ...message });
  if (error) throw new EmailSendError(error.message);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your VocalisAi password",
    html: `
      <p>We received a request to reset your VocalisAi password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email - your password won't change.</p>
    `,
    text: `We received a request to reset your VocalisAi password.\n\nReset it here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  });
}

export async function sendSignupCodeEmail(to: string, name: string, code: string, minutesValid: number): Promise<void> {
  const safeName = name.replace(/[<>&"]/g, "");
  await sendEmail({
    to,
    subject: `${code} is your VocalisAi verification code`,
    html: `
      <p>Hi ${safeName},</p>
      <p>Your VocalisAi verification code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
      <p>Enter it on the sign-up page to finish creating your account. It expires in ${minutesValid} minutes.</p>
      <p>If you didn't try to sign up, you can ignore this email - no account will be created.</p>
    `,
    text: `Hi ${safeName},\n\nYour VocalisAi verification code is: ${code}\n\nEnter it on the sign-up page to finish creating your account. It expires in ${minutesValid} minutes.\n\nIf you didn't try to sign up, you can ignore this email - no account will be created.`,
  });
}
