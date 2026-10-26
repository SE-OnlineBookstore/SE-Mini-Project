
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { Order, OrderItem } = require('../../models');

const app = createApp();

let seller;
let token;
let buyer;
let buyerToken;

beforeAll(db.start);

beforeEach(async () => {
  seller = await makeUser('SELLER');
  token = (await login(app, seller)).token;

  buyer = await makeUser('BUYER');
  buyerToken = (await login(app, buyer)).token;
});

afterEach(db.clear);
afterAll(db.stop);

async function createOrderForSeller({
  sellerId,
  buyerId,
  orderNo,
  createdAt,
  items,
}) {
  const order = await Order.create({
    order_no: orderNo,
    buyer_id: buyerId,
    address_id: new (require('mongoose').Types.ObjectId)(),
    item_total: items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    ),
    shipping_fee: 0,
    discount: 0,
    total_amount: items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    ),
    order_status: 'DELIVERED',
    created_at: createdAt,
  });

  await OrderItem.insertMany(
    items.map((item) => ({
      order_id: order._id,
      listing_id: new (require('mongoose').Types.ObjectId)(),
      seller_id: sellerId,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_status: item.item_status || 'DELIVERED',
    })),
  );

  return order;
}

describe('FR-22 Seller sales dashboard API', () => {
  it('returns sales totals and order summaries for the selected date range', async () => {
    await createOrderForSeller({
      sellerId: seller._id,
      buyerId: buyer._id,
      orderNo: 'OB-20261010-00001',
      createdAt: new Date('2026-10-10T12:00:00.000Z'),
      items: [
        { title: 'Book A', quantity: 2, unit_price: 10000 },
        {
          title: 'Book B',
          quantity: 1,
          unit_price: 5000,
          item_status: 'RETURNED',
        },
      ],
    });

    const response = await request(app)
      .get('/api/v1/seller/dashboard')
      .query({ from: '2026-10-01', to: '2026-10-31' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.summary).toMatchObject({
      unitsSold: 3,
      grossRevenue: 25000,
      returnedUnits: 1,
      returnedRevenue: 5000,
      commission: null,
      netSettlement: null,
    });
    expect(response.body.data.orders).toHaveLength(1);
    expect(response.body.data.orders[0]).toMatchObject({
      orderNo: 'OB-20261010-00001',
      units: 3,
      grossRevenue: 25000,
      returnedRevenue: 5000,
    });
  });

  it('rejects requests without authentication', async () => {
    const response = await request(app)
      .get('/api/v1/seller/dashboard')
      .query({ from: '2026-10-01', to: '2026-10-31' });

    expect(response.status).toBe(401);
  });

  it('rejects buyers who try to access the seller dashboard', async () => {
    const response = await request(app)
      .get('/api/v1/seller/dashboard')
      .query({ from: '2026-10-01', to: '2026-10-31' })
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(response.status).toBe(403);
  });

  it('rejects an invalid date range', async () => {
    const response = await request(app)
      .get('/api/v1/seller/dashboard')
      .query({ from: '2026-10-31', to: '2026-10-01' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it('does not include another seller’s order items in the totals', async () => {
    const otherSeller = await makeUser('SELLER');

    await createOrderForSeller({
      sellerId: seller._id,
      buyerId: buyer._id,
      orderNo: 'OB-20261010-00002',
      createdAt: new Date('2026-10-10T12:00:00.000Z'),
      items: [{ title: 'My Book', quantity: 1, unit_price: 10000 }],
    });

    await OrderItem.create({
      order_id: (await Order.findOne({
        order_no: 'OB-20261010-00002',
      }))._id,
      listing_id: new (require('mongoose').Types.ObjectId)(),
      seller_id: otherSeller._id,
      title: 'Other Seller Book',
      quantity: 5,
      unit_price: 20000,
      item_status: 'DELIVERED',
    });

    const response = await request(app)
      .get('/api/v1/seller/dashboard')
      .query({ from: '2026-10-01', to: '2026-10-31' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.summary.unitsSold).toBe(1);
    expect(response.body.data.summary.grossRevenue).toBe(10000);
    expect(JSON.stringify(response.body)).not.toContain('Other Seller Book');
  });
});