
/**
 * Notification module (SAD 3.4): records every message in NOTIFICATION
 * and delivers it through the mail adapter.
 * A failed send never fails the user's request; the retry worker
 * picks up FAILED rows with attempts < 3.
 */
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

  ORDER_CONFIRMED: ({ name, orderNo, itemTitle }) => ({
    subject: `Order ${orderNo} accepted`,
    text: `Hi ${name},

Good news! The seller has accepted your order item: "${itemTitle}".

Order number: ${orderNo}

Thank you for shopping with Online Bookstore.`,
  }),

  ORDER_PACKED: ({ name, orderNo, itemTitle }) => ({
    subject: `Order ${orderNo} packed`,
    text: `Hi ${name},

Your order item "${itemTitle}" has been packed and is ready for dispatch.

Order number: ${orderNo}

We will update you when it has been dispatched.`,
  }),

  ORDER_SHIPPED: ({ name, orderNo, itemTitle, courier, trackingNo }) => ({
    subject: `Order ${orderNo} dispatched`,
    text: `Hi ${name},

Your order item "${itemTitle}" has been dispatched.

Order number: ${orderNo}
Courier: ${courier}
Tracking number: ${trackingNo}

Thank you for shopping with Online Bookstore.`,
  }),
};

async function notify(user, type, data) {
  const template = templates[type];

  if (!template) {
    throw new Error(`Unknown notification template: ${type}`);
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
      'notification send failed; queued for retry'
    );

    row.status = 'FAILED';
  }

  row.attempts += 1;
  await row.save();

  return row;
}

module.exports = { notify, templates };
