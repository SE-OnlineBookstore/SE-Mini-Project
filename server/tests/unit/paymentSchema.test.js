const s = require('../../validators/payment.schema');

describe('Payment schema validation (FR-16)', () => {
  describe('intent schema', () => {
    it('accepts valid orderId', () => {
      expect(s.intent.body.validate({ orderId: '507f1f77bcf86cd799439011' }).error).toBeUndefined();
    });

    it('rejects missing or invalid orderId', () => {
      expect(s.intent.body.validate({}).error).toBeDefined();
      expect(s.intent.body.validate({ orderId: 'invalid-id' }).error).toBeDefined();
      expect(s.intent.body.validate({ orderId: 12345 }).error).toBeDefined();
    });
  });

  describe('webhook schema', () => {
    it('accepts valid webhook payload', () => {
      const valid = {
        gatewayOrderId: 'gw_ord_12345',
        txnRef: 'txn_12345',
        status: 'SUCCESS',
        amount: 50000,
        method: 'UPI',
      };
      expect(s.webhook.body.validate(valid).error).toBeUndefined();
    });

    it('allows unknown fields from gateway callback', () => {
      const payload = {
        gatewayOrderId: 'gw_ord_12345',
        txnRef: 'txn_12345',
        status: 'SUCCESS',
        gateway_signature: 'abc123xyz',
        bank_ref_num: '987654321',
      };
      expect(s.webhook.body.validate(payload).error).toBeUndefined();
    });

    it('rejects invalid status', () => {
      const invalid = {
        gatewayOrderId: 'gw_ord_12345',
        txnRef: 'txn_12345',
        status: 'PENDING',
      };
      expect(s.webhook.body.validate(invalid).error).toBeDefined();
    });

    it('rejects missing required fields', () => {
      expect(s.webhook.body.validate({ gatewayOrderId: 'gw_1' }).error).toBeDefined();
      expect(s.webhook.body.validate({ txnRef: 'txn_1' }).error).toBeDefined();
    });
  });

  describe('simulate schema', () => {
    it('accepts valid simulate payload with paymentId or orderId', () => {
      expect(s.simulate.body.validate({ paymentId: '507f1f77bcf86cd799439011' }).error).toBeUndefined();
      expect(s.simulate.body.validate({ orderId: '507f1f77bcf86cd799439011', status: 'FAILED' }).error).toBeUndefined();
      expect(s.simulate.body.validate({ orderId: '507f1f77bcf86cd799439011', method: 'CARD' }).error).toBeUndefined();
    });

    it('rejects when neither paymentId nor orderId is provided', () => {
      expect(s.simulate.body.validate({ status: 'SUCCESS' }).error).toBeDefined();
    });
  });

  describe('orderId schema', () => {
    it('validates orderId param', () => {
      expect(s.orderId.params.validate({ orderId: '507f1f77bcf86cd799439011' }).error).toBeUndefined();
      expect(s.orderId.params.validate({ orderId: 'bad' }).error).toBeDefined();
    });
  });
});
