jest.mock('../../models', () => ({
  Order: { find: jest.fn() },
  User: { countDocuments: jest.fn() },
}));

jest.mock('../../config/env', () => ({
  commissionRate: 0.10,
}));

const { Order, User } = require('../../models');
const {
  parseMonth,
  getMonthlyAnalytics,
  toCsv,
} = require('../../services/analyticsService');

describe('FR-24 Monthly analytics service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('parses a valid month into UTC boundaries', () => {
    const result = parseMonth('2026-10');

    expect(result.start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(result.end.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  test.each(['2026-13', '2026-00', '2026-2', 'invalid', undefined])(
    'rejects invalid month: %s',
    (month) => {
      expect(() => parseMonth(month)).toThrow();
    },
  );

  test('calculates monthly analytics and excludes cancelled orders', async () => {
    Order.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { total_amount: 10000, order_status: 'DELIVERED' },
        { total_amount: 20000, order_status: 'PLACED' },
        { total_amount: 5000, order_status: 'CANCELLED' },
      ]),
    });
    User.countDocuments.mockResolvedValue(3);

    const result = await getMonthlyAnalytics('2026-10');

    expect(Order.find).toHaveBeenCalledWith({
      created_at: {
        $gte: new Date('2026-10-01T00:00:00.000Z'),
        $lt: new Date('2026-11-01T00:00:00.000Z'),
      },
    });

    expect(User.countDocuments).toHaveBeenCalledWith({
      created_at: {
        $gte: new Date('2026-10-01T00:00:00.000Z'),
        $lt: new Date('2026-11-01T00:00:00.000Z'),
      },
    });

    expect(result).toEqual({
      month: '2026-10',
      orders: 2,
      gmv: 30000,
      platformCommission: 3000,
      averageOrderValue: 15000,
      newUsers: 3,
    });
  });

  test('returns zero metrics when there are no orders or new users', async () => {
    Order.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    User.countDocuments.mockResolvedValue(0);

    await expect(getMonthlyAnalytics('2026-10')).resolves.toEqual({
      month: '2026-10',
      orders: 0,
      gmv: 0,
      platformCommission: 0,
      averageOrderValue: 0,
      newUsers: 0,
    });
  });

  test('formats report metrics as CSV', () => {
    const csv = toCsv({
      month: '2026-10',
      orders: 2,
      gmv: 30000,
      platformCommission: 3000,
      averageOrderValue: 15000,
      newUsers: 3,
    });

    expect(csv).toContain('"Month","2026-10"');
    expect(csv).toContain('"Orders","2"');
    expect(csv).toContain('"GMV","30000"');
    expect(csv).toContain('"Platform Commission","3000"');
    expect(csv).toContain('"Average Order Value","15000"');
    expect(csv).toContain('"New Users","3"');
  });
});
