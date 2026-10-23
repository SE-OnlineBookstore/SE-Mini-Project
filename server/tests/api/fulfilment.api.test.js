
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const {
  Order,
  OrderItem,
  Shipment,
  Address,
} = require('../../models');

const app = createApp();

let buyer;
let buyerAuth;
let seller;
let sellerAuth;
let otherSeller;
let otherSellerAuth;
let order;
let orderItem;

async function setupOrder() {
  const address = await Address.create({
    user_id: buyer._id,
    line1: '42 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    is_default: true,
  });

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = String(Date.now()).slice(-5);

  order = await Order.create({
    order_no: `OB-${date}-${suffix}`,
    buyer_id: buyer._id,
    address_id: address._id,
    item_total: 30000,
    shipping_fee: 4000,
    discount: 0,
    total_amount: 34000,
    order_status: 'PLACED',
    status_history: [{ status: 'PLACED', at: new Date() }],
  });

  orderItem = await OrderItem.create({
    order_id: order._id,
    listing_id: new (require('mongoose').Types.ObjectId)(),
    seller_id: seller._id,
    title: 'Test Book',
    quantity: 1,
    unit_price: 30000,
    item_status: 'PLACED',
  });
}

beforeAll(db.start);

beforeEach(async () => {
  buyer = await makeUser('BUYER');
  buyerAuth = {
    Authorization: `Bearer ${(await login(app, buyer)).token}`,
  };

  seller = await makeUser('SELLER');
  sellerAuth = {
    Authorization: `Bearer ${(await login(app, seller)).token}`,
  };

  otherSeller = await makeUser('SELLER');
  otherSellerAuth = {
    Authorization: `Bearer ${(await login(app, otherSeller)).token}`,
  };

  await setupOrder();
});

afterEach(db.clear);
afterAll(db.stop);

describe('Seller order fulfilment (Issue #21)', () => {
  const endpoint = (itemId, action) =>
    `/api/v1/seller/fulfilment/${itemId}/${action}`;

  it('requires seller authentication', async () => {
    const res = await request(app).post(
      endpoint(orderItem._id, 'accept')
    );

    expect(res.status).toBe(401);
  });

  it('does not allow a buyer to use seller fulfilment endpoints', async () => {
    const res = await request(app)
      .post(endpoint(orderItem._id, 'accept'))
      .set(buyerAuth);

    expect(res.status).toBe(403);
  });

  it('does not allow another seller to fulfil this item', async () => {
    const res = await request(app)
      .post(endpoint(orderItem._id, 'accept'))
      .set(otherSellerAuth);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_ITEM_NOT_FOUND');
  });

  it('accepts, packs and dispatches an order item in sequence', async () => {
    const accepted = await request(app)
      .post(endpoint(orderItem._id, 'accept'))
      .set(sellerAuth);

    expect(accepted.status).toBe(200);
    expect(accepted.body.item.status).toBe('CONFIRMED');

    const packed = await request(app)
      .post(endpoint(orderItem._id, 'pack'))
      .set(sellerAuth);

    expect(packed.status).toBe(200);
    expect(packed.body.item.status).toBe('PACKED');

    const dispatched = await request(app)
      .post(endpoint(orderItem._id, 'dispatch'))
      .set(sellerAuth)
      .send({
        courier: 'Test Courier',
        trackingNo: 'TRACK12345',
      });

    expect(dispatched.status).toBe(200);
    expect(dispatched.body.item.status).toBe('SHIPPED');
    expect(dispatched.body.shipment).toBeDefined();
    expect(dispatched.body.shipment.courier).toBe('Test Courier');
    expect(dispatched.body.shipment.trackingNo).toBe('TRACK12345');

    const savedItem = await OrderItem.findById(orderItem._id);
    expect(savedItem.item_status).toBe('SHIPPED');

    const shipments = await Shipment.find({
      order_item_id: orderItem._id,
    });

    expect(shipments).toHaveLength(1);
    expect(shipments[0].tracking_no).toBe('TRACK12345');
  });

  it('rejects packing before acceptance', async () => {
    const res = await request(app)
      .post(endpoint(orderItem._id, 'pack'))
      .set(sellerAuth);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    const savedItem = await OrderItem.findById(orderItem._id);
    expect(savedItem.item_status).toBe('PLACED');
  });

  it('requires courier and tracking details for dispatch', async () => {
    await request(app)
      .post(endpoint(orderItem._id, 'accept'))
      .set(sellerAuth);

    await request(app)
      .post(endpoint(orderItem._id, 'pack'))
      .set(sellerAuth);

    const res = await request(app)
      .post(endpoint(orderItem._id, 'dispatch'))
      .set(sellerAuth)
      .send({});

    expect(res.status).toBe(400);

    const shipments = await Shipment.find({
      order_item_id: orderItem._id,
    });

    expect(shipments).toHaveLength(0);
  });

  it('does not accept an order item twice', async () => {
    await request(app)
      .post(endpoint(orderItem._id, 'accept'))
      .set(sellerAuth);

    const secondAttempt = await request(app)
      .post(endpoint(orderItem._id, 'accept'))
      .set(sellerAuth);

    expect(secondAttempt.status).toBe(409);
    expect(secondAttempt.body.error.code).toBe(
      'INVALID_STATUS_TRANSITION'
    );
  });
});
