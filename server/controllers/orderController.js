const orderService = require('../services/orderService');
const invoiceService = require('../services/invoiceService');

module.exports = {
  checkoutSummary: async (req, res) => res.json(await orderService.getCheckoutSummary(req.user.id, req.body)),
  createOrder: async (req, res) => res.status(201).json(await orderService.createOrder(req.user.id, req.body)),
  listOrders: async (req, res) => res.json(await orderService.listOrders(req.user.id)),
  getOrder: async (req, res) => res.json({ order: await orderService.getOrder(req.user.id, req.params.id) }),
  downloadInvoice: async (req, res) => {
    const { pdfBuffer, orderNo } = await invoiceService.getOrderInvoicePdf(req.user.id, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${orderNo}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  },
};
