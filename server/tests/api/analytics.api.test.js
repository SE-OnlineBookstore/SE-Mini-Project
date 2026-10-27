const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { Order } = require('../../models');

const app = createApp();

let adminToken;
let buyerToken;

beforeAll(db.start);

beforeEach(async () => {
  const admin = await makeUser('ADMIN');
  adminToken = (await login(app, admin)).token;

  const buyer = await makeUser('BUYER');
  buyerToken = (await login(app, buyer)).token;
});

afterEach(db.clear);
afterAll(db.stop);

describe('FR-24 Monthly analytics API', () => {
  test('rejects requests without authentication', async () => {
    const response = await request(app)
      .get('/api/v1/admin/analytics/export/csv')
      .query({ month: '2026-10' });

    expect(response.status).toBe(401);
  });

  test('rejects non-admin users', async () => {
    const response = await request(app)
      .get('/api/v1/admin/analytics/export/csv')
      .query({ month: '2026-10' })
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(response.status).toBe(403);
  });

  test('rejects an invalid month', async () => {
    const response = await request(app)
      .get('/api/v1/admin/analytics/export/csv')
      .query({ month: '2026-13' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
  });

  test('downloads a CSV with monthly analytics', async () => {
    await Order.create({
      order_no: 'OB-20261010-00001',
      buyer_id: (await makeUser('BUYER'))._id,
      address_id: new (require('mongoose').Types.ObjectId)(),
      item_total: 10000,
      shipping_fee: 0,
      discount: 0,
      total_amount: 10000,
      order_status: 'DELIVERED',
      created_at: new Date('2026-10-10T12:00:00.000Z'),
    });

    const response = await request(app)
      .get('/api/v1/admin/analytics/export/csv')
      .query({ month: '2026-10' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain(
      'platform-analytics-2026-10.csv',
    );
    expect(response.text).toContain('"Orders","1"');
    expect(response.text).toContain('"GMV","10000"');
  });

  test('downloads a PDF report', async () => {
    const response = await request(app)
      .get('/api/v1/admin/analytics/export/pdf')
      .query({ month: '2026-10' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(
      'platform-analytics-2026-10.pdf',
    );
    expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
