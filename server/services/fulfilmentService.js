const OrderItem = require('../models/OrderItem');
const Order = require('../models/Order');
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const { E } = require('../utils/AppError');
const notificationService = require('./notificationService');

const TRANSITIONS = {
  accept: {
    from: 'PLACED',
    to: 'CONFIRMED',
    notification: 'ORDER_CONFIRMED',
  },
  pack: {
    from: 'CONFIRMED',
    to: 'PACKED',
    notification: 'ORDER_PACKED',
  },
  dispatch: {
    from: 'PACKED',
    to: 'SHIPPED',
    notification: 'ORDER_SHIPPED',
  },
  deliver: {
    from: 'SHIPPED',
    to: 'DELIVERED',
    notification: 'ORDER_DELIVERED',
  },
};

async function transitionItem(sellerId, itemId, action, shipmentDetails = {}) {
  const transition = TRANSITIONS[action];

  if (!transition) {
    throw E.badRequest(
      'INVALID_FULFILMENT_ACTION',
      'Unsupported fulfilment action.',
    );
  }

  // Find the order item belonging to this seller.
  const item = await OrderItem.findOne({
    _id: itemId,
    seller_id: sellerId,
  });

  if (!item) {
    throw E.notFound(
      'ORDER_ITEM_NOT_FOUND',
      'Order item not found.',
    );
  }

  // Validate the current item status.
  if (item.item_status !== transition.from) {
    throw E.conflict(
      'INVALID_STATUS_TRANSITION',
      `Cannot ${action} an item with status ${item.item_status}.`,
    );
  }

  let shipment = null;

  // Handle shipment details during dispatch.
  if (action === 'dispatch') {
    const courier = String(shipmentDetails.courier || '').trim();
    const trackingNo = String(shipmentDetails.trackingNo || '').trim();

    if (
      !courier ||
      courier.length > 60 ||
      !trackingNo ||
      trackingNo.length > 40
    ) {
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

  // Update item status.
  item.item_status = transition.to;

  // Record delivery timestamp.
  if (action === 'deliver') {
    item.delivered_at = new Date();
  }

  await item.save();

  // Update overall order status based on all its items.
  const order = await Order.findById(item.order_id);

  if (order) {
    const items = await OrderItem.find({
      order_id: order._id,
    });

    const statuses = items.map((entry) => entry.item_status);

    let nextOrderStatus = order.order_status;

    // The order is delivered only when every item is delivered.
    if (
      statuses.length > 0 &&
      statuses.every((status) => status === 'DELIVERED')
    ) {
      nextOrderStatus = 'DELIVERED';
    } else if (
      statuses.every((status) =>
        ['SHIPPED', 'DELIVERED'].includes(status)
      )
    ) {
      nextOrderStatus = 'SHIPPED';
    } else if (
      statuses.every((status) =>
        ['PACKED', 'SHIPPED', 'DELIVERED'].includes(status)
      )
    ) {
      nextOrderStatus = 'PACKED';
    } else if (
      statuses.every((status) => status !== 'PLACED')
    ) {
      nextOrderStatus = 'CONFIRMED';
    }

    // Update order status and history only when status changes.
    if (nextOrderStatus !== order.order_status) {
      order.order_status = nextOrderStatus;

      order.status_history.push({
        status: nextOrderStatus,
        at: new Date(),
      });

      await order.save();
    }
  }

  // Notify the buyer about the fulfilment transition.
  const buyer = order
    ? await User.findById(order.buyer_id)
    : null;

  if (buyer) {
    try {
      await notificationService.notify(
        buyer,
        transition.notification,
        {
          orderNo: order.order_no,
          itemTitle: item.title,
          courier: shipment ? shipment.courier : undefined,
          trackingNo: shipment ? shipment.tracking_no : undefined,
        },
      );
    } catch (err) {
      // Fulfilment must not fail if notification delivery is unavailable.
    }
  }

  // Return updated item and shipment information.
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

module.exports = {
  transitionItem,
};