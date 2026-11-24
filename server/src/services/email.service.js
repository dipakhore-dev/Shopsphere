import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/** In tests every email is captured here instead of being sent. */
export const outbox = [];

/**
 *  'smtp'    real delivery through SMTP_HOST (Gmail, Brevo, ...)
 *  'console' DEVELOPMENT SIMULATION: nothing is delivered, the message is printed in the server terminal
 *  'test'    captured in `outbox`
 * (config/env.js refuses to start in production without SMTP, so 'console' can never run in production.)
 */
export const EMAIL_MODE = env.isTest ? 'test' : env.smtp.host ? 'smtp' : 'console';

/** Thrown when a message could not be handed to the mail server. Never contains credentials or links. */
export class EmailDeliveryError extends Error {
  constructor(message = 'Email could not be delivered') {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

let transporter;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

// Test-only switch that makes every send fail, to test the "SMTP is down" paths.
let failSends = false;
export function simulateEmailFailure(enabled) {
  if (env.isTest) failSends = Boolean(enabled);
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Resolves to { status: 'sent' | 'simulated' } or throws EmailDeliveryError.
 * 'sent' means the SMTP server ACCEPTED the message (not that it reached the inbox).
 * 'simulated' means nothing left this machine. Callers must not report it as delivered.
 */
export async function sendEmail({ to, subject, text, html }) {
  if (env.isTest) {
    if (failSends) throw new EmailDeliveryError('Simulated SMTP failure');
    outbox.push({ to, subject, text, html });
    return { status: 'sent' };
  }

  if (EMAIL_MODE === 'console') {
    // Development only. The link is printed here because there is no inbox to read it from.
    logger.warn(
      `\n==== EMAIL NOT SENT: development simulation (SMTP_HOST is not set) ====\nTo: ${to}\nSubject: ${subject}\n\n${text}\n====================================================================`,
    );
    return { status: 'simulated' };
  }

  try {
    const info = await getTransporter().sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
    if (!info.accepted?.length) throw new Error('recipient rejected');
    return { status: 'sent' };
  } catch (err) {
    // Log only the error CODE, never the message body, link, token or credentials.
    logger.error(`Email delivery failed via SMTP: ${err.code ?? 'ERROR'}${err.responseCode ? ` (SMTP ${err.responseCode})` : ''}`);
    throw new EmailDeliveryError();
  }
}

/** Called once at server start: tells the developer immediately if the SMTP settings are wrong. */
export async function verifyEmailTransport() {
  if (EMAIL_MODE !== 'smtp') {
    logger.warn('Email is in SIMULATION mode (SMTP_HOST not set): no real emails will be sent. Set SMTP_* in server/.env to send real mail.');
    return;
  }
  try {
    await getTransporter().verify();
    logger.info(`SMTP connection verified (${env.smtp.host}:${env.smtp.port})`);
  } catch (err) {
    logger.error(`SMTP check FAILED (${err.code ?? 'ERROR'}). Verification emails will not be delivered. Check SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER and SMTP_PASS (Gmail needs an App Password).`);
  }
}

function layout(heading, bodyHtml) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f1b2d">
  <h2 style="margin:0 0 16px">${heading}</h2>${bodyHtml}
  <p style="margin-top:32px;font-size:12px;color:#5b6b82">If you did not request this, you can safely ignore this email.</p></div>`;
}

const button = (href, label) =>
  `<p><a href="${href}" style="display:inline-block;background:#0e7c7b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>
   <p style="font-size:13px;color:#5b6b82">Or paste this link into your browser:<br>${href}</p>`;

export function sendVerificationEmail(user, token) {
  const link = `${env.clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: user.email,
    subject: 'Verify your ShopSphere email',
    text: `Hi ${user.name},\n\nConfirm your email address to finish setting up your account:\n${link}\n\nThis link expires in ${env.email.verificationTtlMinutes} minutes and works once.`,
    html: layout(
      'Verify your email',
      `<p>Hi ${escapeHtml(user.name)}, confirm your email address to finish setting up your account.</p>${button(link, 'Verify email')}<p style="font-size:13px">This link expires in ${env.email.verificationTtlMinutes} minutes and works once.</p>`,
    ),
  });
}

export function sendPasswordResetEmail(user, token) {
  const link = `${env.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset your ShopSphere password',
    text: `Hi ${user.name},\n\nUse this link to choose a new password:\n${link}\n\nThis link expires in 1 hour and works once.`,
    html: layout(
      'Reset your password',
      `<p>Hi ${escapeHtml(user.name)}, use the button below to choose a new password.</p>${button(link, 'Reset password')}<p style="font-size:13px">This link expires in 1 hour and works once.</p>`,
    ),
  });
}

const inr = (paise) => `Rs ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function sendOrderConfirmationEmail(user, order, shipments) {
  const lines = shipments.flatMap((s) => s.items.map((i) => `${i.quantity} x ${i.name} (${s.storeName}) - ${inr(i.lineTotal)}`));
  const a = order.shippingAddress;
  const address = [a.fullName, a.line1, a.line2, a.city, `${a.state} ${a.pincode}`].filter(Boolean).join(', ');
  const payment = order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online payment';

  return sendEmail({
    to: user.email,
    subject: `Order ${order.orderNumber} confirmed`,
    text: `Hi ${user.name},\n\nThanks for your order ${order.orderNumber}.\n\n${lines.join('\n')}\n\nShipping: ${inr(order.shippingTotal)}\nTotal: ${inr(order.total)} (${payment})\n\nDelivering to: ${address}\n\nTrack it any time: ${env.clientUrl}/orders/${order._id}`,
    html: layout(
      `Order ${escapeHtml(order.orderNumber)} confirmed`,
      `<p>Hi ${escapeHtml(user.name)}, thanks for your order.</p><ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
       <p><strong>Total: ${inr(order.total)}</strong> (${payment})</p><p>Delivering to: ${escapeHtml(address)}</p>${button(`${env.clientUrl}/orders/${order._id}`, 'View order')}`,
    ),
  });
}
