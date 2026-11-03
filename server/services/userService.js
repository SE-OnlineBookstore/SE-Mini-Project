// Profile and address book (FR-05). Every query is scoped to the caller (SR-06).
const User = require('../models/User');
const Address = require('../models/Address');
const Order = require('../models/Order');
const { E } = require('../utils/AppError');

const IN_FLIGHT = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED'];

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw E.notFound('USER_NOT_FOUND');
  return user.toPublic();
}

async function updateMe(userId, changes) {
  await User.updateOne({ _id: userId }, { $set: changes }, { runValidators: true });
  return getMe(userId);
}

async function listAddresses(userId) {
  const items = await Address.find({ user_id: userId }).sort({ is_default: -1, created_at: 1 });
  return { items: items.map((a) => a.toPublic()) };
}

async function addAddress(userId, dto) {
  const count = await Address.countDocuments({ user_id: userId });
  const makeDefault = dto.isDefault || count === 0;
  if (makeDefault) await Address.updateMany({ user_id: userId }, { $set: { is_default: false } });
  const { isDefault, ...fields } = dto;
  const address = await Address.create({ ...fields, user_id: userId, is_default: makeDefault });
  return address.toPublic();
}


async function updateAddress(userId, id, dto) {
  const address = await Address.findOne({ _id: id, user_id: userId });

  if (!address) {
    throw E.notFound('ADDRESS_NOT_FOUND', 'Address not found.');
  }

  const { isDefault, ...fields } = dto;

  if (isDefault === true) {
    await Address.updateMany(
      { user_id: userId, _id: { $ne: id } },
      { $set: { is_default: false } },
    );
    address.is_default = true;
  } else if (isDefault === false) {
    address.is_default = false;
  }

  Object.assign(address, fields);
  await address.save();

  return address.toPublic();
}


async function deleteAddress(userId, id) {
  const address = await Address.findOne({ _id: id, user_id: userId });
  if (!address) throw E.notFound('ADDRESS_NOT_FOUND', 'Address not found.');
  const remaining = await Address.countDocuments({ user_id: userId });
  if (remaining === 1) {
    const inFlight = await Order.exists({ address_id: id, order_status: { $in: IN_FLIGHT } });
    if (inFlight) throw E.conflict('ADDRESS_IN_USE', 'This address is used by an order that has not been delivered yet.');
  }
  await address.deleteOne();
  if (address.is_default) {
    const next = await Address.findOne({ user_id: userId }).sort({ created_at: 1 });
    if (next) await Address.updateOne({ _id: next._id }, { $set: { is_default: true } });
  }
}

module.exports = { getMe, updateMe, listAddresses, addAddress, updateAddress, deleteAddress };
