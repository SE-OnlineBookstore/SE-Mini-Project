// Notification module (SAD 3.4): records every message in NOTIFICATION
// and delivers it through the mail adapter. Failed sends are queued for retry.

const Notification = require('../models/Notification');
const mailer = require('../adapters/mailer');
const logger = require('../config/logger');

const templates = {
  OTP_EMAIL: ({ name, otp }) => ({
    subject: 'Your Online Bookstore verification code',
    text: `Hi ${name},

Your verification code is ${otp}. It is valid for 10 minutes.

If you did not create an account, ignore this e-mail.`,
  }),

  PASSWORD_RESET: ({ name, link }) => ({
    subject: 'Reset your Online Bookstore password',
    text: `Hi ${name},

Use this link within 30 minutes to set a new password:
${link}

The link works once. If you did not ask for this, ignore this e-mail.`,
  }),

  PASSWORD_CHANGED: ({ name }) => ({
    subject: 'Your Online Bookstore password was changed',
    text: `Hi ${name},

Your password was just changed and all other sessions were signed out.`,
  }),

  LOW_STOCK_ALERT: ({ name, bookTitle, stockQty }) => ({
    subject: 'Low stock alert - Online Bookstore',
    text: `Hi ${name},

Your listing for "${bookTitle}" has low stock remaining.

Current stock: ${stockQty} ${stockQty === 1 ? 'copy' : 'copies'}.

Please update your stock if needed.`,
  }),
};

async function notify(user, type, data) {
  const template = templates[type];

  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  const { subject, text } = template({
    name: user.name,
    ...data,
  });

  const row = await Notification.create({
    user_id: user._id,
    type,
    to: user.email,
    subject,
  });

  try {
    await mailer.send({
      to: user.email,
      subject,
      text,
    });

    row.status = 'SENT';
    row.sent_at = new Date();
  } catch (err) {
    logger.warn(
      { err: err.message, type },
      'notification send failed; queued for retry',
    );
    row.status = 'FAILED';
  }

  row.attempts += 1;
  await row.save();

  return row;
}

module.exports = { notify, templates };
