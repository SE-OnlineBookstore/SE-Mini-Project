const mongoose = require('mongoose');
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { Order, OrderItem, Address } = require('../../models');

const app = createApp();

let buyer;
let seller;
let sellerToken;
let otherSeller;
let order;

async function createTestOrder(orderNo = 'OB-20261103-10001') {
  const address = await Address.create({
    user_id: buyer._id,
    line1: '123 Test Street',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    is_default: true,
  });

  return Order.create({
    order_no: orderNo,
    buyer_id: buyer._id,
    address_id: address._id,
    item_total: 50000,
    shipping_fee: 4000,
    discount: 0,
    total_amount: 54000,
    order_status: 'PLACED',
    status_history: [{ status: 'PLACED', at: new Date() }],
  });
}

beforeAll(db.start);

beforeEach(async () => {
  buyer = await makeUser('BUYER');
  seller = await makeUser('SELLER');
  sellerToken = (await login(app, seller)).token;
  otherSeller = await makeUser('SELLER');
  order = await createTestOrder();
});

afterEach(db.clear);
afterAll(db.stop);

describe('S3-02 seller orders retrieval API', () => {
  it('returns only the logged-in seller order items with order number, title, quantity and status', async () => {
    const ownItem = await OrderItem.create({
      order_id: order._id,
      listing_id: new mongoose.Types.ObjectId(),
      seller_id: seller._id,
      title: 'Operating System Concepts',
      quantity: 2,
      unit_price: 25000,
      item_status: 'PLACED',
    });

    await OrderItem.create({
      order_id: order._id,
      listing_id: new mongoose.Types.ObjectId(),
      seller_id: otherSeller._id,
      title: 'Database System Concepts',
      quantity: 1,
      unit_price: 30000,
      item_status: 'PLACED',
    });

    const res = await request(app)
      .get('/api/v1/seller/orders')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    const items = res.body.orders || res.body.items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: String(ownItem._id),
      orderNo: order.order_no,
      title: 'Operating System Concepts',
      quantity: 2,
      itemStatus: 'PLACED',
    });
  });

  it('filters order items by status when query parameter is provided', async () => {
    await OrderItem.create({
      order_id: order._id,
      listing_id: new mongoose.Types.ObjectId(),
      seller_id: seller._id,
      title: 'Placed Book',
      quantity: 1,
      unit_price: 10000,
      item_status: 'PLACED',
    });

    const confirmedItem = await OrderItem.create({
      order_id: order._id,
      listing_id: new mongoose.Types.ObjectId(),
      seller_id: seller._id,
      title: 'Confirmed Book',
      quantity: 2,
      unit_price: 20000,
      item_status: 'CONFIRMED',
    });

    const res = await request(app)
      .get('/api/v1/seller/orders?status=CONFIRMED')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    const items = res.body.orders || res.body.items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(String(confirmedItem._id));
    expect(items[0].itemStatus).toBe('CONFIRMED');
  });

  it('filters order items case-insensitively', async () => {
    await OrderItem.create({
      order_id: order._id,
      listing_id: new mongoose.Types.ObjectId(),
      seller_id: seller._id,
      title: 'Shipped Book',
      quantity: 1,
      unit_price: 15000,
      item_status: 'SHIPPED',
    });

    const res = await request(app)
      .get('/api/v1/seller/orders?status=shipped')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    const items = res.body.orders || res.body.items;
    expect(items).toHaveLength(1);
    expect(items[0].itemStatus).toBe('SHIPPED');
  });

  it('requires seller authentication', async () => {
    const res = await request(app).get('/api/v1/seller/orders');
    expect(res.status).toBe(401);
  });

  it.each(['BUYER', 'ADMIN'])('rejects %s user with 403', async (role) => {
    const user = await makeUser(role);
    const auth = await login(app, user);

    const res = await request(app)
      .get('/api/v1/seller/orders')
      .set('Authorization', `Bearer ${auth.token}`);

    expect(res.status).toBe(403);
  });

  it('returns empty array when seller has no order items', async () => {
    const res = await request(app)
      .get('/api/v1/seller/orders')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    const items = res.body.orders || res.body.items;
    expect(items).toEqual([]);
  });
});
