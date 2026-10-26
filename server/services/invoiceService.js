// PDF Invoice Generation and Delivery Service (FR-17, SRS 5.3.3, SAD 3.4, TC-O-05).
const PDFDocument = require('pdfkit');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const User = require('../models/User');
const notificationService = require('./notificationService');
const logger = require('../config/logger');
const { E } = require('../utils/AppError');

function formatCurrency(paise) {
  const num = Number(paise || 0) / 100;
  return `Rs. ${num.toFixed(2)}`;
}

/**
 * Builds the PDF invoice buffer for an order.
 * Follows statutory tax invoice layout requirements (FR-17):
 * - Order number and date
 * - Buyer identification & contact details
 * - Complete delivery address
 * - Itemised table with title, qty, unit price and line total
 * - Shipping fee and coupon discount
 * - Complete tax summary breakdown
 * - Net payable matching order total amount
 */
async function generateInvoicePdf(orderId, options = {}) {
  const order = await Order.findById(orderId)
    .populate('buyer_id', 'name email phone')
    .populate('address_id')
    .populate('coupon_id', 'code discount_type value');

  if (!order) {
    throw E.notFound('ORDER_NOT_FOUND', 'Order not found.');
  }

  const items = await OrderItem.find({ order_id: order._id })
    .populate({
      path: 'listing_id',
      populate: { path: 'book_id', select: 'title author isbn13' },
    });

  const buyer = order.buyer_id || {};
  const addr = order.address_id || {};
  const coupon = order.coupon_id;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      compress: options.compress !== undefined ? options.compress : true,
      info: {
        Title: `Invoice - ${order.order_no}`,
        Author: 'Online Bookstore',
        Subject: `Tax Invoice for Order ${order.order_no}`,
      },
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    const leftX = 40;
    const pageWidth = 515;

    // Header
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1d4ed8').text('ONLINE BOOKSTORE', leftX, 40);
    doc.fontSize(10).font('Helvetica').fillColor('#555555').text('Official Retail Tax Invoice', leftX, 65);

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#111827').text('TAX INVOICE', 350, 40, { align: 'right', width: 205 });
    doc.fontSize(9).font('Helvetica').fillColor('#4b5563').text(`Invoice / Order: ${order.order_no}`, 350, 62, { align: 'right', width: 205 });
    const orderDateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    doc.text(`Date: ${orderDateStr}`, 350, 75, { align: 'right', width: 205 });
    doc.text(`Order Status: ${order.order_status}`, 350, 88, { align: 'right', width: 205 });

    // Divider line
    doc.moveTo(leftX, 105).lineTo(leftX + pageWidth, 105).strokeColor('#cbd5e1').lineWidth(1).stroke();

    // Buyer & Delivery Details (Two Columns)
    const boxY = 115;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text('Buyer Details:', leftX, boxY);
    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text(`Name: ${buyer.name || 'Valued Customer'}`, leftX, boxY + 16);
    doc.text(`Email: ${buyer.email || 'N/A'}`, leftX, boxY + 28);
    doc.text(`Phone: ${buyer.phone || 'N/A'}`, leftX, boxY + 40);

    const rightColX = 310;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text('Delivery Address:', rightColX, boxY);
    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text(`${addr.line1 || 'Delivery Address'}`, rightColX, boxY + 16);
    if (addr.line2) {
      doc.text(`${addr.line2}`, rightColX, boxY + 28);
      doc.text(`${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`, rightColX, boxY + 40);
    } else {
      doc.text(`${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`, rightColX, boxY + 28);
    }

    // Line items table
    let tableY = boxY + 68;
    doc.rect(leftX, tableY, pageWidth, 22).fillColor('#f1f5f9').fill();
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
    doc.text('#', leftX + 8, tableY + 6);
    doc.text('Book Description / Title', leftX + 30, tableY + 6);
    doc.text('Qty', leftX + 310, tableY + 6, { width: 40, align: 'center' });
    doc.text('Unit Price', leftX + 360, tableY + 6, { width: 70, align: 'right' });
    doc.text('Line Total', leftX + 435, tableY + 6, { width: 72, align: 'right' });

    tableY += 22;
    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    let itemIndex = 1;
    for (const item of items) {
      const lineTotal = item.unit_price * item.quantity;
      const title = item.title || item.listing_id?.book_id?.title || 'Book Title';
      const author = item.listing_id?.book_id?.author ? `By ${item.listing_id.book_id.author}` : '';

      doc.text(`${itemIndex}`, leftX + 8, tableY + 6);
      doc.font('Helvetica-Bold').text(title, leftX + 30, tableY + 6, { width: 270 });
      if (author) {
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(author, leftX + 30, tableY + 18, { width: 270 });
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
      }

      doc.text(String(item.quantity), leftX + 310, tableY + 6, { width: 40, align: 'center' });
      doc.text(formatCurrency(item.unit_price), leftX + 360, tableY + 6, { width: 70, align: 'right' });
      doc.text(formatCurrency(lineTotal), leftX + 435, tableY + 6, { width: 72, align: 'right' });

      tableY += author ? 32 : 24;
      doc.moveTo(leftX, tableY).lineTo(leftX + pageWidth, tableY).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      itemIndex += 1;
    }

    // Totals section (Right aligned)
    tableY += 10;
    const totalsLabelX = 290;
    const totalsValueX = 425;
    const totalsValueW = 82;

    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text('Items Subtotal:', totalsLabelX, tableY, { align: 'right', width: 130 });
    doc.text(formatCurrency(order.item_total), totalsValueX, tableY, { align: 'right', width: totalsValueW });
    tableY += 15;

    doc.text('Shipping & Delivery:', totalsLabelX, tableY, { align: 'right', width: 130 });
    doc.text(
      order.shipping_fee === 0 ? 'FREE' : formatCurrency(order.shipping_fee),
      totalsValueX,
      tableY,
      { align: 'right', width: totalsValueW },
    );
    tableY += 15;

    if (order.discount > 0) {
      const couponLabel = coupon ? `Discount (${coupon.code}):` : 'Discount:';
      doc.fillColor('#15803d');
      doc.text(couponLabel, totalsLabelX, tableY, { align: 'right', width: 130 });
      doc.text(`-${formatCurrency(order.discount)}`, totalsValueX, tableY, { align: 'right', width: totalsValueW });
      doc.fillColor('#334155');
      tableY += 15;
    }

    // Tax Summary Breakdown (Required by FR-17)
    tableY += 8;
    doc.rect(leftX, tableY, pageWidth, 58).strokeColor('#cbd5e1').lineWidth(0.75).stroke();
    doc.rect(leftX, tableY, pageWidth, 18).fillColor('#f8fafc').fill();

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
    doc.text('Tax Summary (GST Breakdown)', leftX + 8, tableY + 5);
    doc.text('Taxable Value', leftX + 180, tableY + 5, { width: 80, align: 'right' });
    doc.text('CGST (0%)', leftX + 270, tableY + 5, { width: 70, align: 'right' });
    doc.text('SGST (0%)', leftX + 350, tableY + 5, { width: 70, align: 'right' });
    doc.text('Total Tax', leftX + 430, tableY + 5, { width: 77, align: 'right' });

    tableY += 22;
    doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
    doc.text('Printed Books (HSN 4901 - Exempt/0% GST)', leftX + 8, tableY);
    doc.text(formatCurrency(order.item_total), leftX + 180, tableY, { width: 80, align: 'right' });
    doc.text('Rs. 0.00', leftX + 270, tableY, { width: 70, align: 'right' });
    doc.text('Rs. 0.00', leftX + 350, tableY, { width: 70, align: 'right' });
    doc.text('Rs. 0.00', leftX + 430, tableY, { width: 77, align: 'right' });

    tableY += 14;
    doc.text('Shipping & Handling Charges', leftX + 8, tableY);
    doc.text(formatCurrency(order.shipping_fee), leftX + 180, tableY, { width: 80, align: 'right' });
    doc.text('Rs. 0.00', leftX + 270, tableY, { width: 70, align: 'right' });
    doc.text('Rs. 0.00', leftX + 350, tableY, { width: 70, align: 'right' });
    doc.text('Rs. 0.00', leftX + 430, tableY, { width: 77, align: 'right' });

    tableY += 32;

    // Grand Total Box
    doc.rect(leftX, tableY, pageWidth, 26).fillColor('#e0f2fe').fill();
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0369a1');
    doc.text('Grand Total (Net Payable):', leftX + 12, tableY + 7);
    doc.fontSize(12).text(formatCurrency(order.total_amount), totalsValueX, tableY + 6, {
      align: 'right',
      width: totalsValueW,
    });

    // Payment details line
    tableY += 38;
    doc.fontSize(9).font('Helvetica').fillColor('#64748b');
    doc.text(`Payment Confirmation: Verified via Online Sandbox Payment Intent.`, leftX, tableY);

    // Footer
    doc.fontSize(8).fillColor('#94a3b8').text(
      'This is a computer-generated tax invoice and requires no physical signature under Indian Information Technology Act, 2000.',
      leftX,
      760,
      { align: 'center', width: pageWidth },
    );
    doc.text('Thank you for choosing Online Bookstore!', leftX, 772, { align: 'center', width: pageWidth });

    doc.end();
  });
}

/**
 * Retrieves the invoice PDF buffer for an authenticated user's order.
 * Enforces ownership checks (SR-06) and order confirmation state.
 */
async function getOrderInvoicePdf(userId, orderId, options = {}) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw E.notFound('ORDER_NOT_FOUND', 'Order not found.');
  }

  // Security isolation: only the buyer or an admin can access this invoice (SR-06)
  const isOwner = String(order.buyer_id) === String(userId);
  if (!isOwner) {
    const user = await User.findById(userId);
    if (!user || user.role !== 'ADMIN') {
      throw E.forbidden('FORBIDDEN', 'You do not have permission to view or download this invoice.');
    }
  }

  if (order.order_status === 'PLACED') {
    throw E.badRequest('ORDER_NOT_CONFIRMED', 'Invoice is only generated after order payment is confirmed.');
  }

  const pdfBuffer = await generateInvoicePdf(order._id, options);
  return {
    pdfBuffer,
    orderNo: order.order_no,
  };
}

/**
 * Generates and e-mails the PDF invoice upon order confirmation (FR-17).
 */
async function sendInvoiceEmail(orderId) {
  const order = await Order.findById(orderId).populate('buyer_id');
  if (!order) {
    throw E.notFound('ORDER_NOT_FOUND', 'Order not found.');
  }

  const buyer = order.buyer_id;
  if (!buyer || !buyer.email) {
    logger.warn({ orderId }, 'Cannot send invoice: buyer email not found');
    return null;
  }

  const pdfBuffer = await generateInvoicePdf(order._id);

  const notification = await notificationService.notify(
    buyer,
    'ORDER_INVOICE',
    {
      orderNo: order.order_no,
      totalAmount: order.total_amount,
    },
    [
      {
        filename: `Invoice-${order.order_no}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  );

  return { notification, orderNo: order.order_no };
}

/**
 * Triggered on order payment confirmation.
 */
async function generateAndSendInvoice(orderId) {
  try {
    return await sendInvoiceEmail(orderId);
  } catch (err) {
    logger.error({ err: err.message, orderId }, 'Failed to generate/email invoice on confirmation');
    return null;
  }
}

module.exports = {
  formatCurrency,
  generateInvoicePdf,
  getOrderInvoicePdf,
  sendInvoiceEmail,
  generateAndSendInvoice,
};
