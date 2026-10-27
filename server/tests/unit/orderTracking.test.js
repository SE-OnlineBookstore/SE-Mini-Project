// Unit tests for Order Tracking, Cancellation, and Returns (FR-18, TC-O-06).
const orderService = require('../../services/orderService');
const Order = require('../../models/Order');
const OrderItem = require('../../models/OrderItem');
const Listing = require('../../models/Listing');
const Shipment = require('../../models/Shipment');

jest.mock('../../models/Order');
jest.mock('../../models/OrderItem');
jest.mock('../../models/Listing');
jest.mock('../../models/Shipment');
jest.mock('../../models/User');
jest.mock('../../services/notificationService', () => ({
  notify: jest.fn().mockResolvedValue(true),
}));

describe('TC-O-06 Order Tracking, Cancellation & Returns Unit Tests (FR-18)', () => {
  const buyerId = '64f1a2b3c4d5e6f7a8b9c0d1';
  const otherBuyerId = '64f1a2b3c4d5e6f7a8b9c0d2';
  const orderId = '64f1a2b3c4d5e6f7a8b9c0d3';
  const listingId = '64f1a2b3c4d5e6f7a8b9c0d4';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrderTracking', () => {
    test('exposes order lifecycle with timestamps and shipment information', async () => {
      const placedAt = new Date('2026-10-25T10:00:00Z');
      const confirmedAt = new Date('2026-10-25T10:05:00Z');
      const packedAt = new Date('2026-10-25T11:00:00Z');
      const shippedAt = new Date('2026-10-25T12:00:00Z');

      const mockOrder = {
        _id: orderId,
        order_no: 'OB-20261025-12345',
        buyer_id: buyerId,
        order_status: 'SHIPPED',
        created_at: placedAt,
        status_history: [
          { status: 'PLACED', at: placedAt },
          { status: 'CONFIRMED', at: confirmedAt },
          { status: 'PACKED', at: packedAt },
          { status: 'SHIPPED', at: shippedAt },
        ],
      };

      const mockItems = [
        {
          _id: 'item-1',
          listing_id: listingId,
          title: 'Design Patterns',
          quantity: 2,
          unit_price: 50000,
          item_status: 'SHIPPED',
        },
      ];

      const mockShipments = [
        {
          _id: 'shipment-1',
          order_id: orderId,
          order_item_id: 'item-1',
          courier: 'BlueDart Express',
          tracking_no: 'BD-987654321',
          dispatch_date: shippedAt,
        },
      ];

      Order.findOne.mockResolvedValue(mockOrder);
      OrderItem.find.mockResolvedValue(mockItems);
      Shipment.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockShipments),
      });

      const result = await orderService.getOrderTracking(buyerId, orderId);

      expect(result.orderNo).toBe('OB-20261025-12345');
      expect(result.orderStatus).toBe('SHIPPED');
      expect(result.statusHistory).toHaveLength(4);
      expect(result.isCancellable).toBe(false); // Dispatched, cannot cancel
      expect(result.isReturnable).toBe(false); // Not delivered yet
      expect(result.shipments).toHaveLength(1);
      expect(result.shipments[0].courier).toBe('BlueDart Express');
      expect(result.shipments[0].trackingNo).toBe('BD-987654321');
    });

    test('marks isCancellable=true before dispatch (PLACED, CONFIRMED, PACKED)', async () => {
      Order.findOne.mockResolvedValue({
        _id: orderId,
        order_no: 'OB-20261025-12345',
        order_status: 'CONFIRMED',
        status_history: [{ status: 'CONFIRMED', at: new Date() }],
      });
      OrderItem.find.mockResolvedValue([]);
      Shipment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

      const result = await orderService.getOrderTracking(buyerId, orderId);
      expect(result.isCancellable).toBe(true);
    });

    test('marks isReturnable=true for DELIVERED order within 7-day window', async () => {
      const deliveredDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      Order.findOne.mockResolvedValue({
        _id: orderId,
        order_no: 'OB-20261025-12345',
        order_status: 'DELIVERED',
        status_history: [{ status: 'DELIVERED', at: deliveredDate }],
      });
      OrderItem.find.mockResolvedValue([]);
      Shipment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

      const result = await orderService.getOrderTracking(buyerId, orderId);
      expect(result.isReturnable).toBe(true);
      expect(result.isCancellable).toBe(false);
    });

    test('marks isReturnable=false for DELIVERED order beyond 7-day window', async () => {
      const deliveredDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      Order.findOne.mockResolvedValue({
        _id: orderId,
        order_no: 'OB-20261025-12345',
        order_status: 'DELIVERED',
        status_history: [{ status: 'DELIVERED', at: deliveredDate }],
      });
      OrderItem.find.mockResolvedValue([]);
      Shipment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

      const result = await orderService.getOrderTracking(buyerId, orderId);
      expect(result.isReturnable).toBe(false);
    });

    test('rejects unknown order with 404 ORDER_NOT_FOUND', async () => {
      Order.findOne.mockResolvedValue(null);
      await expect(orderService.getOrderTracking(otherBuyerId, orderId)).rejects.toMatchObject({
        code: 'ORDER_NOT_FOUND',
      });
    });
  });

  describe('cancelOrder', () => {
    test('cancels order before dispatch and restores stock quantity', async () => {
      const mockOrder = {
        _id: orderId,
        order_no: 'OB-20261025-12345',
        buyer_id: buyerId,
        order_status: 'CONFIRMED',
        status_history: [{ status: 'CONFIRMED', at: new Date() }],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockItem = {
        listing_id: listingId,
        quantity: 3,
        item_status: 'CONFIRMED',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockListing = {
        _id: listingId,
        stock_qty: 2,
        status: 'ACTIVE',
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findOne.mockResolvedValue(mockOrder);
      OrderItem.find.mockResolvedValue([mockItem]);
      Listing.findById.mockResolvedValue(mockListing);

      const res = await orderService.cancelOrder(buyerId, orderId, { reason: 'Changed my mind' });

      expect(res.orderStatus).toBe('CANCELLED');
      expect(mockOrder.order_status).toBe('CANCELLED');
      expect(mockOrder.save).toHaveBeenCalled();
      expect(mockItem.item_status).toBe('CANCELLED');
      expect(mockItem.save).toHaveBeenCalled();
      expect(mockListing.stock_qty).toBe(5); // 2 + 3 restored
      expect(mockListing.save).toHaveBeenCalled();
    });

    test('reactivates OUT_OF_STOCK listing back to ACTIVE on cancel', async () => {
      const mockOrder = {
        _id: orderId,
        order_no: 'OB-20261025-12345',
        buyer_id: buyerId,
        order_status: 'PLACED',
        status_history: [{ status: 'PLACED', at: new Date() }],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockItem = {
        listing_id: listingId,
        quantity: 1,
        item_status: 'PLACED',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockListing = {
        _id: listingId,
        stock_qty: 0,
        status: 'OUT_OF_STOCK',
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findOne.mockResolvedValue(mockOrder);
      OrderItem.find.mockResolvedValue([mockItem]);
      Listing.findById.mockResolvedValue(mockListing);

      await orderService.cancelOrder(buyerId, orderId);

      expect(mockListing.stock_qty).toBe(1);
      expect(mockListing.status).toBe('ACTIVE');
    });

    test('refuses cancellation once dispatched (SHIPPED)', async () => {
      Order.findOne.mockResolvedValue({
        _id: orderId,
        order_status: 'SHIPPED',
      });

      await expect(orderService.cancelOrder(buyerId, orderId)).rejects.toMatchObject({
        code: 'CANNOT_CANCEL_DISPATCHED_ORDER',
      });
    });

    test('refuses cancellation on already cancelled order', async () => {
      Order.findOne.mockResolvedValue({
        _id: orderId,
        order_status: 'CANCELLED',
      });

      await expect(orderService.cancelOrder(buyerId, orderId)).rejects.toMatchObject({
        code: 'ORDER_ALREADY_CANCELLED',
      });
    });
  });

  describe('returnOrder', () => {
    test('accepts return request within seven days of delivery', async () => {
      const deliveredDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      const mockOrder = {
        _id: orderId,
        order_no: 'OB-20261025-12345',
        buyer_id: buyerId,
        order_status: 'DELIVERED',
        status_history: [{ status: 'DELIVERED', at: deliveredDate }],
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findOne.mockResolvedValue(mockOrder);
      OrderItem.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const res = await orderService.returnOrder(buyerId, orderId, { reason: 'Defective binding' });

      expect(res.orderStatus).toBe('RETURNED');
      expect(mockOrder.order_status).toBe('RETURNED');
      expect(mockOrder.save).toHaveBeenCalled();
      expect(OrderItem.updateMany).toHaveBeenCalledWith(
        { order_id: orderId },
        { $set: { item_status: 'RETURNED' } },
      );
    });

    test('refuses return request when order is not DELIVERED', async () => {
      Order.findOne.mockResolvedValue({
        _id: orderId,
        order_status: 'SHIPPED',
      });

      await expect(orderService.returnOrder(buyerId, orderId)).rejects.toMatchObject({
        code: 'ORDER_NOT_DELIVERED',
      });
    });

    test('refuses return request when beyond 7 days of delivery', async () => {
      const deliveredDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      Order.findOne.mockResolvedValue({
        _id: orderId,
        order_status: 'DELIVERED',
        status_history: [{ status: 'DELIVERED', at: deliveredDate }],
      });

      await expect(orderService.returnOrder(buyerId, orderId)).rejects.toMatchObject({
        code: 'RETURN_WINDOW_EXPIRED',
      });
    });

    test('refuses return request on already RETURNED order', async () => {
      Order.findOne.mockResolvedValue({
        _id: orderId,
        order_status: 'RETURNED',
      });

      await expect(orderService.returnOrder(buyerId, orderId)).rejects.toMatchObject({
        code: 'ORDER_ALREADY_RETURNED',
      });
    });
  });
});
