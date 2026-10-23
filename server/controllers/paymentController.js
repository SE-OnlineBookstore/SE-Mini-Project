const paymentService = require('../services/paymentService');

module.exports = {
  createIntent: async (req, res) => res.status(201).json(await paymentService.createPaymentIntent(req.user.id, req.body)),
  webhook: async (req, res) => {
    const signature = req.get('x-signature') || req.get('x-razorpay-signature') || req.body.signature;
    const result = await paymentService.handleWebhook(req.body, signature);
    res.json(result);
  },
  simulate: async (req, res) => res.json(await paymentService.simulateSandboxPayment(req.user.id, req.body)),
  getStatus: async (req, res) => res.json(await paymentService.getPaymentStatus(req.user.id, req.params.orderId)),
};
