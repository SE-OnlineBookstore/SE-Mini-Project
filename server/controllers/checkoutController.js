const checkoutService = require('../services/checkoutService');

module.exports = {
  preview: async (req, res) => res.json(await checkoutService.previewCheckout(req.user.id, req.query)),
  checkout: async (req, res) => res.status(201).json(await checkoutService.checkout(req.user.id, req.body)),
  validateCoupon: async (req, res) => {
    const preview = await checkoutService.previewCheckout(req.user.id, { couponCode: req.body.code });
    res.json({
      coupon: preview.coupon,
      discount: preview.discount,
      payableAmount: preview.payableAmount,
      shippingFee: preview.shippingFee,
      itemTotal: preview.itemTotal,
    });
  },
  getOrder: async (req, res) => res.json(await checkoutService.getOrder(req.user.id, req.params.id)),
  listOrders: async (req, res) => res.json(await checkoutService.listOrders(req.user.id)),
};
