const s = require('../../validators/wishlist.schema');

describe('Wishlist schema validation (FR-14)', () => {
  it('accepts a valid 24-character hexadecimal ObjectId for listingId', () => {
    const valid = { listingId: '507f1f77bcf86cd799439011' };
    expect(s.addWishlist.body.validate(valid).error).toBeUndefined();
  });

  it('rejects an invalid listingId', () => {
    expect(s.addWishlist.body.validate({ listingId: 'invalid-id' }).error).toBeDefined();
    expect(s.addWishlist.body.validate({ listingId: '123' }).error).toBeDefined();
    expect(s.addWishlist.body.validate({}).error).toBeDefined();
  });

  it('rejects unknown fields on addWishlist body (SR-07)', () => {
    const withExtra = { listingId: '507f1f77bcf86cd799439011', extraField: 'hacked' };
    expect(s.addWishlist.body.validate(withExtra).error).toBeDefined();
  });

  it('validates id param for wishlist removal and move-to-cart', () => {
    expect(s.wishlistParam.params.validate({ id: '507f1f77bcf86cd799439011' }).error).toBeUndefined();
    expect(s.wishlistParam.params.validate({ id: 'bad-id' }).error).toBeDefined();
  });

  it('validates listingId param for wishlist check', () => {
    expect(s.checkWishlist.params.validate({ listingId: '507f1f77bcf86cd799439011' }).error).toBeUndefined();
    expect(s.checkWishlist.params.validate({ listingId: 'bad-id' }).error).toBeDefined();
  });
});
