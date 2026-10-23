const s = require('../../validators/checkout.schema');

describe('Checkout schema validation (FR-15)', () => {
  it('accepts a valid checkout payload with addressId and couponCode', () => {
    const valid = {
      addressId: '507f1f77bcf86cd799439011',
      couponCode: 'SAVE10',
    };
    expect(s.checkout.body.validate(valid).error).toBeUndefined();
  });

  it('accepts checkout payload without couponCode or with empty string', () => {
    expect(s.checkout.body.validate({ addressId: '507f1f77bcf86cd799439011' }).error).toBeUndefined();
    expect(s.checkout.body.validate({ addressId: '507f1f77bcf86cd799439011', couponCode: '' }).error).toBeUndefined();
  });

  it('rejects an invalid addressId', () => {
    expect(s.checkout.body.validate({ addressId: 'invalid' }).error).toBeDefined();
    expect(s.checkout.body.validate({}).error).toBeDefined();
  });

  it('validates coupon verification payload', () => {
    expect(s.validateCoupon.body.validate({ code: 'DISCOUNT20' }).error).toBeUndefined();
    expect(s.validateCoupon.body.validate({}).error).toBeDefined();
  });

  it('validates orderId param', () => {
    expect(s.orderId.params.validate({ id: '507f1f77bcf86cd799439011' }).error).toBeUndefined();
    expect(s.orderId.params.validate({ id: 'bad-id' }).error).toBeDefined();
  });
});
