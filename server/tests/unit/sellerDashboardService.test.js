
jest.mock('../../models', () => ({
  Order: {
    find: jest.fn(),
  },
  OrderItem: {
    find: jest.fn(),
  },
}));

const { Order, OrderItem } = require('../../models');
const {
  getDashboard,
  parseDateRange,
} = require('../../services/sellerDashboardService');

describe('Seller dashboard service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseDateRange', () => {
    test('accepts a valid date range', () => {
      const result = parseDateRange('2026-10-01', '2026-10-26');

      expect(result.start.toISOString()).toBe(
        '2026-10-01T00:00:00.000Z',
      );
      expect(result.end.toISOString()).toBe(
        '2026-10-27T00:00:00.000Z',
      );
    });

    test('rejects missing dates', () => {
      expect(() => parseDateRange(undefined, '2026-10-26')).toThrow();
    });

    test('rejects an invalid date', () => {
      expect(() => parseDateRange('2026-02-30', '2026-03-01')).toThrow();
    });

    test('rejects a start date after the end date', () => {
      expect(() => parseDateRange('2026-10-27', '2026-10-01')).toThrow();
    });
  });

  describe('getDashboard', () => {
    test('returns seller-specific sales totals and order summaries', async () => {
      const sellerId = 'seller-123';
      const orderId = 'order-123';

      const order = {
        _id: orderId,
        order_no: 'ORD-001',
        created_at: new Date('2026-10-10T12:00:00.000Z'),
        order_status: 'DELIVERED',
      };

      const items = [
        {
          order_id: orderId,
          seller_id: sellerId,
          quantity: 2,
          unit_price: 100,
          item_status: 'DELIVERED',
        },
        {
          order_id: orderId,
          seller_id: sellerId,
          quantity: 1,
          unit_price: 50,
          item_status: 'RETURNED',
        },
      ];

      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([order]),
        }),
      });

      OrderItem.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(items),
      });

      const result = await getDashboard(
        sellerId,
        '2026-10-01',
        '2026-10-31',
      );

      expect(OrderItem.find).toHaveBeenCalledWith(
        expect.objectContaining({
          seller_id: sellerId,
          order_id: { $in: [orderId] },
        }),
      );

      expect(result.summary).toMatchObject({
        unitsSold: 3,
        grossRevenue: 250,
        returnedUnits: 1,
        returnedRevenue: 50,
        commission: null,
        netSettlement: null,
      });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0]).toMatchObject({
        orderId,
        orderNo: 'ORD-001',
        units: 3,
        grossRevenue: 250,
        returnedRevenue: 50,
      });
    });

    test('returns zero totals when there are no orders', async () => {
      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await getDashboard(
        'seller-123',
        '2026-10-01',
        '2026-10-31',
      );

      expect(OrderItem.find).not.toHaveBeenCalled();
      expect(result.summary.unitsSold).toBe(0);
      expect(result.summary.grossRevenue).toBe(0);
      expect(result.summary.returnedUnits).toBe(0);
      expect(result.summary.returnedRevenue).toBe(0);
      expect(result.orders).toEqual([]);
    });
  });
});
