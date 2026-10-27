// TC-O-05: PDF invoice generation on confirmation, downloadable and e-mailed (FR-17; SRS 5.3.3).
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { Book, Listing, Category, Address, Order, OrderItem, Coupon } = require('../../models');
const paymentService = require('../../services/paymentService');
const mailer = require('../../adapters/mailer');

const app = createApp();

let buyer;
let buyerAuth;
let otherBuyer;
let otherBuyerAuth;
let admin;
let adminAuth;
let seller;
let book;
let listing;
let address;

function extractTextFromPdf(buf) {
  const str = buf.toString('latin1');
  const tjMatches = str.matchAll(/\[(.*?)\]\s*TJ/g);
  let text = '';
  for (const m of tjMatches) {
    const hexes = m[1].matchAll(/<([0-9a-fA-F]+)>/g);
    let line = '';
    for (const h of hexes) {
      line += Buffer.from(h[1], 'hex').toString('utf8');
    }
    text += line + '\n';
  }
  return text;
}

async function setupData() {
  const category = await Category.create({ name: 'Academics', slug: 'academics' });

  book = await Book.create({
    isbn13: '9780131103627',
    title: 'The C Programming Language',
    author: 'Brian W. Kernighan, Dennis M. Ritchie',
    publisher: 'Prentice Hall',
    category_id: category._id,
    language: 'English',
    mrp: 60000,
  });

  listing = await Listing.create({
    book_id: book._id,
    seller_id: seller._id,
    condition: 'NEW',
    price: 45000, // Rs. 450.00
    stock_qty: 10,
    status: 'ACTIVE',
  });

  address = await Address.create({
    user_id: buyer._id,
    line1: '100 Feet Road, Indiranagar',
    line2: 'Suite 404',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    is_default: true,
  });
}

beforeAll(db.start);
beforeEach(async () => {
  mailer.clearOutbox();
  buyer = await makeUser('BUYER');
  buyerAuth = { Authorization: `Bearer ${(await login(app, buyer)).token}` };
  otherBuyer = await makeUser('BUYER');
  otherBuyerAuth = { Authorization: `Bearer ${(await login(app, otherBuyer)).token}` };
  admin = await makeUser('ADMIN');
  adminAuth = { Authorization: `Bearer ${(await login(app, admin)).token}` };
  seller = await makeUser('SELLER');
  await setupData();
});
afterEach(db.clear);
afterAll(db.stop);

describe('TC-O-05 PDF invoice (FR-17)', () => {
  it('generates a PDF invoice on confirmation, e-mails it to buyer, and makes it downloadable (FR-17)', async () => {
    // 1. Create placed order for 2 copies (2 * 45000 = 90000 paise = Rs. 900 -> Free shipping)
    const orderNo = `OB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-11101`;
    const order = await Order.create({
      order_no: orderNo,
      buyer_id: buyer._id,
      address_id: address._id,
      item_total: 90000,
      shipping_fee: 0,
      discount: 0,
      total_amount: 90000,
      order_status: 'PLACED',
      status_history: [{ status: 'PLACED', at: new Date() }],
    });

    await OrderItem.create({
      order_id: order._id,
      listing_id: listing._id,
      seller_id: seller._id,
      title: book.title,
      unit_price: 45000,
      quantity: 2,
      item_status: 'PLACED',
    });

    // 2. Before payment confirmation, downloading invoice must return 400 ORDER_NOT_CONFIRMED
    const preRes = await request(app)
      .get(`/api/v1/orders/${order._id}/invoice`)
      .set(buyerAuth);
    expect(preRes.status).toBe(400);
    expect(preRes.body.error.code).toBe('ORDER_NOT_CONFIRMED');

    // 3. Initiate payment intent and simulate webhook success
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set(buyerAuth)
      .send({ orderId: String(order._id) });
    expect(intentRes.status).toBe(201);

    const webhookPayload = {
      gatewayOrderId: intentRes.body.gatewayOrderId,
      txnRef: 'txn_invoice_test_101',
      status: 'SUCCESS',
      amount: order.total_amount,
      method: 'UPI',
    };
    const signature = paymentService.computeSignature(webhookPayload);

    const webhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-signature', signature)
      .send(webhookPayload);
    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.orderStatus).toBe('CONFIRMED');

    // 4. Verify that invoice was e-mailed to buyer with PDF attached (FR-17)
    expect(mailer.outbox.length).toBeGreaterThanOrEqual(1);
    const invoiceEmail = mailer.outbox.find((m) => m.subject.includes(orderNo));
    expect(invoiceEmail).toBeDefined();
    expect(invoiceEmail.to).toBe(buyer.email);
    expect(invoiceEmail.subject).toContain(`Tax invoice for order ${orderNo}`);
    expect(invoiceEmail.text).toContain('900.00');
    expect(invoiceEmail.attachments).toHaveLength(1);
    expect(invoiceEmail.attachments[0].filename).toBe(`Invoice-${orderNo}.pdf`);
    expect(invoiceEmail.attachments[0].contentType).toBe('application/pdf');
    expect(Buffer.isBuffer(invoiceEmail.attachments[0].content)).toBe(true);
    expect(invoiceEmail.attachments[0].content.slice(0, 4).toString()).toBe('%PDF');

    // 5. Verify invoice download endpoint (GET /api/v1/orders/:id/invoice)
    const downloadRes = await request(app)
      .get(`/api/v1/orders/${order._id}/invoice`)
      .set(buyerAuth)
      .buffer(true)
      .parse((res, callback) => {
        res.data = '';
        res.setEncoding('binary');
        res.on('data', (chunk) => {
          res.data += chunk;
        });
        res.on('end', () => {
          callback(null, Buffer.from(res.data, 'binary'));
        });
      });

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers['content-type']).toBe('application/pdf');
    expect(downloadRes.headers['content-disposition']).toBe(`attachment; filename="Invoice-${orderNo}.pdf"`);
    expect(Buffer.isBuffer(downloadRes.body)).toBe(true);
    expect(downloadRes.body.slice(0, 4).toString()).toBe('%PDF');
    expect(downloadRes.body.length).toBeGreaterThan(1000);
  });

  it('verifies figures match the order with coupon discount and standard shipping fee (FR-17)', async () => {
    // Order 1 copy (45000 paise = Rs. 450 < Rs. 500 threshold -> Shipping = 4000 paise = Rs. 40)
    const coupon = await Coupon.create({
      code: 'SAVE50',
      discount_type: 'FLAT',
      value: 5000, // Rs. 50 flat
      min_order: 30000,
      max_uses: 50,
      valid_from: new Date(Date.now() - 3600000),
      valid_to: new Date(Date.now() + 86400000),
    });

    const itemTotal = 45000;
    const shippingFee = 4000;
    const discount = 5000;
    const totalAmount = itemTotal + shippingFee - discount; // 44000 paise = Rs. 440.00

    const orderNo = `OB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-11102`;
    const order = await Order.create({
      order_no: orderNo,
      buyer_id: buyer._id,
      address_id: address._id,
      coupon_id: coupon._id,
      item_total: itemTotal,
      shipping_fee: shippingFee,
      discount,
      total_amount: totalAmount,
      order_status: 'CONFIRMED',
      status_history: [{ status: 'PLACED' }, { status: 'CONFIRMED' }],
    });

    await OrderItem.create({
      order_id: order._id,
      listing_id: listing._id,
      seller_id: seller._id,
      title: 'The C Programming Language',
      unit_price: 45000,
      quantity: 1,
      item_status: 'CONFIRMED',
    });

    const downloadRes = await request(app)
      .get(`/api/v1/orders/${order._id}/invoice`)
      .set(buyerAuth)
      .buffer(true)
      .parse((res, callback) => {
        res.data = '';
        res.setEncoding('binary');
        res.on('data', (chunk) => {
          res.data += chunk;
        });
        res.on('end', () => {
          callback(null, Buffer.from(res.data, 'binary'));
        });
      });

    expect(downloadRes.status).toBe(200);
    const pdfBuf = downloadRes.body;
    expect(pdfBuf.slice(0, 4).toString()).toBe('%PDF');

    // Verify figures match the order via uncompressed test or helper
    const invoiceService = require('../../services/invoiceService');
    const uncompressedPdf = await invoiceService.generateInvoicePdf(order._id, { compress: false });
    const text = extractTextFromPdf(uncompressedPdf);

    expect(text).toContain(orderNo);
    expect(text).toContain('The C Programming Language');
    expect(text).toContain('Rs. 450.00'); // unit price and item total
    expect(text).toContain('Rs. 40.00');  // shipping fee
    expect(text).toContain('Rs. 50.00');  // discount
    expect(text).toContain('Rs. 440.00'); // grand total matching order.total_amount
    expect(text).toContain('Tax Summary (GST Breakdown)');
  });

  it('enforces object-level ownership checks: prevents cross-buyer invoice download (SR-06)', async () => {
    const order = await Order.create({
      order_no: `OB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-11103`,
      buyer_id: buyer._id,
      address_id: address._id,
      item_total: 45000,
      shipping_fee: 4000,
      discount: 0,
      total_amount: 49000,
      order_status: 'CONFIRMED',
    });

    // Other buyer cannot download this invoice
    const crossBuyerRes = await request(app)
      .get(`/api/v1/orders/${order._id}/invoice`)
      .set(otherBuyerAuth);
    expect(crossBuyerRes.status).toBe(403);
    expect(crossBuyerRes.body.error.code).toBe('FORBIDDEN');

    // Unauthenticated request is rejected
    const unauthRes = await request(app)
      .get(`/api/v1/orders/${order._id}/invoice`);
    expect(unauthRes.status).toBe(401);
  });

  it('allows administrator to download any order invoice for auditing (FR-23 / NFR-08)', async () => {
    const order = await Order.create({
      order_no: `OB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-11104`,
      buyer_id: buyer._id,
      address_id: address._id,
      item_total: 45000,
      shipping_fee: 4000,
      discount: 0,
      total_amount: 49000,
      order_status: 'CONFIRMED',
    });

    await OrderItem.create({
      order_id: order._id,
      listing_id: listing._id,
      seller_id: seller._id,
      title: 'The C Programming Language',
      unit_price: 45000,
      quantity: 1,
      item_status: 'CONFIRMED',
    });

    const adminRes = await request(app)
      .get(`/api/v1/orders/${order._id}/invoice`)
      .set(adminAuth);
    expect(adminRes.status).toBe(200);
    expect(adminRes.headers['content-type']).toBe('application/pdf');
  });
});
