import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/** In tests every email is captured here instead of being sent. */
export const outbox = [];

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  transporter = env.smtp.host
    ? nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      })
    : // No SMTP configured: build the message but do not send it.
      nodemailer.createTransport({ jsonTransport: true });

  return transporter;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function sendEmail({ to, subject, text, html }) {
  if (env.isTest) {
    outbox.push({ to, subject, text, html });
    return;
  }

  await getTransporter().sendMail({ from: env.EMAIL_FROM, to, subject, text, html });

  if (!env.smtp.host) {
    logger.info(`\n----- DEV EMAIL (SMTP not configured) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-------------------------------------------`);
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
    text: `Hi ${user.name},\n\nConfirm your email address to finish setting up your account:\n${link}\n\nThis link expires in 24 hours.`,
    html: layout(
      'Verify your email',
      `<p>Hi ${escapeHtml(user.name)}, confirm your email address to finish setting up your account.</p>${button(link, 'Verify email')}<p style="font-size:13px">This link expires in 24 hours.</p>`,
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
