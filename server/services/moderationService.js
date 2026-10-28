const mongoose = require('mongoose');
const { User, Listing, Review } = require('../models');
const auditService = require('./auditService');
const reviewService = require('./reviewService');
const catalogueService = require('./catalogueService');
const { E } = require('../utils/AppError');

const TARGETS = {
  listing: {
    model: Listing,
    type: 'LISTING',
    action: (blocked) => `LISTING_${blocked ? 'BLOCKED' : 'UNBLOCKED'}`,
  },
  user: {
    model: User,
    type: 'USER',
    action: (blocked) => `USER_${blocked ? 'BLOCKED' : 'UNBLOCKED'}`,
  },
  review: {
    model: Review,
    type: 'REVIEW',
    action: (blocked) => `REVIEW_${blocked ? 'BLOCKED' : 'UNBLOCKED'}`,
  },
};

function validateInput(targetType, targetId, reason) {
  if (!TARGETS[targetType]) {
    throw E.badRequest(
      'MODERATION_TARGET_INVALID',
      'Target type must be listing, user, or review.',
    );
  }

  if (!mongoose.isValidObjectId(targetId)) {
    throw E.badRequest(
      'MODERATION_ID_INVALID',
      'The target ID is invalid.',
    );
  }

  if (typeof reason !== 'string' || !reason.trim()) {
    throw E.badRequest(
      'MODERATION_REASON_REQUIRED',
      'A reason is required for every moderation action.',
    );
  }

  if (reason.trim().length > 500) {
    throw E.badRequest(
      'MODERATION_REASON_TOO_LONG',
      'The reason cannot exceed 500 characters.',
    );
  }
}

async function setBlocked({
  targetType,
  targetId,
  blocked,
  reason,
  actorId,
  requestId,
}) {
  validateInput(targetType, targetId, reason);

  const config = TARGETS[targetType];

  // Explicitly retrieve the previous status when moderating a listing.
  const target = await config.model
    .findById(targetId)
    .select('+pre_block_status');

  if (!target) {
    throw E.notFound(
      'MODERATION_TARGET_NOT_FOUND',
      'The requested moderation target was not found.',
    );
  }

  const currentlyBlocked =
    targetType === 'listing'
      ? target.status === 'BLOCKED'
      : target.is_blocked === true;

  if (currentlyBlocked === blocked) {
    throw E.conflict(
      'MODERATION_STATE_UNCHANGED',
      `This ${targetType} is already ${
        blocked ? 'blocked' : 'unblocked'
      }.`,
    );
  }

  if (targetType === 'listing') {
    if (blocked) {
      target.pre_block_status = target.status;
      target.status = 'BLOCKED';
    } else {
      const previousStatus = target.pre_block_status || 'ACTIVE';

      target.status =
        previousStatus === 'ACTIVE' && target.stock_qty === 0
          ? 'OUT_OF_STOCK'
          : previousStatus;

      target.pre_block_status = undefined;
    }
  } else if (targetType === 'user') {
    target.is_blocked = blocked;

    if (blocked) {
      target.token_version = (target.token_version || 0) + 1;
    }
  } else {
    target.is_blocked = blocked;
  }

  await target.save();

  if (targetType === 'listing') {
    await catalogueService.refreshBookStats(target.book_id);
  }

  if (targetType === 'review') {
    await reviewService.recalculateRating(target.book_id);
  }

  await auditService.record({
    actorId,
    action: config.action(blocked),
    targetType: config.type,
    targetId: target._id,
    reason: reason.trim(),
    requestId,
  });

  return {
    targetType,
    targetId: String(target._id),
    blocked,
    reason: reason.trim(),
  };
}

module.exports = { setBlocked };