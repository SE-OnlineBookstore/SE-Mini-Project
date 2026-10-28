const request = require('supertest');
const mongoose = require('mongoose');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { User, Listing, Review, Book, AuditLog } = require('../../models');

const app = createApp();

let adminToken;
let buyerToken;
let admin;

beforeAll(db.start);

beforeEach(async () => {
  admin = await makeUser('ADMIN');
  adminToken = (await login(app, admin)).token;

  const buyer = await makeUser('BUYER');
  buyerToken = (await login(app, buyer)).token;
});

afterEach(db.clear);
afterAll(db.stop);

async function makeBook() {
  return Book.create({
    isbn13: `${Date.now()}`.slice(-10).padStart(10, '0') + '123',
    title: 'Moderation Test Book',
    author: 'Test Author',
    category_id: new mongoose.Types.ObjectId(),
    language: 'English',
    mrp: 20000,
  });
}

async function makeListing(overrides = {}) {
  const seller = await makeUser('SELLER');
  const book = await makeBook();

  const listing = await Listing.create({
    book_id: book._id,
    seller_id: seller._id,
    condition: 'GOOD',
    price: 10000,
    stock_qty: 3,
    status: 'ACTIVE',
    ...overrides,
  });

  return { listing, book, seller };
}

async function makeReview(book) {
  const reviewer = await makeUser('BUYER');

  return Review.create({
    book_id: book._id,
    buyer_id: reviewer._id,
    order_item_id: new mongoose.Types.ObjectId(),
    rating: 4,
    comment: 'A test review',
  });
}

function moderationUrl(type, id, action = 'block') {
  return `/api/v1/admin/moderation/${type}/${id}/${action}`;
}

describe('FR-23 Reported content moderation', () => {
  test('rejects requests without authentication', async () => {
    const response = await request(app)
      .patch(moderationUrl('user', new mongoose.Types.ObjectId()))
      .send({ reason: 'Reported content' });

    expect(response.status).toBe(401);
  });

  test('rejects non-admin users', async () => {
    const target = await makeUser('BUYER');

    const response = await request(app)
      .patch(moderationUrl('user', target._id))
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ reason: 'Reported content' });

    expect(response.status).toBe(403);
  });

  test('rejects a missing moderation reason', async () => {
    const target = await makeUser('BUYER');

    const response = await request(app)
      .patch(moderationUrl('user', target._id))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  test('rejects a blank moderation reason', async () => {
    const target = await makeUser('BUYER');

    const response = await request(app)
      .patch(moderationUrl('user', target._id))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '   ' });

    expect(response.status).toBe(400);
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  test('blocks a listing and records an audit log', async () => {
    const { listing } = await makeListing();

    const response = await request(app)
      .patch(moderationUrl('listing', listing._id))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Listing violates marketplace rules' });

    expect(response.status).toBe(200);

    const updated = await Listing.findById(listing._id);
    expect(updated.status).toBe('BLOCKED');

    const audit = await AuditLog.findOne({
      target_id: String(listing._id),
      action: 'LISTING_BLOCKED',
    });

    expect(audit).not.toBeNull();
    expect(String(audit.actor_id)).toBe(String(admin._id));
    expect(audit.target_type).toBe('LISTING');
    expect(audit.reason).toBe('Listing violates marketplace rules');
  });

  test('unblocks a listing and restores its previous status', async () => {
    const { listing } = await makeListing({ status: 'UNLISTED' });

    const blockResponse = await request(app)
      .patch(moderationUrl('listing', listing._id, 'block'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Temporary review' });

    expect(blockResponse.status).toBe(200);

    const unblockResponse = await request(app)
      .patch(moderationUrl('listing', listing._id, 'unblock'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Review completed' });

    expect(unblockResponse.status).toBe(200);

    const updated = await Listing.findById(listing._id);
    expect(updated.status).toBe('UNLISTED');

    expect(await AuditLog.countDocuments({
      target_id: String(listing._id),
      action: { $in: ['LISTING_BLOCKED', 'LISTING_UNBLOCKED'] },
    })).toBe(2);
  });

  test('blocks a user and invalidates existing token versions', async () => {
    const target = await makeUser('BUYER');
    const oldVersion = target.token_version || 0;

    const response = await request(app)
      .patch(moderationUrl('user', target._id))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Account reported for abuse' });

    expect(response.status).toBe(200);

    const updated = await User.findById(target._id);
    expect(updated.is_blocked).toBe(true);
    expect(updated.token_version).toBe(oldVersion + 1);

    expect(await AuditLog.findOne({
      target_id: String(target._id),
      action: 'USER_BLOCKED',
    })).not.toBeNull();
  });

  test('blocks a review and records the moderation reason', async () => {
    const book = await makeBook();
    const review = await makeReview(book);

    const response = await request(app)
      .patch(moderationUrl('review', review._id))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Review contains abusive content' });

    expect(response.status).toBe(200);

    const updated = await Review.findById(review._id);
    expect(updated.is_blocked).toBe(true);

    const audit = await AuditLog.findOne({
      target_id: String(review._id),
      action: 'REVIEW_BLOCKED',
    });

    expect(audit).not.toBeNull();
    expect(audit.reason).toBe('Review contains abusive content');
    expect(String(audit.actor_id)).toBe(String(admin._id));
  });

  test('rejects blocking an already blocked user', async () => {
    const target = await makeUser('BUYER', { is_blocked: true });

    const response = await request(app)
      .patch(moderationUrl('user', target._id))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Repeated report' });

    expect(response.status).toBe(409);
  });

  test('rejects an invalid target type', async () => {
    const response = await request(app)
      .patch(moderationUrl('book', new mongoose.Types.ObjectId()))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Invalid target type' });

    expect(response.status).toBe(400);
  });

  test('rejects a target that does not exist', async () => {
    const response = await request(app)
      .patch(moderationUrl('user', new mongoose.Types.ObjectId()))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Reported account' });

    expect(response.status).toBe(404);
  });
});
