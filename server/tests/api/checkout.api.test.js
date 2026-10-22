// TC-O-03 checkout with address and coupon (FR-15; SRS 5.3.3; BR-02, BR-04, BR-05).
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { Book, Listing, Category, Address, Coupon, CartItem } = require('../../models');

const app = createApp();

let buyer;
let buyerAuth;
let seller;
let sellerAuth;
let category;
let book1;
let book2;
let listing1;
let buyerAddress;

async function setupData() {
  category = await Category.create({ name: 'Classics', slug: 'classics' });

  book1 = await Book.create({
    isbn13: '9780140449136',
    title: 'War and Peace',
    author: 'Leo Tolstoy',
    publisher: 'Penguin Classics',
    category_id: category._id,
    language: 'English',
    mrp: 80000,
  });

  book2 = await Book.create({
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
    price: 30000, // 300 rupees (below 500 free shipping)
    stock_qty: 5,
    status: 'ACTIVE',
  });

  await Listing.create({
    book_id: book2._id,
    seller_id: seller._id,
    condition: 'NEW',
    price: 45000, // 450 rupees
    stock_qty: 3,
    status: 'ACTIVE',
  });

  buyerAddress = await Address.create({
    user_id: buyer._id,
    line1: '42 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    is_default: true,
  });

  const now = new Date();
  const past = new Date(now.getTime() - 7 * 86400000);
  const future = new Date(now.getTime() + 7 * 86400000);

  await Coupon.create({
    code: 'FLAT50',
    discount_type: 'FLAT',
    value: 5000, // 50 rupees
    min_order: 20000,
    valid_from: past,
    valid_to: future,
    max_uses: 100,
    used_count: 0,
    is_active: true,
  });

  await Coupon.create({
    code: 'SAVE10',
    discount_type: 'PERCENT',
    value: 10, // 10%
    min_order: 10000,
    valid_from: past,
    valid_to: future,
    max_uses: 100,
    used_count: 0,
    is_active: true,
  });

  await Coupon.create({
    code: 'EXPIRED10',
    discount_type: 'FLAT',
    value: 5000,
    min_order: 10000,
    valid_from: new Date(now.getTime() - 14 * 86400000),
    valid_to: new Date(now.getTime() - 1 * 86400000),
    max_uses: 10,
    used_count: 0,
    is_active: true,
  });

  await Coupon.create({
    code: 'BIG100',
    discount_type: 'FLAT',
    value: 10000,
    min_order: 100000, // 1000 rupees
    valid_from: past,
    valid_to: future,
    max_uses: 10,
    used_count: 0,
    is_active: true,
  });
}

beforeAll(db.start);
beforeEach(async () => {
  buyer = await makeUser('BUYER');
  buyerAuth = { Authorization: `Bearer ${(await login(app, buyer)).token}` };
  seller = await makeUser('SELLER');
  sellerAuth = { Authorization: `Bearer ${(await login(app, seller)).token}` };
  await setupData();
});
afterEach(db.clear);
afterAll(db.stop);

describe('TC-O-03 checkout with address and coupon (FR-15)', () => {
  it('requires BUYER authentication', async () => {
    const unauth = await request(app).get('/api/v1/checkout/preview');
    expect(unauth.status).toBe(401);

    const asSeller = await request(app).get('/api/v1/checkout/preview').set(sellerAuth);
    expect(asSeller.status).toBe(403);
  });

  it('calculates flat shipping fee when item total is below ₹500 (BR-04)', async () => {
    // Add 1 item of ₹300 (30,000 paise)
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing1._id), quantity: 1 });

    const preview = await request(app)
      .get('/api/v1/checkout/preview')
      .set(buyerAuth)
      .query({ addressId: String(buyerAddress._id) });

    expect(preview.status).toBe(200);
    expect(preview.body.itemTotal).toBe(30000);
    expect(preview.body.shippingFee).toBe(4000); // 40 rupees
    expect(preview.body.payableAmount).toBe(34000); // 30000 + 4000
    expect(preview.body.canCheckout).toBe(true);
  });

  it('waives shipping fee when item total reaches ₹500 or more (BR-04)', async () => {
    // Add 2 items of ₹300 = ₹600 (60,000 paise)
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing1._id), quantity: 2 });

    const preview = await request(app)
      .get('/api/v1/checkout/preview')
      .set(buyerAuth)
      .query({ addressId: String(buyerAddress._id) });

    expect(preview.status).toBe(200);
    expect(preview.body.itemTotal).toBe(60000);
    expect(preview.body.shippingFee).toBe(0); // Free shipping
    expect(preview.body.payableAmount).toBe(60000);
  });

  it('applies a FLAT coupon correctly', async () => {
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing1._id), quantity: 1 });

    const preview = await request(app)
      .get('/api/v1/checkout/preview')
      .set(buyerAuth)
      .query({ addressId: String(buyerAddress._id), couponCode: 'FLAT50' });

    expect(preview.status).toBe(200);
    expect(preview.body.itemTotal).toBe(30000);
    expect(preview.body.discount).toBe(5000); // ₹50 discount
    expect(preview.body.shippingFee).toBe(4000);
    expect(preview.body.payableAmount).toBe(29000); // 30000 + 4000 - 5000
  });

  it('applies a PERCENT coupon correctly', async () => {
    // 2 x ₹300 = ₹600 (60,000 paise), 10% discount = ₹60 (6,000 paise)
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing1._id), quantity: 2 });

    const preview = await request(app)
      .get('/api/v1/checkout/preview')
      .set(buyerAuth)
      .query({ addressId: String(buyerAddress._id), couponCode: 'SAVE10' });

    expect(preview.status).toBe(200);
    expect(preview.body.itemTotal).toBe(60000);
    expect(preview.body.discount).toBe(6000); // 10% of 60,000
    expect(preview.body.shippingFee).toBe(0); // >= 500 free shipping
    expect(preview.body.payableAmount).toBe(54000); // 60000 - 6000
  });

  it('refuses an expired coupon code', async () => {
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing1._id), quantity: 1 });

    const res = await request(app)
      .post('/api/v1/checkout')
      .set(buyerAuth)
      .send({ addressId: String(buyerAddress._id), couponCode: 'EXPIRED10' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('COUPON_EXPIRED');
  });

  it('refuses a coupon when minimum order requirement is not met', async () => {
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing1._id), quantity: 1 });

    const res = await request(app)
      .post('/api/v1/checkout')
      .set(buyerAuth)
      .send({ addressId: String(buyerAddress._id), couponCode: 'BIG100' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('COUPON_MIN_ORDER_NOT_MET');
  });

  it('flags price changes in preview and applies current price', async () => {
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing1._id), quantity: 1 });

    // Price changes from 30000 to 35000
    await Listing.updateOne({ _id: listing1._id }, { $set: { price: 35000 } });

    const preview = await request(app)
      .get('/api/v1/checkout/preview')
      .set(buyerAuth)
      .query({ addressId: String(buyerAddress._id) });

    expect(preview.status).toBe(200);
    expect(preview.body.warnings).toHaveLength(1);
    expect(preview.body.warnings[0].code).toBe('PRICE_CHANGED');
    expect(preview.body.itemTotal).toBe(35000);
  });

  it('refuses checkout if stock is insufficient', async () => {
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing1._id), quantity: 3 });

    // Stock falls to 1
    await Listing.updateOne({ _id: listing1._id }, { $set: { stock_qty: 1 } });

    const res = await request(app)
      .post('/api/v1/checkout')
      .set(buyerAuth)
      .send({ addressId: String(buyerAddress._id) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('refuses checkout if a seller attempts to buy their own listing (BR-02)', async () => {
    // Seller creates their own listing
    const sellerListing = await Listing.create({
      book_id: book1._id,
      seller_id: buyer._id, // buyer is seller
      condition: 'NEW',
      price: 25000,
      stock_qty: 2,
      status: 'ACTIVE',
    });

    // Directly insert into cart
    const cartRes = await request(app).get('/api/v1/cart').set(buyerAuth);
    await CartItem.create({
      cart_id: cartRes.body.cartId,
      listing_id: sellerListing._id,
      quantity: 1,
      price_at_add: 25000,
    });

    const res = await request(app)
      .post('/api/v1/checkout')
      .set(buyerAuth)
      .send({ addressId: String(buyerAddress._id) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_PURCHASE');
  });

  it('successfully places an order, creates order items, clears the cart, and increments coupon count', async () => {
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing1._id), quantity: 2 });

    const res = await request(app)
      .post('/api/v1/checkout')
      .set(buyerAuth)
      .send({ addressId: String(buyerAddress._id), couponCode: 'FLAT50' });

    expect(res.status).toBe(201);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.orderNo).toMatch(/^OB-\d{8}-\d{5}$/);
    expect(res.body.order.orderStatus).toBe('PLACED');
    expect(res.body.order.itemTotal).toBe(60000);
    expect(res.body.order.shippingFee).toBe(0); // >= 500 free
    expect(res.body.order.discount).toBe(5000);
    expect(res.body.order.totalAmount).toBe(55000);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].unitPrice).toBe(30000);

    // Cart is now cleared
    const cartRes = await request(app).get('/api/v1/cart').set(buyerAuth);
    expect(cartRes.body.items).toHaveLength(0);

    // Coupon used_count incremented
    const updatedCoupon = await Coupon.findOne({ code: 'FLAT50' });
    expect(updatedCoupon.used_count).toBe(1);

    // Can fetch order details
    const orderDetails = await request(app).get(`/api/v1/orders/${res.body.order.id}`).set(buyerAuth);
    expect(orderDetails.status).toBe(200);
    expect(orderDetails.body.order.orderNo).toBe(res.body.order.orderNo);
  });

  it('never allows a buyer to checkout with another buyer\'s address (SR-06)', async () => {
    const otherBuyer = await makeUser('BUYER');
    const otherAddress = await Address.create({
      user_id: otherBuyer._id,
      line1: '10 Other St',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    });

    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing1._id), quantity: 1 });

    const res = await request(app)
      .post('/api/v1/checkout')
      .set(buyerAuth)
      .send({ addressId: String(otherAddress._id) });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ADDRESS_NOT_FOUND');
  });
});
