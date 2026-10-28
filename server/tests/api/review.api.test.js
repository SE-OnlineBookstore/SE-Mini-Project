// TC-C-05 write a review (FR-11). Needs a real MongoDB.
const mongoose = require('mongoose');
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const cache = require('../../adapters/cache');
const { Book, Listing, Category, Order, OrderItem, Review } = require('../../models');

const app = createApp();
let seller;
let buyer;
let auth;
let book;
let listing;
let seq = 0;

const reviewUrl = () => `/api/v1/books/${book._id}/reviews`;

async function addLine(owner, status) {
  seq += 1;
  const order = await Order.create({
    order_no: `OB-20261027-${String(seq).padStart(5, '0')}`,
    buyer_id: owner._id,
    address_id: new mongoose.Types.ObjectId(),
    item_total: listing.price,
    shipping_fee: 0,
    total_amount: listing.price,
  });
  return OrderItem.create({
    order_id: order._id,
    listing_id: listing._id,
    seller_id: seller._id,
    title: book.title,
    quantity: 1,
    unit_price: listing.price,
    item_status: status,
    ...(status === 'DELIVERED' ? { delivered_at: new Date() } : {}),
  });
}

beforeAll(db.start);
beforeEach(async () => {
  cache._memory.clear();
  seller = await makeUser('SELLER');
  buyer = await makeUser('BUYER');
  auth = { Authorization: `Bearer ${(await login(app, buyer)).token}` };
  const category = await Category.create({ name: 'Fiction', slug: 'fiction' });
  seq += 1;
  book = await Book.create({
    isbn13: String(9780000000000 + seq),
    title: 'Review Test Book',
    author: 'Ruskin Bond',
    category_id: category._id,
    mrp: 50000,
  });
  listing = await Listing.create({ book_id: book._id, seller_id: seller._id, condition: 'GOOD', price: 25000, stock_qty: 3 });
});
afterEach(db.clear);
afterAll(db.stop);

describe('TC-C-05 write a review (FR-11)', () => {
  it('refuses a book that has not been delivered with 403 REVIEW_NOT_ELIGIBLE', async () => {
    const none = await request(app).post(reviewUrl()).set(auth).send({ rating: 5 });
    expect(none.status).toBe(403);
    expect(none.body.error.code).toBe('REVIEW_NOT_ELIGIBLE');

    await addLine(buyer, 'SHIPPED');
    const shipped = await request(app).post(reviewUrl()).set(auth).send({ rating: 5 });
    expect(shipped.status).toBe(403);
    expect(shipped.body.error.code).toBe('REVIEW_NOT_ELIGIBLE');
    expect(await Review.countDocuments()).toBe(0);
  });

  it('accepts one review per delivered line, then refuses a second with 409', async () => {
    await addLine(buyer, 'DELIVERED');
    const first = await request(app).post(reviewUrl()).set(auth).send({ rating: 4, comment: 'Good read' });
    expect(first.status).toBe(201);
    expect(first.body.avgRating).toBe(4);
    expect(first.body.reviewCount).toBe(1);

    const second = await request(app).post(reviewUrl()).set(auth).send({ rating: 5 });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('REVIEW_ALREADY_EXISTS');
    expect(await Review.countDocuments()).toBe(1);
    const stored = await Book.findById(book._id).lean();
    expect(stored.avg_rating).toBe(4);
    expect(stored.review_count).toBe(1);
  });

  it('allows one review for each delivered order line and recalculates the average', async () => {
    await addLine(buyer, 'DELIVERED');
    await addLine(buyer, 'DELIVERED');
    const first = await request(app).post(reviewUrl()).set(auth).send({ rating: 5 });
    const second = await request(app).post(reviewUrl()).set(auth).send({ rating: 4 });
    const third = await request(app).post(reviewUrl()).set(auth).send({ rating: 3 });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(third.status).toBe(409);
    const stored = await Book.findById(book._id).lean();
    expect(stored.avg_rating).toBe(4.5);
    expect(stored.review_count).toBe(2);
  });

  it('does not let another buyer use someone else\'s delivered line', async () => {
    await addLine(buyer, 'DELIVERED');
    const other = await makeUser('BUYER');
    const otherAuth = { Authorization: `Bearer ${(await login(app, other)).token}` };
    const res = await request(app).post(reviewUrl()).set(otherAuth).send({ rating: 5 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REVIEW_NOT_ELIGIBLE');
  });

  it('validates the rating and the comment length', async () => {
    await addLine(buyer, 'DELIVERED');
    const tooHigh = await request(app).post(reviewUrl()).set(auth).send({ rating: 6 });
    const tooLow = await request(app).post(reviewUrl()).set(auth).send({ rating: 0 });
    const missing = await request(app).post(reviewUrl()).set(auth).send({ comment: 'No rating' });
    const tooLong = await request(app).post(reviewUrl()).set(auth).send({ rating: 5, comment: 'x'.repeat(1001) });
    [tooHigh, tooLow, missing, tooLong].forEach((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
    expect(await Review.countDocuments()).toBe(0);
  });

  it('is for buyers only and needs a sign-in and an existing book', async () => {
    const sellerAuth = { Authorization: `Bearer ${(await login(app, seller)).token}` };
    const asSeller = await request(app).post(reviewUrl()).set(sellerAuth).send({ rating: 5 });
    expect(asSeller.status).toBe(403);
    expect(asSeller.body.error.code).toBe('FORBIDDEN_ROLE');

    const anonymous = await request(app).post(reviewUrl()).send({ rating: 5 });
    expect(anonymous.status).toBe(401);

    const unknown = await request(app).post('/api/v1/books/507f1f77bcf86cd799439011/reviews').set(auth).send({ rating: 5 });
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('BOOK_NOT_FOUND');
  });
});
