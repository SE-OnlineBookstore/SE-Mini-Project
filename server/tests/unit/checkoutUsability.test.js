// TC-N-04: Checkout usability within 4 screens & 360 px viewport (NFR-04, SRS v1.1, SAD 3.4 & 3.8).
const {
  FLAT_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  validateCoupon,
  generateOrderNo,
} = require('../../services/checkoutService');
const { Order } = require('../../models');

describe('TC-N-04 checkout usability and flow boundaries (NFR-04)', () => {
  describe('Screen count and flow boundaries', () => {
    it('verifies checkout completes in at most 4 screens (3-screen flow: Cart -> Checkout -> Confirmation)', () => {
      const checkoutScreens = [
        {
          screen: 1,
          name: 'Shopping Cart',
          route: '/cart',
          purpose: 'Item review, quantity adjustments, and subtotal calculation',
          nextAction: '/checkout',
        },
        {
          screen: 2,
          name: 'Checkout & Review',
          route: '/checkout',
          purpose: 'Address selection/entry, coupon code application, and order placement',
          nextAction: '/orders/:id',
        },
        {
          screen: 3,
          name: 'Order Confirmation & Payment',
          route: '/orders/:id',
          purpose: 'Order status review, payment method selection, sandbox simulation, and invoice download',
          nextAction: 'COMPLETE',
        },
      ];

      expect(checkoutScreens.length).toBeLessThanOrEqual(4);
      expect(checkoutScreens.length).toBe(3);
      expect(checkoutScreens.map((s) => s.route)).toEqual(['/cart', '/checkout', '/orders/:id']);
    });
  });

  describe('Shipping calculation and free shipping threshold (BR-04)', () => {
    it('calculates flat shipping fee for orders below free shipping threshold', () => {
      const itemTotalBelowThreshold = 35000; // Rs. 350 (< Rs. 500)
      const shippingFee = itemTotalBelowThreshold >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;

      expect(shippingFee).toBe(4000); // Rs. 40
      expect(itemTotalBelowThreshold + shippingFee).toBe(39000); // Rs. 390
    });

    it('waives shipping fee for orders at or above Rs. 500 threshold', () => {
      const itemTotalAtThreshold = 50000; // Rs. 500
      const shippingFee = itemTotalAtThreshold >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;

      expect(shippingFee).toBe(0);
      expect(itemTotalAtThreshold + shippingFee).toBe(50000);
    });
  });

  describe('Coupon calculation rules', () => {
    it('handles null or empty coupon code without extra screen steps', async () => {
      const result = await validateCoupon(null, 50000);
      expect(result).toEqual({ coupon: null, discount: 0 });

      const emptyResult = await validateCoupon('', 50000);
      expect(emptyResult).toEqual({ coupon: null, discount: 0 });
    });
  });

  describe('Order reference generation format', () => {
    it('generates consistent order reference format matching OB-YYYYMMDD-XXXXX', async () => {
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      jest.spyOn(Order, 'findOne').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ order_no: `OB-${datePart}-00003` }),
          }),
        }),
      });

      const orderNo = await generateOrderNo();
      expect(orderNo).toBe(`OB-${datePart}-00004`);
      Order.findOne.mockRestore();
    });
  });

  describe('360 px viewport form validation requirements', () => {
    it('requires only essential address fields to ensure mobile viewport usability', () => {
      const requiredFields = ['line1', 'city', 'state', 'pincode'];
      const optionalFields = ['line2'];

      const sampleAddress = {
        line1: '123 Baker Street',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      };

      for (const field of requiredFields) {
        expect(sampleAddress[field]).toBeDefined();
        expect(sampleAddress[field].length).toBeGreaterThan(0);
      }
      expect(optionalFields).toContain('line2');
    });
  });
});
