// SR-09 / NFR-08 audit trail: record, list, filtering, paging and the failure path.
const mongoose = require('mongoose');
const db = require('../helpers/db');
const auditService = require('../../services/auditService');
const { AuditLog } = require('../../models');

beforeAll(db.start);
afterEach(db.clear);
afterAll(db.stop);

const actorId = () => new mongoose.Types.ObjectId();

describe('auditService.record', () => {
  it('writes an entry and stores the target id as a string', async () => {
    const actor = actorId();
    await auditService.record({ actorId: actor, action: 'LISTING_BLOCKED', targetType: 'listing', targetId: 12345, reason: 'Counterfeit', requestId: 'req-1' });
    const saved = await AuditLog.findOne({ action: 'LISTING_BLOCKED' }).lean();
    expect(saved).toMatchObject({ target_type: 'listing', target_id: '12345', reason: 'Counterfeit', request_id: 'req-1' });
    expect(String(saved.actor_id)).toBe(String(actor));
    expect(saved.created_at).toBeInstanceOf(Date);
  });

  it('rethrows when the write fails, so a caller never loses an audit entry silently', async () => {
    await expect(auditService.record({ actorId: actorId(), action: 'ACCESS_DENIED', targetId: 'x' })).rejects.toThrow();
    expect(await AuditLog.countDocuments()).toBe(0);
  });
});

describe('auditService.list', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await AuditLog.create({ action: i % 2 ? 'ACCESS_DENIED' : 'USER_BLOCKED', target_type: 'user', target_id: `t${i}`, created_at: new Date(2026, 10, i) });
    }
  });

  it('returns newest first with paging totals', async () => {
    const res = await auditService.list();
    expect(res).toMatchObject({ page: 1, limit: 50, total: 5 });
    expect(res.items.map((x) => x.target_id)).toEqual(['t5', 't4', 't3', 't2', 't1']);
  });

  it('pages through results', async () => {
    const res = await auditService.list({ page: 2, limit: 2 });
    expect(res.items.map((x) => x.target_id)).toEqual(['t3', 't2']);
    expect(res.total).toBe(5);
  });

  it('filters by action and counts only matching entries', async () => {
    const res = await auditService.list({ action: 'USER_BLOCKED' });
    expect(res.total).toBe(2);
    expect(res.items.every((x) => x.action === 'USER_BLOCKED')).toBe(true);
  });
});

describe('append-only design (SR-09)', () => {
  it('exposes no update or delete operation', () => {
    expect(Object.keys(auditService).sort()).toEqual(['list', 'record']);
    expect(Object.isFrozen(auditService)).toBe(true);
  });
});
