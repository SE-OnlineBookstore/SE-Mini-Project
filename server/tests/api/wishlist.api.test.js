// TC-O-02 wishlist and move-to-cart (FR-14; SRS 5.3.3).
const request = require('supertest');
const db = require('../helpers/db');
const { makeUser, login } = require('../helpers/factory');
const createApp = require('../../app');
const { Book, Listing, Category, Wishlist, Cart, CartItem } = require('../../models');

const app = createApp();

let buyer;
let buyerAuth;
let seller;
let sellerAuth;
let category;
let book;
let activeListing;
let outOfStockListing;

async function createBookWithListings() {
  category = await Category.create({ name: 'Fiction', slug: 'fiction' });
  book = await Book.create({
    isbn13: '9780140449136',
    title: 'The Count of Monte Cristo',
    author: 'Alexandre Dumas',
    publisher: 'Penguin Classics',
    category_id: category._id,
    language: 'English',
    mrp: 69900,
  });

  activeListing = await Listing.create({
    book_id: book._id,
    seller_id: seller._id,
    condition: 'GOOD',
    price: 39900,
    stock_qty: 5,
    status: 'ACTIVE',
  });

  outOfStockListing = await Listing.create({
    book_id: book._id,
    seller_id: seller._id,
    condition: 'LIKE_NEW',
    price: 49900,
    stock_qty: 0,
    status: 'OUT_OF_STOCK',
  });
}

beforeAll(db.start);
beforeEach(async () => {
  buyer = await makeUser('BUYER');
  buyerAuth = { Authorization: `Bearer ${(await login(app, buyer)).token}` };
  seller = await makeUser('SELLER');
  sellerAuth = { Authorization: `Bearer ${(await login(app, seller)).token}` };
  await createBookWithListings();
});
afterEach(db.clear);
afterAll(db.stop);

describe('TC-O-02 wishlist (FR-14)', () => {
  it('requires authentication and BUYER role', async () => {
    const unauth = await request(app).get('/api/v1/wishlist');
    expect(unauth.status).toBe(401);

    const asSeller = await request(app).get('/api/v1/wishlist').set(sellerAuth);
    expect(asSeller.status).toBe(403);
    expect(asSeller.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('allows a buyer to save a listing to their wishlist', async () => {
    const res = await request(app)
      .post('/api/v1/wishlist')
      .set(buyerAuth)
      .send({ listingId: String(activeListing._id) });

    expect(res.status).toBe(201);
    expect(res.body.item).toBeDefined();
    expect(res.body.item.listingId).toBe(String(activeListing._id));
    expect(res.body.item.book.title).toBe('The Count of Monte Cristo');
    expect(res.body.item.listing.price).toBe(39900);
    expect(res.body.item.listing.inStock).toBe(true);
  });

  it('handles duplicate additions idempotently without error', async () => {
    const first = await request(app)
      .post('/api/v1/wishlist')
      .set(buyerAuth)
      .send({ listingId: String(activeListing._id) });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/wishlist')
      .set(buyerAuth)
      .send({ listingId: String(activeListing._id) });
    expect(second.status).toBe(201);

    const count = await Wishlist.countDocuments({ buyer_id: buyer._id, listing_id: activeListing._id });
    expect(count).toBe(1);
  });

  it('allows a buyer to list their wishlist items and check item presence', async () => {
    await request(app)
      .post('/api/v1/wishlist')
      .set(buyerAuth)
      .send({ listingId: String(activeListing._id) });

    const listRes = await request(app).get('/api/v1/wishlist').set(buyerAuth);
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(1);
    expect(listRes.body.items[0].book.title).toBe('The Count of Monte Cristo');

    const checkPresent = await request(app)
      .get(`/api/v1/wishlist/check/${activeListing._id}`)
      .set(buyerAuth);
    expect(checkPresent.status).toBe(200);
    expect(checkPresent.body.inWishlist).toBe(true);

    const checkAbsent = await request(app)
      .get(`/api/v1/wishlist/check/${outOfStockListing._id}`)
      .set(buyerAuth);
    expect(checkAbsent.status).toBe(200);
    expect(checkAbsent.body.inWishlist).toBe(false);
  });

  it('allows a buyer to remove an item from the wishlist', async () => {
    const addRes = await request(app)
      .post('/api/v1/wishlist')
      .set(buyerAuth)
      .send({ listingId: String(activeListing._id) });

    const wishId = addRes.body.item.id;
    const delRes = await request(app).delete(`/api/v1/wishlist/${wishId}`).set(buyerAuth);
    expect(delRes.status).toBe(204);

    const listRes = await request(app).get('/api/v1/wishlist').set(buyerAuth);
    expect(listRes.body.total).toBe(0);
  });

  it('moves a wishlist item to cart in a single step (TC-O-02)', async () => {
    const addRes = await request(app)
      .post('/api/v1/wishlist')
      .set(buyerAuth)
      .send({ listingId: String(activeListing._id) });

    const wishId = addRes.body.item.id;

    // Move to cart
    const moveRes = await request(app)
      .post(`/api/v1/wishlist/${wishId}/move-to-cart`)
      .set(buyerAuth);

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.message).toContain('moved to cart');

    // Wishlist should now be empty
    const wishList = await request(app).get('/api/v1/wishlist').set(buyerAuth);
    expect(wishList.body.total).toBe(0);

    // Cart should now contain the item with quantity 1 and current price
    const cart = await Cart.findOne({ buyer_id: buyer._id });
    expect(cart).toBeDefined();
    const cartItems = await CartItem.find({ cart_id: cart._id });
    expect(cartItems).toHaveLength(1);
    expect(String(cartItems[0].listing_id)).toBe(String(activeListing._id));
    expect(cartItems[0].quantity).toBe(1);
    expect(cartItems[0].price_at_add).toBe(39900);
  });

  it('refuses move-to-cart for an out-of-stock item and preserves the wishlist entry', async () => {
    const addRes = await request(app)
      .post('/api/v1/wishlist')
      .set(buyerAuth)
      .send({ listingId: String(outOfStockListing._id) });

    const wishId = addRes.body.item.id;

    const moveRes = await request(app)
      .post(`/api/v1/wishlist/${wishId}/move-to-cart`)
      .set(buyerAuth);

    expect(moveRes.status).toBe(400);
    expect(moveRes.body.error.code).toBe('OUT_OF_STOCK');

    // Wishlist item remains
    const wishList = await request(app).get('/api/v1/wishlist').set(buyerAuth);
    expect(wishList.body.total).toBe(1);
  });

  it('never allows a buyer to access or move another buyer\'s wishlist items (SR-06)', async () => {
    const otherBuyer = await makeUser('BUYER');
    const otherAuth = { Authorization: `Bearer ${(await login(app, otherBuyer)).token}` };

    const addRes = await request(app)
      .post('/api/v1/wishlist')
      .set(otherAuth)
      .send({ listingId: String(activeListing._id) });

    const otherWishId = addRes.body.item.id;

    // Attempt delete by first buyer
    const delRes = await request(app).delete(`/api/v1/wishlist/${otherWishId}`).set(buyerAuth);
    expect(delRes.status).toBe(404);

    // Attempt move-to-cart by first buyer
    const moveRes = await request(app).post(`/api/v1/wishlist/${otherWishId}/move-to-cart`).set(buyerAuth);
    expect(moveRes.status).toBe(404);
  });

  it('rejects adding a non-existent listing', async () => {
    const res = await request(app)
      .post('/api/v1/wishlist')
      .set(buyerAuth)
      .send({ listingId: '507f1f77bcf86cd799439011' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LISTING_NOT_FOUND');
  });

  it('returns 404 when deleting a non-existent wishlist item', async () => {
    const res = await request(app)
      .delete('/api/v1/wishlist/507f1f77bcf86cd799439011')
      .set(buyerAuth);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('WISHLIST_ITEM_NOT_FOUND');
  });

  it('increments quantity when moving an item already in cart', async () => {
    // Seed existing item in cart
    const cart = await Cart.create({ buyer_id: buyer._id });
    await CartItem.create({
      cart_id: cart._id,
      listing_id: activeListing._id,
      quantity: 1,
      price_at_add: activeListing.price,
    });

    // Add to wishlist
    const wishRes = await request(app)
      .post('/api/v1/wishlist')
      .set(buyerAuth)
      .send({ listingId: String(activeListing._id) });

    // Move to cart again
    const moveRes = await request(app)
      .post(`/api/v1/wishlist/${wishRes.body.item.id}/move-to-cart`)
      .set(buyerAuth);
    expect(moveRes.status).toBe(200);

    const cartItems = await CartItem.find({ cart_id: cart._id });
    expect(cartItems[0].quantity).toBe(2);
  });
});
