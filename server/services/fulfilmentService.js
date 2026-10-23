const OrderItem = require('../models/OrderItem');
const Order = require('../models/Order');
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const { E } = require('../utils/AppError');
const notificationService = require('./notificationService');

const TRANSITIONS = {
  accept: { from: 'PLACED', to: 'CONFIRMED', notification: 'ORDER_CONFIRMED' },
  pack: { from: 'CONFIRMED', to: 'PACKED', notification: 'ORDER_PACKED' },
  dispatch: { from: 'PACKED', to: 'SHIPPED', notification: 'ORDER_SHIPPED' },
};

async function transitionItem(sellerId, itemId, action, shipmentDetails = {}) {
  const transition = TRANSITIONS[action];
  if (!transition) {
    throw E.badRequest('INVALID_FULFILMENT_ACTION', 'Unsupported fulfilment action.');
  }

  const item = await OrderItem.findOne({ _id: itemId, seller_id: sellerId });
  if (!item) {
    throw E.notFound('ORDER_ITEM_NOT_FOUND', 'Order item not found.');
  }

  if (item.item_status !== transition.from) {
    throw E.conflict(
      'INVALID_STATUS_TRANSITION',
      `Cannot ${action} an item with status ${item.item_status}.`,
    );
  }

  let shipment = null;

  if (action === 'dispatch') {
    const courier = String(shipmentDetails.courier || '').trim();
    const trackingNo = String(shipmentDetails.trackingNo || '').trim();

    if (!courier || courier.length > 60 || !trackingNo || trackingNo.length > 40) {
      throw E.badRequest(
        'INVALID_SHIPMENT_DETAILS',
        'A courier (up to 60 characters) and tracking number (up to 40 characters) are required.',
      );
    }

    shipment = await Shipment.create({
      order_id: item.order_id,
      order_item_id: item._id,
      courier,
      tracking_no: trackingNo,
      dispatch_date: new Date(),
    });
  }

  item.item_status = transition.to;
  await item.save();

  const order = await Order.findById(item.order_id);
  if (order) {
    const items = await OrderItem.find({ order_id: order._id });
    const statuses = items.map((entry) => entry.item_status);

    if (statuses.every((status) => status === 'SHIPPED' || status === 'DELIVERED')) {
      order.order_status = 'SHIPPED';
    } else if (statuses.every((status) => status === 'PACKED' || status === 'SHIPPED' || status === 'DELIVERED')) {
      order.order_status = 'PACKED';
    } else if (statuses.every((status) => status !== 'PLACED')) {
      order.order_status = 'CONFIRMED';
    }

    order.status_history.push({ status: order.order_status, at: new Date() });
    await order.save();
  }

  const buyer = order ? await User.findById(order.buyer_id) : null;
  if (buyer) {
    try {
      await notificationService.notify(buyer, transition.notification, {
        orderNo: order.order_no,
        itemTitle: item.title,
        courier: shipment ? shipment.courier : undefined,
        trackingNo: shipment ? shipment.tracking_no : undefined,
      });
    } catch (err) {
      // Fulfilment must not fail just because notification delivery is unavailable.
    }
  }

  return {
    item: {
      id: String(item._id),
      orderId: String(item.order_id),
      status: item.item_status,
    },
    shipment: shipment
      ? {
          id: String(shipment._id),
          courier: shipment.courier,
          trackingNo: shipment.tracking_no,
          dispatchDate: shipment.dispatch_date,
        }
      : null,
  };
}

module.exports = { transitionItem };
