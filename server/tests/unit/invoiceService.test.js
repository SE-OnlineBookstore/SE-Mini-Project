// Unit tests for Invoice Service (FR-17, TC-O-05).
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const invoiceService = require('../../services/invoiceService');
const Order = require('../../models/Order');
const OrderItem = require('../../models/OrderItem');
const User = require('../../models/User');
const Address = require('../../models/Address');
const Book = require('../../models/Book');
const Category = require('../../models/Category');
const Listing = require('../../models/Listing');
const Coupon = require('../../models/Coupon');
const mailer = require('../../adapters/mailer');

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

describe('TC-O-05 Invoice Service Unit Tests (FR-17)', () => {
  let mongoServer;
  let buyer;
  let seller;
  let otherBuyer;
  let admin;
  let address;
  let book;
  let category;
  let listing;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    mailer.clearOutbox();

    category = await Category.create({
      name: 'Technology',
      slug: 'technology',
    });

    buyer = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      password_hash: '$2b$12$abcdefghijklmnopqrstuv',
      phone: '9876543210',
      role: 'BUYER',
      is_verified: true,
    });

    otherBuyer = await User.create({
      name: 'Other Buyer',
      email: 'other.buyer@example.com',
      password_hash: '$2b$12$abcdefghijklmnopqrstuv',
      phone: '9876543211',
      role: 'BUYER',
      is_verified: true,
    });

    seller = await User.create({
      name: 'Pramod Bookseller',
      email: 'pramod.seller@example.com',
      password_hash: '$2b$12$abcdefghijklmnopqrstuv',
      phone: '9876543212',
      role: 'SELLER',
      is_verified: true,
    });

    admin = await User.create({
      name: 'Site Admin',
      email: 'admin@example.com',
      password_hash: '$2b$12$abcdefghijklmnopqrstuv',
      phone: '9876543213',
      role: 'ADMIN',
      is_verified: true,
    });

    address = await Address.create({
      user_id: buyer._id,
      line1: '42 MG Road, Trinity Circle',
      line2: 'Flat 302, Palm Residency',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      is_default: true,
    });

    book = await Book.create({
      title: 'Operating System Concepts',
      author: 'Silberschatz, Galvin, Gagne',
      isbn13: '9781118063330',
      publisher: 'Wiley',
      category_id: category._id,
      publication_year: 2018,
      language: 'English',
      mrp: 95000,
    });

    listing = await Listing.create({
      book_id: book._id,
      seller_id: seller._id,
      condition: 'NEW',
      price: 65000, // Rs. 650.00
      mrp: 95000,
      stock_qty: 10,
      status: 'ACTIVE',
    });
  });

  it('formats currency from paise into standard Rs. representation', () => {
    expect(invoiceService.formatCurrency(0)).toBe('Rs. 0.00');
    expect(invoiceService.formatCurrency(65000)).toBe('Rs. 650.00');
    expect(invoiceService.formatCurrency(4000)).toBe('Rs. 40.00');
    expect(invoiceService.formatCurrency(12345)).toBe('Rs. 123.45');
  });

  it('throws ORDER_NOT_FOUND when order does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(invoiceService.generateInvoicePdf(fakeId)).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
      status: 404,
    });
  });

  it('generates a valid PDF invoice buffer containing required order and tax breakdown (FR-17)', async () => {
    const order = await Order.create({
      order_no: 'OB-20261026-00101',
      buyer_id: buyer._id,
      address_id: address._id,
      item_total: 130000, // 2 * 65000 = Rs. 1300.00
      shipping_fee: 0, // Free shipping
      discount: 10000, // Rs. 100.00
      total_amount: 120000, // Rs. 1200.00
      order_status: 'CONFIRMED',
      status_history: [{ status: 'PLACED' }, { status: 'CONFIRMED' }],
    });

    await OrderItem.create({
      order_id: order._id,
      listing_id: listing._id,
      seller_id: seller._id,
      title: 'Operating System Concepts',
      quantity: 2,
      unit_price: 65000,
      item_status: 'CONFIRMED',
    });

    const pdfBuffer = await invoiceService.generateInvoicePdf(order._id, { compress: false });
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify extracted text holds all required invoice and tax data (FR-17)
    const text = extractTextFromPdf(pdfBuffer);
    expect(text).toContain('OB-20261026-00101');
    expect(text).toContain('Operating System Concepts');
    expect(text).toContain('TAX INVOICE');
    expect(text).toContain('560001');
    expect(text).toContain('Rohan Sharma');
    expect(text).toContain('Rs. 1200.00');
    expect(text).toContain('Tax Summary (GST Breakdown)');
  });

  it('refuses invoice download for orders that are not yet confirmed (order_status PLACED)', async () => {
    const placedOrder = await Order.create({
      order_no: 'OB-20261026-00102',
      buyer_id: buyer._id,
      address_id: address._id,
      item_total: 65000,
      shipping_fee: 4000,
      discount: 0,
      total_amount: 69000,
      order_status: 'PLACED',
    });

    await expect(invoiceService.getOrderInvoicePdf(buyer._id, placedOrder._id)).rejects.toMatchObject({
      code: 'ORDER_NOT_CONFIRMED',
      status: 400,
    });
  });

  it('enforces ownership check: another buyer cannot access this invoice (SR-06)', async () => {
    const confirmedOrder = await Order.create({
      order_no: 'OB-20261026-00103',
      buyer_id: buyer._id,
      address_id: address._id,
      item_total: 65000,
      shipping_fee: 4000,
      discount: 0,
      total_amount: 69000,
      order_status: 'CONFIRMED',
    });

    await expect(invoiceService.getOrderInvoicePdf(otherBuyer._id, confirmedOrder._id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('allows administrator to download any buyer order invoice', async () => {
    const confirmedOrder = await Order.create({
      order_no: 'OB-20261026-00104',
      buyer_id: buyer._id,
      address_id: address._id,
      item_total: 65000,
      shipping_fee: 4000,
      discount: 0,
      total_amount: 69000,
      order_status: 'CONFIRMED',
    });

    await OrderItem.create({
      order_id: confirmedOrder._id,
      listing_id: listing._id,
      seller_id: seller._id,
      title: 'Operating System Concepts',
      quantity: 1,
      unit_price: 65000,
      item_status: 'CONFIRMED',
    });

    const result = await invoiceService.getOrderInvoicePdf(admin._id, confirmedOrder._id);
    expect(result.orderNo).toBe('OB-20261026-00104');
    expect(Buffer.isBuffer(result.pdfBuffer)).toBe(true);
    expect(result.pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('generates and emails invoice to buyer with PDF attachment (FR-17)', async () => {
    const coupon = await Coupon.create({
      code: 'WELCOME10',
      discount_type: 'PERCENT',
      value: 10,
      min_order: 50000,
      max_uses: 100,
      valid_from: new Date(Date.now() - 3600000),
      valid_to: new Date(Date.now() + 86400000),
    });

    const confirmedOrder = await Order.create({
      order_no: 'OB-20261026-00105',
      buyer_id: buyer._id,
      address_id: address._id,
      coupon_id: coupon._id,
      item_total: 65000,
      shipping_fee: 0,
      discount: 6500,
      total_amount: 58500,
      order_status: 'CONFIRMED',
    });

    await OrderItem.create({
      order_id: confirmedOrder._id,
      listing_id: listing._id,
      seller_id: seller._id,
      title: 'Operating System Concepts',
      quantity: 1,
      unit_price: 65000,
      item_status: 'CONFIRMED',
    });

    const sendResult = await invoiceService.sendInvoiceEmail(confirmedOrder._id);
    expect(sendResult).not.toBeNull();
    expect(sendResult.orderNo).toBe('OB-20261026-00105');

    // Check mailer outbox
    expect(mailer.outbox.length).toBe(1);
    const sentEmail = mailer.outbox[0];
    expect(sentEmail.to).toBe('rohan.sharma@example.com');
    expect(sentEmail.subject).toContain('OB-20261026-00105');
    expect(sentEmail.text).toContain('585.00');
    expect(sentEmail.attachments).toHaveLength(1);
    expect(sentEmail.attachments[0].filename).toBe('Invoice-OB-20261026-00105.pdf');
    expect(Buffer.isBuffer(sentEmail.attachments[0].content)).toBe(true);
    expect(sentEmail.attachments[0].content.slice(0, 4).toString()).toBe('%PDF');
  });
});
