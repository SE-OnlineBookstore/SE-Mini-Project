const orderService = require('../services/orderService');
const invoiceService = require('../services/invoiceService');

module.exports = {
  // S3-02: Retrieve order items for the logged-in seller.
  getSellerOrders: async (req, res) => {
    const result = await orderService.getSellerOrders(req.user.id, req.query);
    res.status(200).json(result);
  },
  checkoutSummary: async (req, res) => res.json(await orderService.getCheckoutSummary(req.user.id, req.body)),
  createOrder: async (req, res) => res.status(201).json(await orderService.createOrder(req.user.id, req.body)),
  listOrders: async (req, res) => res.json(await orderService.listOrders(req.user.id)),
  getOrder: async (req, res) => res.json({ order: await orderService.getOrder(req.user.id, req.params.id) }),
  getOrderTracking: async (req, res) => res.json(await orderService.getOrderTracking(req.user.id, req.params.id)),
  cancelOrder: async (req, res) => res.json(await orderService.cancelOrder(req.user.id, req.params.id, req.body)),
  returnOrder: async (req, res) => res.json(await orderService.returnOrder(req.user.id, req.params.id, req.body)),
  downloadInvoice: async (req, res) => {
    const { pdfBuffer, orderNo } = await invoiceService.getOrderInvoicePdf(req.user.id, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${orderNo}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  },
};
