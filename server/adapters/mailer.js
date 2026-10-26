// Mail adapter (SAD 3.4). With SMTP_URL set it sends through nodemailer over SMTP + STARTTLS;
// otherwise it is a stub that keeps an in-memory outbox, used by tests and local development.
const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../config/logger');

const outbox = [];
let transport = null;
if (config.smtpUrl) transport = nodemailer.createTransport(config.smtpUrl);

async function send({ to, subject, text, html, attachments }) {
  if (!transport) {
    outbox.push({ to, subject, text, html, attachments, at: new Date() });
    logger.debug({ to, subject, text: config.isProd ? undefined : text }, 'mail stub: message captured (not sent)');
    return { stub: true };
  }
  return transport.sendMail({ from: config.mailFrom, to, subject, text, html, attachments });
}

module.exports = { send, outbox, clearOutbox: () => outbox.splice(0, outbox.length) };
