const mongoose = require('mongoose');
const Book = require('../models/Book');
const Listing = require('../models/Listing');
const catalogueService = require('./catalogueService');
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

module.exports = { createListing };
