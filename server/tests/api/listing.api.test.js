const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { Book, Category, Listing, Notification } = require('../../models');

const app = createApp();
let seller;
let token;
let category;

async function makeBook() {
  const isbnBase = '978013110362';
  const digits = isbnBase.split('').map(Number);
  const sum = digits.reduce(
    (total, digit, i) => total + digit * (i % 2 === 0 ? 1 : 3),
    0,
  );
  const isbn13 = isbnBase + ((10 - (sum % 10)) % 10);

  return Book.create({
    isbn13,
    title: 'The C Programming Language',
    author: 'Brian W. Kernighan',
    publisher: 'Prentice Hall',
    category_id: category._id,
    language: 'English',
    mrp: 50000,
  });
}

beforeAll(db.start);

beforeEach(async () => {
  seller = await makeUser('SELLER');
  token = (await login(app, seller)).token;
  category = await Category.create({
    name: 'Technology',
    slug: 'technology',
  });
});

afterEach(db.clear);
afterAll(db.stop);

describe('Issue #19 seller listing API (TC-S-01)', () => {
  it('creates a listing for an existing ISBN and refreshes the catalogue', async () => {
    const book = await makeBook();

    const res = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        isbn13: book.isbn13,
        condition: 'GOOD',
        price: 25000,
        stock_qty: 3,
      });

    expect(res.status).toBe(201);
    expect(res.body.listing).toMatchObject({
      bookId: String(book._id),
      sellerId: String(seller._id),
      condition: 'GOOD',
      price: 25000,
      stockQty: 3,
      status: 'ACTIVE',
    });

    const saved = await Listing.findOne({
      book_id: book._id,
      seller_id: seller._id,
    });
    expect(saved).not.toBeNull();

    const refreshedBook = await Book.findById(book._id).lean();
    expect(refreshedBook.lowest_price).toBe(25000);
    expect(refreshedBook.active_offers).toBe(1);
  });

  it('rejects requests without authentication', async () => {
    const book = await makeBook();

    const res = await request(app)
      .post('/api/v1/seller/listings')
      .send({
        isbn13: book.isbn13,
        condition: 'GOOD',
        price: 25000,
        stock_qty: 3,
      });

    expect(res.status).toBe(401);
  });

  it('rejects a buyer attempting to create a listing', async () => {
    const buyer = await makeUser('BUYER');
    const buyerToken = (await login(app, buyer)).token;
    const book = await makeBook();

    const res = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        isbn13: book.isbn13,
        condition: 'GOOD',
        price: 25000,
        stock_qty: 3,
      });

    expect(res.status).toBe(403);
  });

  it('rejects invalid ISBNs and unknown catalogue books', async () => {
    const invalid = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        isbn13: '123',
        condition: 'GOOD',
        price: 25000,
        stock_qty: 3,
      });

    expect(invalid.status).toBe(400);

    const unknown = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        isbn13: '9780306406157',
        condition: 'GOOD',
        price: 25000,
        stock_qty: 3,
      });

    expect(unknown.status).toBe(404);
  });

  it('rejects invalid fields and marks zero-stock listings out of stock', async () => {
    const book = await makeBook();

    const invalid = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        isbn13: book.isbn13,
        condition: 'DAMAGED',
        price: 0,
        stock_qty: -1,
        unexpected: true,
      });

    expect(invalid.status).toBe(400);

    const valid = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        isbn13: book.isbn13,
        condition: 'ACCEPTABLE',
        price: 10000,
        stock_qty: 0,
      });

    expect(valid.status).toBe(201);
    expect(valid.body.listing.status).toBe('OUT_OF_STOCK');
  });
});

describe('Issue #20 seller stock and price management', () => {
  async function createTestListing(stockQty = 10, price = 25000) {
    const book = await makeBook();

    const response = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        isbn13: book.isbn13,
        condition: 'GOOD',
        price,
        stock_qty: stockQty,
      });

    expect(response.status).toBe(201);

    return {
      book,
      listingId: response.body.listing.id,
    };
  }

  it('updates the listing price when it does not exceed MRP', async () => {
    const { listingId } = await createTestListing();

    const res = await request(app)
      .patch(`/api/v1/seller/listings/${listingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 30000 });

    expect(res.status).toBe(200);
    expect(res.body.listing.price).toBe(30000);
  });

  it('rejects a listing price above book MRP', async () => {
    const { listingId } = await createTestListing();

    const res = await request(app)
      .patch(`/api/v1/seller/listings/${listingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 50001 });

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('PRICE_ABOVE_MRP');
  });

  it('updates stock and marks the listing out of stock at zero', async () => {
    const { listingId } = await createTestListing();

    const stocked = await request(app)
      .patch(`/api/v1/seller/listings/${listingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock_qty: 4 });

    expect(stocked.status).toBe(200);
    expect(stocked.body.listing.stockQty).toBe(4);

    const empty = await request(app)
      .patch(`/api/v1/seller/listings/${listingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock_qty: 0 });

    expect(empty.status).toBe(200);
    expect(empty.body.listing.stockQty).toBe(0);
    expect(empty.body.listing.status).toBe('OUT_OF_STOCK');
  });

  it('does not allow a seller to update another seller listing', async () => {
    const { listingId } = await createTestListing();

    const otherSeller = await makeUser('SELLER');
    const otherToken = (await login(app, otherSeller)).token;

    const res = await request(app)
      .patch(`/api/v1/seller/listings/${listingId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ price: 20000 });

    expect(res.status).toBe(404);
  });

  it('records a low-stock notification when stock drops to five copies', async () => {
    const { listingId } = await createTestListing(10);

    const res = await request(app)
      .patch(`/api/v1/seller/listings/${listingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock_qty: 5 });

    expect(res.status).toBe(200);

    const notification = await Notification.findOne({
      user_id: seller._id,
      type: 'LOW_STOCK_ALERT',
    });

    expect(notification).not.toBeNull();
    expect(notification.subject).toContain('Low stock alert');
  });
});
