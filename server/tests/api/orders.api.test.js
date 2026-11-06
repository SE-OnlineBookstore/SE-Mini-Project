// S3-09: Buyer Orders Retrieval API Tests (supports FR-17, FR-18)
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { Order, Address } = require('../../models');

const app = createApp();

let buyer;
let buyerToken;
let otherBuyer;
let seller;
let sellerToken;
let admin;
let adminToken;
let address;

beforeAll(db.start);

beforeEach(async () => {
  buyer = await makeUser('BUYER');
  buyerToken = (await login(app, buyer)).token;

  otherBuyer = await makeUser('BUYER');
  seller = await makeUser('SELLER');
  sellerToken = (await login(app, seller)).token;

  admin = await makeUser('ADMIN');
  adminToken = (await login(app, admin)).token;

  address = await Address.create({
    user_id: buyer._id,
    line1: '123 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    is_default: true,
  });
});

afterEach(db.clear);
afterAll(db.stop);

describe('S3-09 /api/v1/orders buyer order history API', () => {
  it('returns empty list of orders when buyer has placed no orders', async () => {
    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
    expect(res.body.orders).toEqual([]);
  });

  it('returns only the logged-in buyer orders with required fields', async () => {
    const ownOrder = await Order.create({
      order_no: 'OB-20261103-10001',
      buyer_id: buyer._id,
      address_id: address._id,
      item_total: 45000,
      shipping_fee: 4000,
      discount: 5000,
      total_amount: 44000,
      order_status: 'CONFIRMED',
      status_history: [{ status: 'CONFIRMED', at: new Date() }],
    });

    // Another buyer's order
    const otherAddress = await Address.create({
      user_id: otherBuyer._id,
      line1: '456 Brigade Road',
      city: 'Mysuru',
      state: 'Karnataka',
      pincode: '570001',
      is_default: true,
    });

    await Order.create({
      order_no: 'OB-20261103-10002',
      buyer_id: otherBuyer._id,
      address_id: otherAddress._id,
      item_total: 60000,
      shipping_fee: 0,
      discount: 0,
      total_amount: 60000,
      order_status: 'PLACED',
      status_history: [{ status: 'PLACED', at: new Date() }],
    });

    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);

    const returnedOrder = res.body.orders[0];
    expect(returnedOrder).toMatchObject({
      id: String(ownOrder._id),
      orderNo: 'OB-20261103-10001',
      orderStatus: 'CONFIRMED',
      itemTotal: 45000,
      shippingFee: 4000,
      discount: 5000,
      totalAmount: 44000,
      city: 'Bengaluru',
    });
    expect(returnedOrder).toHaveProperty('createdAt');
  });

  it('returns orders sorted newest first (descending by created_at)', async () => {
    const olderDate = new Date(Date.now() - 3600000);
    const newerDate = new Date();

    const olderOrder = await Order.create({
      order_no: 'OB-20261103-10003',
      buyer_id: buyer._id,
      address_id: address._id,
      item_total: 20000,
      shipping_fee: 4000,
      discount: 0,
      total_amount: 24000,
      order_status: 'DELIVERED',
      created_at: olderDate,
    });

    const newerOrder = await Order.create({
      order_no: 'OB-20261103-10004',
      buyer_id: buyer._id,
      address_id: address._id,
      item_total: 30000,
      shipping_fee: 0,
      discount: 0,
      total_amount: 30000,
      order_status: 'PLACED',
      created_at: newerDate,
    });

    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
    expect(res.body.orders[0].id).toBe(String(newerOrder._id));
    expect(res.body.orders[1].id).toBe(String(olderOrder._id));
  });

  it('rejects unauthenticated requests with HTTP 401', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.status).toBe(401);
  });

  it('rejects non-buyer requests (SELLER, ADMIN) with HTTP 403', async () => {
    const sellerRes = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(sellerRes.status).toBe(403);

    const adminRes = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(403);
  });
});
