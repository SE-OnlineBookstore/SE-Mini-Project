const mongoose = require('mongoose');
const Book = require('../models/Book');
const Listing = require('../models/Listing');
const User = require('../models/User');
const catalogueService = require('./catalogueService');
const notificationService = require('./notificationService');
const { normaliseIsbn, isValidIsbn13 } = require('../utils/isbn');
const { E } = require('../utils/AppError');

async function createListing(sellerId, input) {
  const isbn = normaliseIsbn(input.isbn13);

  if (!isValidIsbn13(isbn)) {
    throw E.badRequest('ISBN_INVALID', 'That is not a valid ISBN-13.');
  }

  const book = await Book.findOne({ isbn13: isbn }).select('_id').lean();

  if (!book) {
    throw E.notFound(
      'BOOK_NOT_FOUND',
      'No catalogue entry for this ISBN. Enter the book details manually.',
    );
  }

  if (!mongoose.isValidObjectId(sellerId)) {
    throw E.badRequest('SELLER_INVALID', 'The seller account is invalid.');
  }

  const listing = await Listing.create({
    book_id: book._id,
    seller_id: sellerId,
    condition: input.condition,
    price: input.price,
    stock_qty: input.stock_qty,
    status: input.stock_qty > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
  });

  await catalogueService.refreshBookStats(book._id);

  return {
    listing: {
      id: String(listing._id),
      bookId: String(book._id),
      sellerId: String(listing.seller_id),
      condition: listing.condition,
      price: listing.price,
      stockQty: listing.stock_qty,
      status: listing.status,
    },
  };
}

async function updateListing(sellerId, listingId, input) {
  if (!mongoose.isValidObjectId(sellerId)) {
    throw E.badRequest('SELLER_INVALID', 'The seller account is invalid.');
  }

  const listing = await Listing.findOne({
    _id: listingId,
    seller_id: sellerId,
  });

  if (!listing) {
    throw E.notFound(
      'LISTING_NOT_FOUND',
      'Listing not found for this seller.',
    );
  }

  const book = await Book.findById(listing.book_id)
    .select('_id title mrp')
    .lean();

  if (!book) {
    throw E.notFound('BOOK_NOT_FOUND', 'The book for this listing was not found.');
  }

  if (input.price !== undefined) {
    if (book.mrp != null && input.price > book.mrp) {
      throw E.badRequest(
        'PRICE_ABOVE_MRP',
        'Listing price cannot exceed the book MRP.',
      );
    }

    listing.price = input.price;
  }

  const previousStock = listing.stock_qty;

  if (input.stock_qty !== undefined) {
    listing.stock_qty = input.stock_qty;

    if (input.stock_qty === 0) {
      listing.status = 'OUT_OF_STOCK';
    } else if (listing.status === 'OUT_OF_STOCK') {
      listing.status = 'ACTIVE';
    }
  }

  await listing.save();
  await catalogueService.refreshBookStats(listing.book_id);

  // Alert when stock first reaches five or fewer copies.
  if (
    input.stock_qty !== undefined &&
    input.stock_qty <= 5 &&
    previousStock > 5
  ) {
    const seller = await User.findById(sellerId).select('name email');

    if (seller) {
      try {
        await notificationService.notify(seller, 'LOW_STOCK_ALERT', {
          bookTitle: book.title,
          stockQty: listing.stock_qty,
        });
      } catch (err) {
        // Notification failure must not undo a successful listing update.
        // The notification service handles delivery failures itself.
      }
    }
  }

  return {
    listing: {
      id: String(listing._id),
      bookId: String(listing.book_id),
      sellerId: String(listing.seller_id),
      condition: listing.condition,
      price: listing.price,
      stockQty: listing.stock_qty,
      status: listing.status,
    },
  };
}

module.exports = { createListing, updateListing };
