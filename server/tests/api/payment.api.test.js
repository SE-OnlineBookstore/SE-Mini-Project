// TC-O-04: Online payment sandbox, attempts limit & signed webhook (FR-16; SRS 5.3.3; SR-08).
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { Book, Listing, Category, Address, Order, OrderItem } = require('../../models');
const paymentService = require('../../services/paymentService');

const app = createApp();

let buyer;
let buyerAuth;
let otherBuyer;
let otherBuyerAuth;
let seller;
let sellerAuth;
let listing1;
let listing2;
let address;

async function setupData() {
  const category = await Category.create({ name: 'Fiction', slug: 'fiction' });

  const book1 = await Book.create({
    isbn13: '9780140449136',
    title: 'War and Peace',
    author: 'Leo Tolstoy',
    publisher: 'Penguin Classics',
    category_id: category._id,
    language: 'English',
    mrp: 80000,
  });

  const book2 = await Book.create({
    isbn13: '9780140449266',
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    publisher: 'Penguin Classics',
    category_id: category._id,
    language: 'English',
    mrp: 50000,
  });

  listing1 = await Listing.create({
    book_id: book1._id,
    seller_id: seller._id,
    condition: 'GOOD',
    price: 30000,
    stock_qty: 5,
    status: 'ACTIVE',
  });

  listing2 = await Listing.create({
    book_id: book2._id,
    seller_id: seller._id,
    condition: 'NEW',
    price: 45000,
    stock_qty: 1, // Only 1 in stock, to test OUT_OF_STOCK transition
    status: 'ACTIVE',
  });

  address = await Address.create({
    user_id: buyer._id,
    line1: '42 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    is_default: true,
  });
}

async function createPlacedOrder(buyerId, items = [{ listing: listing1, quantity: 2, price: 30000 }]) {
  const itemTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const shippingFee = itemTotal >= 50000 ? 0 : 5000;
  const totalAmount = itemTotal + shippingFee;

  const order = await Order.create({
    order_no: `OB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10000 + Math.random() * 90000)}`,
    buyer_id: buyerId,
    address_id: address._id,
    item_total: itemTotal,
    shipping_fee: shippingFee,
    discount: 0,
    total_amount: totalAmount,
    order_status: 'PLACED',
    status_history: [{ status: 'PLACED', at: new Date() }],
  });

  for (const it of items) {
    await OrderItem.create({
      order_id: order._id,
      listing_id: it.listing._id,
      seller_id: it.listing.seller_id,
      title: it.listing.condition,
      unit_price: it.price,
      quantity: it.quantity,
      item_status: 'PLACED',
    });
  }

  return order;
}

beforeAll(db.start);
beforeEach(async () => {
  buyer = await makeUser('BUYER');
  buyerAuth = { Authorization: `Bearer ${(await login(app, buyer)).token}` };
  otherBuyer = await makeUser('BUYER');
  otherBuyerAuth = { Authorization: `Bearer ${(await login(app, otherBuyer)).token}` };
  seller = await makeUser('SELLER');
  sellerAuth = { Authorization: `Bearer ${(await login(app, seller)).token}` };
  await setupData();
});
afterEach(db.clear);
afterAll(db.stop);

describe('TC-O-04 Online payment sandbox & HMAC webhook (FR-16)', () => {
  it('creates payment intent, limits to 3 attempts, verifies signature, confirms order and decrements stock atomically on success', async () => {
    const order = await createPlacedOrder(buyer._id);
    const orderId = String(order._id);

    // 1. Attempt 1: Payment Intent creation
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set(buyerAuth)
      .send({ orderId });

    expect(intentRes.status).toBe(201);
    expect(intentRes.body.attemptNo).toBe(1);
    expect(intentRes.body.amount).toBe(order.total_amount);
    expect(intentRes.body.gatewayOrderId).toMatch(/^gw_ord_/);

    const gatewayOrderId = intentRes.body.gatewayOrderId;

    // 2. Webhook with forged signature is rejected (401)
    const fakeWebhook = {
      gatewayOrderId,
      txnRef: 'txn_mock_123',
      status: 'SUCCESS',
      amount: order.total_amount,
      method: 'UPI',
    };

    const forgedRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-signature', 'forged_bad_signature_hex')
      .send(fakeWebhook);

    expect(forgedRes.status).toBe(401);
    expect(forgedRes.body.error.code).toBe('INVALID_SIGNATURE');

    // 3. Webhook with valid HMAC signature succeeds, marks order CONFIRMED
    const validSig = paymentService.computeSignature(fakeWebhook);
    const validRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-signature', validSig)
      .send(fakeWebhook);

    expect(validRes.status).toBe(200);
    expect(validRes.body.orderStatus).toBe('CONFIRMED');

    // 4. Duplicate webhook with same txnRef is idempotent
    const dupRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-signature', validSig)
      .send(fakeWebhook);

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.idempotent).toBe(true);

    // Order state in DB
    const confirmedOrder = await Order.findById(orderId);
    expect(confirmedOrder.order_status).toBe('CONFIRMED');

    // Stock decremented atomically (5 - 2 = 3)
    const updatedListing = await Listing.findById(listing1._id);
    expect(updatedListing.stock_qty).toBe(3);
  });

  it('keeps order in PLACED status and does not decrement stock on payment failure', async () => {
    const order = await createPlacedOrder(buyer._id);
    const orderId = String(order._id);

    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set(buyerAuth)
      .send({ orderId });

    expect(intentRes.status).toBe(201);

    const failPayload = {
      gatewayOrderId: intentRes.body.gatewayOrderId,
      txnRef: 'txn_fail_456',
      status: 'FAILED',
      amount: order.total_amount,
      method: 'CARD',
    };

    const failSig = paymentService.computeSignature(failPayload);
    const failRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-signature', failSig)
      .send(failPayload);

    expect(failRes.status).toBe(200);
    expect(failRes.body.paymentStatus).toBe('FAILED');
    expect(failRes.body.orderStatus).toBe('PLACED');

    // Verify order remains PLACED
    const orderAfterFail = await Order.findById(orderId);
    expect(orderAfterFail.order_status).toBe('PLACED');

    // Verify stock is untouched
    const listingAfterFail = await Listing.findById(listing1._id);
    expect(listingAfterFail.stock_qty).toBe(5);
  });

  it('enforces maximum 3 attempts per order and rejects the 4th attempt with 400 MAX_ATTEMPTS_EXCEEDED (FR-16)', async () => {
    const order = await createPlacedOrder(buyer._id);
    const orderId = String(order._id);

    // Attempt 1
    const res1 = await request(app).post('/api/v1/payments/intent').set(buyerAuth).send({ orderId });
    expect(res1.status).toBe(201);
    expect(res1.body.attemptNo).toBe(1);

    // Attempt 2
    const res2 = await request(app).post('/api/v1/payments/intent').set(buyerAuth).send({ orderId });
    expect(res2.status).toBe(201);
    expect(res2.body.attemptNo).toBe(2);

    // Attempt 3
    const res3 = await request(app).post('/api/v1/payments/intent').set(buyerAuth).send({ orderId });
    expect(res3.status).toBe(201);
    expect(res3.body.attemptNo).toBe(3);

    // Attempt 4 -> Rejected!
    const res4 = await request(app).post('/api/v1/payments/intent').set(buyerAuth).send({ orderId });
    expect(res4.status).toBe(400);
    expect(res4.body.error.code).toBe('MAX_ATTEMPTS_EXCEEDED');
  });

  it('marks listing OUT_OF_STOCK when inventory drops to 0 on successful payment', async () => {
    // Order listing2 which only has stock_qty: 1
    const order = await createPlacedOrder(buyer._id, [{ listing: listing2, quantity: 1, price: 45000 }]);
    const orderId = String(order._id);

    const intentRes = await request(app).post('/api/v1/payments/intent').set(buyerAuth).send({ orderId });
    expect(intentRes.status).toBe(201);

    const webhookPayload = {
      gatewayOrderId: intentRes.body.gatewayOrderId,
      txnRef: 'txn_zero_stock_test',
      status: 'SUCCESS',
      amount: order.total_amount,
      method: 'NETBANKING',
    };

    const sig = paymentService.computeSignature(webhookPayload);
    const webhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-signature', sig)
      .send(webhookPayload);

    expect(webhookRes.status).toBe(200);

    const updatedListing = await Listing.findById(listing2._id);
    expect(updatedListing.stock_qty).toBe(0);
    expect(updatedListing.status).toBe('OUT_OF_STOCK');
  });

  it('rejects payment intent for an order that is already CONFIRMED', async () => {
    const order = await createPlacedOrder(buyer._id);
    order.order_status = 'CONFIRMED';
    await order.save();

    const res = await request(app)
      .post('/api/v1/payments/intent')
      .set(buyerAuth)
      .send({ orderId: String(order._id) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ORDER_NOT_PAYABLE');
  });

  it('simulates sandbox payment successfully via /api/v1/payments/simulate', async () => {
    const order = await createPlacedOrder(buyer._id);
    const orderId = String(order._id);

    // Call sandbox simulation with orderId
    const simRes = await request(app)
      .post('/api/v1/payments/simulate')
      .set(buyerAuth)
      .send({ orderId, status: 'SUCCESS', method: 'UPI' });

    expect(simRes.status).toBe(200);
    expect(simRes.body.orderStatus).toBe('CONFIRMED');
    expect(simRes.body.txnRef).toMatch(/^sbx_txn_/);

    const confirmedOrder = await Order.findById(orderId);
    expect(confirmedOrder.order_status).toBe('CONFIRMED');
  });

  it('returns payment status and attempts history via /api/v1/payments/order/:orderId', async () => {
    const order = await createPlacedOrder(buyer._id);
    const orderId = String(order._id);

    // Check status before payment attempt
    const statusRes1 = await request(app)
      .get(`/api/v1/payments/order/${orderId}`)
      .set(buyerAuth);

    expect(statusRes1.status).toBe(200);
    expect(statusRes1.body.attemptsCount).toBe(0);
    expect(statusRes1.body.remainingAttempts).toBe(3);
    expect(statusRes1.body.canPay).toBe(true);

    // Make an intent
    await request(app).post('/api/v1/payments/intent').set(buyerAuth).send({ orderId });

    // Check status after 1 attempt
    const statusRes2 = await request(app)
      .get(`/api/v1/payments/order/${orderId}`)
      .set(buyerAuth);

    expect(statusRes2.status).toBe(200);
    expect(statusRes2.body.attemptsCount).toBe(1);
    expect(statusRes2.body.remainingAttempts).toBe(2);
  });

  it('forbids other buyers or sellers from creating intent or simulating payment', async () => {
    const order = await createPlacedOrder(buyer._id);
    const orderId = String(order._id);

    // Seller forbidden (403)
    const sellerRes = await request(app)
      .post('/api/v1/payments/intent')
      .set(sellerAuth)
      .send({ orderId });
    expect(sellerRes.status).toBe(403);

    // Different buyer cannot access (404 ORDER_NOT_FOUND)
    const otherBuyerRes = await request(app)
      .post('/api/v1/payments/intent')
      .set(otherBuyerAuth)
      .send({ orderId });
    expect(otherBuyerRes.status).toBe(404);
  });
});
