// FR-05 profile and address book at service level; SR-06 every query is scoped to the caller.
const mongoose = require('mongoose');
const db = require('../helpers/db');
const { makeUser } = require('../helpers/factory');
const userService = require('../../services/userService');
const { Address, Order } = require('../../models');

beforeAll(db.start);
afterEach(db.clear);
afterAll(db.stop);

const dto = (over = {}) => ({ line1: '12 Ring Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560085', ...over });
const newId = () => new mongoose.Types.ObjectId();

describe('profile', () => {
  it('returns the public profile and never the password hash', async () => {
    const user = await makeUser('BUYER');
    const me = await userService.getMe(user._id);
    expect(me.email).toBe(user.email);
    expect(JSON.stringify(me)).not.toMatch(/password/i);
  });

  it('throws USER_NOT_FOUND for an unknown id', async () => {
    await expect(userService.getMe(newId())).rejects.toMatchObject({ code: 'USER_NOT_FOUND', status: 404 });
  });

  it('updates the name and returns the new profile', async () => {
    const user = await makeUser('BUYER');
    const me = await userService.updateMe(user._id, { name: 'Asha R' });
    expect(me.name).toBe('Asha R');
  });
});

describe('address book', () => {
  it('lists the default address first', async () => {
    const user = await makeUser('BUYER');
    await userService.addAddress(user._id, dto({ city: 'Mysuru' }));
    await userService.addAddress(user._id, dto({ city: 'Hubballi', isDefault: true }));
    const { items } = await userService.listAddresses(user._id);
    expect(items.map((a) => a.city)).toEqual(['Hubballi', 'Mysuru']);
    expect(items[0].isDefault).toBe(true);
  });

  it('updates fields on an owned address', async () => {
    const user = await makeUser('BUYER');
    const a = await userService.addAddress(user._id, dto());
    const updated = await userService.updateAddress(user._id, a.id, { city: 'Mangaluru', line2: 'Near market' });
    expect(updated).toMatchObject({ city: 'Mangaluru', line2: 'Near market' });
  });

  it('moves the default to another address and clears it from the rest', async () => {
    const user = await makeUser('BUYER');
    const first = await userService.addAddress(user._id, dto());
    const second = await userService.addAddress(user._id, dto({ city: 'Mysuru' }));
    const res = await userService.updateAddress(user._id, second.id, { isDefault: true });
    expect(res.isDefault).toBe(true);
    expect((await Address.findById(first.id)).is_default).toBe(false);
  });

  it('can clear the default flag on an address', async () => {
    const user = await makeUser('BUYER');
    const a = await userService.addAddress(user._id, dto());
    const res = await userService.updateAddress(user._id, a.id, { isDefault: false });
    expect(res.isDefault).toBe(false);
  });

  it('throws ADDRESS_NOT_FOUND when updating or deleting an address that is not the caller\'s (SR-06)', async () => {
    const owner = await makeUser('BUYER');
    const other = await makeUser('BUYER');
    const a = await userService.addAddress(owner._id, dto());
    await expect(userService.updateAddress(other._id, a.id, { city: 'X' })).rejects.toMatchObject({ code: 'ADDRESS_NOT_FOUND', status: 404 });
    await expect(userService.deleteAddress(other._id, a.id)).rejects.toMatchObject({ code: 'ADDRESS_NOT_FOUND', status: 404 });
    expect(await Address.countDocuments({ user_id: owner._id })).toBe(1);
  });

  it('makes the oldest remaining address the default when the default is deleted', async () => {
    const user = await makeUser('BUYER');
    const first = await userService.addAddress(user._id, dto({ city: 'Mysuru' }));
    const second = await userService.addAddress(user._id, dto({ city: 'Hubballi' }));
    const third = await userService.addAddress(user._id, dto({ city: 'Mangaluru', isDefault: true }));
    await userService.deleteAddress(user._id, third.id);
    expect((await Address.findById(first.id)).is_default).toBe(true);
    expect((await Address.findById(second.id)).is_default).toBe(false);
    expect(await Address.countDocuments({ user_id: user._id })).toBe(2);
  });

  it('allows deleting the last address when its orders are already delivered', async () => {
    const user = await makeUser('BUYER');
    const a = await userService.addAddress(user._id, dto());
    await Order.create({ order_no: 'OB-20261106-00001', buyer_id: user._id, address_id: a.id, order_status: 'DELIVERED', item_total: 45000, shipping_fee: 4000, total_amount: 49000 });
    await userService.deleteAddress(user._id, a.id);
    expect(await Address.countDocuments({ user_id: user._id })).toBe(0);
  });

  it('refuses to delete the last address while an order is in flight (ADDRESS_IN_USE)', async () => {
    const user = await makeUser('BUYER');
    const a = await userService.addAddress(user._id, dto());
    await Order.create({ order_no: 'OB-20261106-00002', buyer_id: user._id, address_id: a.id, order_status: 'SHIPPED', item_total: 45000, shipping_fee: 4000, total_amount: 49000 });
    await expect(userService.deleteAddress(user._id, a.id)).rejects.toMatchObject({ code: 'ADDRESS_IN_USE', status: 409 });
    expect(await Address.countDocuments({ user_id: user._id })).toBe(1);
  });
});
