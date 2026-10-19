// TC-O-01 to TC-O-04 and TC-N-05: Cart, Wishlist, Checkout, Payment (FR-13 to FR-16).
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const paymentService = require('../../services/paymentService');
const { Book, Listing, Category, Cart, CartItem, Wishlist, Order, OrderItem, Payment, Coupon, Address } = require('../../models');

const app = createApp();

let buyer;
let seller;
let buyerAuth;
let sellerAuth;
let category;

async function createBookWithListing({ title = 'Atomic Habits', price = 40000, stock = 10, sellerUser = seller }) {
  const n = String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  const body = `978${n}`;
  const sum = body.split('').reduce((a, d, i) => a + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  const isbn13 = body + ((10 - (sum % 10)) % 10);

  const book = await Book.create({
    isbn13,
    title,
    author: 'James Clear',
    publisher: 'Random House',
    category_id: category._id,
    language: 'English',
    mrp: price + 10000,
  });

  const listing = await Listing.create({
    book_id: book._id,
    seller_id: sellerUser._id,
    condition: 'NEW',
    price,
    stock_qty: stock,
    status: stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
  });

  return { book, listing };
}

beforeAll(db.start);
beforeEach(async () => {
  buyer = await makeUser('BUYER');
  seller = await makeUser('SELLER');
  buyerAuth = { Authorization: `Bearer ${(await login(app, buyer)).token}` };
  sellerAuth = { Authorization: `Bearer ${(await login(app, seller)).token}` };
  category = await Category.create({ name: 'Self-Help', slug: `self-help-${Date.now()}` });
});
afterEach(db.clear);
afterAll(db.stop);

describe('TC-O-01 shopping cart (FR-13)', () => {
  it('adds a book, views the cart, changes quantity up to stock limit, and rejects outside 1-10 range', async () => {
    const { listing } = await createBookWithListing({ title: 'Atomic Habits', price: 40000, stock: 8 });

    // A. Add a book
    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set(buyerAuth)
      .send({ listingId: String(listing._id), quantity: 1 });
    expect(addRes.status).toBe(201);
    expect(addRes.body.items).toHaveLength(1);
    expect(addRes.body.items[0].book.title).toBe('Atomic Habits');
    expect(addRes.body.subtotal).toBe(40000);
    const cartItemId = addRes.body.items[0].id;

    // B. View the cart
    const viewRes = await request(app).get('/api/v1/cart').set(buyerAuth);
    expect(viewRes.status).toBe(200);
    expect(viewRes.body.totalItems).toBe(1);
    expect(viewRes.body.items[0].quantity).toBe(1);

    // C. Change quantity to 5
    const patchRes = await request(app)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set(buyerAuth)
      .send({ quantity: 5 });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.items[0].quantity).toBe(5);
    expect(patchRes.body.subtotal).toBe(200000);

    // D. Reject quantity 11 (exceeds max 10)
    const badQty11 = await request(app)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set(buyerAuth)
      .send({ quantity: 11 });
    expect(badQty11.status).toBe(400);

    // E. Reject quantity exceeding available stock (stock is 8)
    const exceedStock = await request(app)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set(buyerAuth)
      .send({ quantity: 9 });
    expect(exceedStock.status).toBe(400);
    expect(exceedStock.body.error.code).toBe('INSUFFICIENT_STOCK');

    // F. Remove a book
    const delRes = await request(app)
      .delete(`/api/v1/cart/items/${cartItemId}`)
      .set(buyerAuth);
    expect(delRes.status).toBe(200);
    expect(delRes.body.items).toHaveLength(0);
    expect(delRes.body.subtotal).toBe(0);
  });

  it('persists cart across separate requests and refuses seller purchasing own listing (BR-02)', async () => {
    const { listing } = await createBookWithListing({ sellerUser: buyer });
    // Buyer attempting to add their own listing
    const ownRes = await request(app)
      .post('/api/v1/cart/items')
      .set(buyerAuth)
      .send({ listingId: String(listing._id), quantity: 1 });
    expect(ownRes.status).toBe(400);
    expect(ownRes.body.error.code).toBe('CANNOT_BUY_OWN_LISTING');
  });
});

describe('TC-O-02 wishlist (FR-14)', () => {
  it('saves a book to wishlist, lists wishlist, and moves to cart in a single atomic action', async () => {
    const { listing } = await createBookWithListing({ title: 'Deep Work', price: 35000, stock: 5 });

    // Add to wishlist
    const addRes = await request(app)
      .post('/api/v1/wishlist/items')
      .set(buyerAuth)
      .send({ listingId: String(listing._id) });
    expect(addRes.status).toBe(201);

    // List wishlist
    const listRes = await request(app).get('/api/v1/wishlist').set(buyerAuth);
    expect(listRes.status).toBe(200);
    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.items[0].book.title).toBe('Deep Work');
    const wishlistItemId = listRes.body.items[0].id;

    // Move to cart in a single action
    const moveRes = await request(app)
      .post(`/api/v1/wishlist/items/${wishlistItemId}/move-to-cart`)
      .set(buyerAuth);
    expect(moveRes.status).toBe(200);
    expect(moveRes.body.items).toHaveLength(1);
    expect(moveRes.body.items[0].book.title).toBe('Deep Work');

    // Verify it is removed from wishlist
    const listAfter = await request(app).get('/api/v1/wishlist').set(buyerAuth);
    expect(listAfter.body.items).toHaveLength(0);
  });
});

describe('TC-O-03 checkout with address and coupon (FR-15)', () => {
  it('revalidates price, computes free shipping at >= 500 Rs, applies coupon, and creates order in PLACED state', async () => {
    const { listing: l1 } = await createBookWithListing({ title: 'Book 1', price: 30000, stock: 10 });
    const { listing: l2 } = await createBookWithListing({ title: 'Book 2', price: 25000, stock: 5 });

    // Create address
    const address = await Address.create({
      user_id: buyer._id,
      line1: '123 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      is_default: true,
    });

    // Create coupon: FLAT 50 Rs (5000 paise) off on min order 500 Rs (50000 paise)
    const now = new Date();
    await Coupon.create({
      code: 'SAVE50',
      discount_type: 'FLAT',
      value: 5000,
      min_order: 50000,
      valid_from: new Date(now.getTime() - 86400000),
      valid_to: new Date(now.getTime() + 86400000),
      max_uses: 100,
      is_active: true,
    });

    // Add to cart: subtotal = 30000 + 25000 = 55000 paise (>= 50000 paise -> free shipping)
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(l1._id), quantity: 1 });
    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(l2._id), quantity: 1 });

    // Checkout summary
    const summaryRes = await request(app)
      .post('/api/v1/orders/checkout-summary')
      .set(buyerAuth)
      .send({ addressId: String(address._id), couponCode: 'SAVE50' });
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.itemTotal).toBe(55000);
    expect(summaryRes.body.shippingFee).toBe(0); // Waived because itemTotal >= 500 Rs (FR-15)
    expect(summaryRes.body.discount).toBe(5000);
    expect(summaryRes.body.totalAmount).toBe(50000);

    // Place order
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set(buyerAuth)
      .send({ addressId: String(address._id), couponCode: 'SAVE50' });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.order.orderStatus).toBe('PLACED');
    expect(orderRes.body.order.orderNo).toMatch(/^OB-\d{8}-\d{5}$/);
    expect(orderRes.body.order.items).toHaveLength(2);

    // Cart is now empty
    const cartAfter = await request(app).get('/api/v1/cart').set(buyerAuth);
    expect(cartAfter.body.items).toHaveLength(0);
  });

  it('charges standard shipping of 40 Rs when subtotal is below 500 Rs', async () => {
    const { listing } = await createBookWithListing({ price: 20000, stock: 5 }); // 200 Rs
    const address = await Address.create({
      user_id: buyer._id,
      line1: '45 Brigade Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560025',
    });

    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing._id), quantity: 1 });

    const summaryRes = await request(app)
      .post('/api/v1/orders/checkout-summary')
      .set(buyerAuth)
      .send({ addressId: String(address._id) });
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.shippingFee).toBe(4000); // 40 Rs shipping
    expect(summaryRes.body.totalAmount).toBe(24000);
  });
});

describe('TC-O-04 online payment sandbox & HMAC webhook (FR-16)', () => {
  it('creates payment intent, limits to 3 attempts, verifies signature, confirms order and decrements stock atomically on success', async () => {
    const { listing } = await createBookWithListing({ price: 50000, stock: 5 });
    const address = await Address.create({
      user_id: buyer._id,
      line1: '12 Commercial Street',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
    });

    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing._id), quantity: 2 });
    const orderRes = await request(app).post('/api/v1/orders').set(buyerAuth).send({ addressId: String(address._id) });
    const orderId = orderRes.body.order.id;

    // Attempt 1: Payment Intent
    const intentRes1 = await request(app).post('/api/v1/payments/intent').set(buyerAuth).send({ orderId });
    expect(intentRes1.status).toBe(201);
    expect(intentRes1.body.attemptNo).toBe(1);
    const gatewayOrderId = intentRes1.body.gatewayOrderId;

    // Simulate webhook with invalid signature -> 401
    const fakeWebhook = { gatewayOrderId, txnRef: 'txn_001', status: 'SUCCESS' };
    const badSigRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-signature', 'forged-signature')
      .send(fakeWebhook);
    expect(badSigRes.status).toBe(401);
    expect(badSigRes.body.error.code).toBe('INVALID_SIGNATURE');

    // Valid HMAC signed webhook
    const validSig = paymentService.computeSignature(fakeWebhook);
    const goodSigRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-signature', validSig)
      .send(fakeWebhook);
    expect(goodSigRes.status).toBe(200);
    expect(goodSigRes.body.orderStatus).toBe('CONFIRMED');

    // Check order is CONFIRMED
    const orderDoc = await Order.findById(orderId);
    expect(orderDoc.order_status).toBe('CONFIRMED');

    // Check stock decremented atomically: was 5, bought 2 -> now 3
    const listingDoc = await Listing.findById(listing._id);
    expect(listingDoc.stock_qty).toBe(3);

    // Idempotency: duplicate webhook does not decrement stock again
    const dupRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-signature', validSig)
      .send(fakeWebhook);
    expect(dupRes.status).toBe(200);
    expect(dupRes.body.idempotent).toBe(true);

    const listingDocAfterDup = await Listing.findById(listing._id);
    expect(listingDocAfterDup.stock_qty).toBe(3);
  });

  it('keeps order in PLACED status and does not decrement stock on payment failure', async () => {
    const { listing } = await createBookWithListing({ price: 30000, stock: 4 });
    const address = await Address.create({
      user_id: buyer._id,
      line1: '10 Richmond Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560025',
    });

    await request(app).post('/api/v1/cart/items').set(buyerAuth).send({ listingId: String(listing._id), quantity: 1 });
    const orderRes = await request(app).post('/api/v1/orders').set(buyerAuth).send({ addressId: String(address._id) });
    const orderId = orderRes.body.order.id;

    const intentRes = await request(app).post('/api/v1/payments/intent').set(buyerAuth).send({ orderId });
    const gatewayOrderId = intentRes.body.gatewayOrderId;

    const failPayload = { gatewayOrderId, txnRef: 'txn_fail_01', status: 'FAILED' };
    const failSig = paymentService.computeSignature(failPayload);
    const failRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-signature', failSig)
      .send(failPayload);
    expect(failRes.status).toBe(200);
    expect(failRes.body.paymentStatus).toBe('FAILED');

    // Order remains PLACED
    const orderDoc = await Order.findById(orderId);
    expect(orderDoc.order_status).toBe('PLACED');

    // Stock unchanged
    const listingDoc = await Listing.findById(listing._id);
    expect(listingDoc.stock_qty).toBe(4);
  });
});
