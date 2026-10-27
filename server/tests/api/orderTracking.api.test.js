// TC-O-06 Order lifecycle tracking, cancel and return API tests (FR-18; SRS 5.3.3; BR-06).
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { Book, Listing, Category, Order, OrderItem, Shipment, Address } = require('../../models');

const app = createApp();

let buyer;
let buyerAuth;
let otherBuyer;
let otherBuyerAuth;
let seller;
let category;
let book;
let listing;
let address;

async function setupTestData() {
  category = await Category.create({ name: 'Technology', slug: 'technology' });

  book = await Book.create({
    isbn13: '9780132350884',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    publisher: 'Prentice Hall',
    category_id: category._id,
    language: 'English',
    mrp: 60000,
  });

  listing = await Listing.create({
    book_id: book._id,
    seller_id: seller._id,
    condition: 'NEW',
    price: 45000,
    mrp: 60000,
    stock_qty: 10,
    status: 'ACTIVE',
  });

  address = await Address.create({
    user_id: buyer._id,
    line1: '123 Innovation Way',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    is_default: true,
  });
}

async function createTestOrder(status = 'CONFIRMED', history = []) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = String(Math.floor(10000 + Math.random() * 90000));
  const orderNo = `OB-${date}-${suffix}`;

  const defaultHistory = history.length > 0 ? history : [
    { status: 'PLACED', at: new Date(Date.now() - 3600000) },
    { status, at: new Date() },
  ];

  const order = await Order.create({
    order_no: orderNo,
    buyer_id: buyer._id,
    address_id: address._id,
    item_total: 45000,
    shipping_fee: 4000,
    discount: 0,
    total_amount: 49000,
    order_status: status,
    status_history: defaultHistory,
  });

  const orderItem = await OrderItem.create({
    order_id: order._id,
    listing_id: listing._id,
    seller_id: seller._id,
    title: 'Clean Code',
    quantity: 2,
    unit_price: 45000,
    item_status: status,
  });

  return { order, orderItem };
}

beforeAll(async () => {
  await db.start();
  seller = await makeUser('SELLER');
  buyer = await makeUser('BUYER');
  buyerAuth = await login(app, buyer);
  otherBuyer = await makeUser('BUYER');
  otherBuyerAuth = await login(app, otherBuyer);
  await setupTestData();
});

afterAll(async () => {
  await db.stop();
});

describe('TC-O-06 API: Order Tracking, Cancellation and Returns (FR-18)', () => {
  describe('GET /api/v1/orders/:id/tracking', () => {
    test('returns lifecycle status history and shipment tracking info', async () => {
      const { order, orderItem } = await createTestOrder('SHIPPED');

      await Shipment.create({
        order_id: order._id,
        order_item_id: orderItem._id,
        courier: 'DTDC Courier',
        tracking_no: 'DTDC123456789',
        dispatch_date: new Date(),
      });

      const res = await request(app)
        .get(`/api/v1/orders/${order._id}/tracking`)
        .set('Authorization', `Bearer ${buyerAuth.token}`)
        .expect(200);

      expect(res.body.orderNo).toBe(order.order_no);
      expect(res.body.orderStatus).toBe('SHIPPED');
      expect(res.body.isCancellable).toBe(false);
      expect(res.body.shipments).toHaveLength(1);
      expect(res.body.shipments[0].courier).toBe('DTDC Courier');
      expect(res.body.shipments[0].trackingNo).toBe('DTDC123456789');
    });

    test('enforces SR-06 object-level ownership: other buyer receives 404', async () => {
      const { order } = await createTestOrder('CONFIRMED');

      const res = await request(app)
        .get(`/api/v1/orders/${order._id}/tracking`)
        .set('Authorization', `Bearer ${otherBuyerAuth.token}`)
        .expect(404);

      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    test('requires authentication: returns 401 without bearer token', async () => {
      const { order } = await createTestOrder('CONFIRMED');

      await request(app)
        .get(`/api/v1/orders/${order._id}/tracking`)
        .expect(401);
    });
  });

  describe('POST /api/v1/orders/:id/cancel', () => {
    test('buyer cancels order before dispatch; stock is restored to listing', async () => {
      listing.stock_qty = 5;
      await listing.save();

      const { order } = await createTestOrder('CONFIRMED');

      const res = await request(app)
        .post(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${buyerAuth.token}`)
        .send({ reason: 'Ordered by mistake' })
        .expect(200);

      expect(res.body.orderStatus).toBe('CANCELLED');

      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.order_status).toBe('CANCELLED');
      const lastHistory = updatedOrder.status_history[updatedOrder.status_history.length - 1];
      expect(lastHistory.status).toBe('CANCELLED');

      // Check stock restored (5 + 2 = 7)
      const updatedListing = await Listing.findById(listing._id);
      expect(updatedListing.stock_qty).toBe(7);
    });

    test('refuses cancellation once order is dispatched (SHIPPED)', async () => {
      const { order } = await createTestOrder('SHIPPED');

      const res = await request(app)
        .post(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${buyerAuth.token}`)
        .send({ reason: 'Too late' })
        .expect(400);

      expect(res.body.error.code).toBe('CANNOT_CANCEL_DISPATCHED_ORDER');
    });

    test('refuses cancellation on already cancelled order', async () => {
      const { order } = await createTestOrder('CANCELLED');

      const res = await request(app)
        .post(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${buyerAuth.token}`)
        .send({})
        .expect(400);

      expect(res.body.error.code).toBe('ORDER_ALREADY_CANCELLED');
    });

    test('cross-buyer cannot cancel another buyer order (SR-06)', async () => {
      const { order } = await createTestOrder('CONFIRMED');

      await request(app)
        .post(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${otherBuyerAuth.token}`)
        .send({})
        .expect(404);
    });
  });

  describe('POST /api/v1/orders/:id/return', () => {
    test('buyer requests return within seven days of delivery', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const { order } = await createTestOrder('DELIVERED', [
        { status: 'PLACED', at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { status: 'CONFIRMED', at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) },
        { status: 'SHIPPED', at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { status: 'DELIVERED', at: threeDaysAgo },
      ]);

      const res = await request(app)
        .post(`/api/v1/orders/${order._id}/return`)
        .set('Authorization', `Bearer ${buyerAuth.token}`)
        .send({ reason: 'Damaged pages' })
        .expect(200);

      expect(res.body.orderStatus).toBe('RETURNED');

      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.order_status).toBe('RETURNED');
      const lastHistory = updatedOrder.status_history[updatedOrder.status_history.length - 1];
      expect(lastHistory.status).toBe('RETURNED');
    });

    test('refuses return when order has not yet been delivered', async () => {
      const { order } = await createTestOrder('SHIPPED');

      const res = await request(app)
        .post(`/api/v1/orders/${order._id}/return`)
        .set('Authorization', `Bearer ${buyerAuth.token}`)
        .send({ reason: 'Not delivered yet' })
        .expect(400);

      expect(res.body.error.code).toBe('ORDER_NOT_DELIVERED');
    });

    test('refuses return when 7-day delivery window has expired', async () => {
      const nineDaysAgo = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);
      const { order } = await createTestOrder('DELIVERED', [
        { status: 'DELIVERED', at: nineDaysAgo },
      ]);

      const res = await request(app)
        .post(`/api/v1/orders/${order._id}/return`)
        .set('Authorization', `Bearer ${buyerAuth.token}`)
        .send({ reason: 'Too late' })
        .expect(400);

      expect(res.body.error.code).toBe('RETURN_WINDOW_EXPIRED');
    });

    test('cross-buyer cannot request return on another buyer order (SR-06)', async () => {
      const { order } = await createTestOrder('DELIVERED', [
        { status: 'DELIVERED', at: new Date() },
      ]);

      await request(app)
        .post(`/api/v1/orders/${order._id}/return`)
        .set('Authorization', `Bearer ${otherBuyerAuth.token}`)
        .send({ reason: 'Intrusion attempt' })
        .expect(404);
    });
  });
});
