const { Schema, model } = require('mongoose');

// Catalogue title (independent of any seller). lowest_price, active_offers, avg_rating and
// review_count are maintained by the services so the catalogue page needs no join (SAD R4).
const bookSchema = new Schema(
  {
    isbn13: { type: String, required: true, unique: true, match: /^\d{13}$/ },
    title: { type: String, required: true, maxlength: 200 },
    author: { type: String, required: true, maxlength: 120 },
    publisher: { type: String, maxlength: 120 },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    language: { type: String, required: true, default: 'English' },
    mrp: { type: Number, required: true, min: 0 }, // paise
    cover_url: { type: String },
    description: { type: String, maxlength: 4000 },
    lowest_price: { type: Number, default: null }, // paise, over ACTIVE listings
    active_offers: { type: Number, default: 0 },
    avg_rating: { type: Number, default: 0 },
    review_count: { type: Number, default: 0 },
    last_listed_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

// FR-08 / NFR-01: compound text index, title weighted highest.
// default_language 'none' and language_override 'text_language' stop MongoDB from reading our
// own "language" field (Hindi, Kannada, Tamil...) as a text-index language, which it rejects.
bookSchema.index(
  { title: 'text', author: 'text', isbn13: 'text', publisher: 'text' },
  {
    weights: { title: 10, author: 5, isbn13: 5, publisher: 1 },
    name: 'book_text',
    default_language: 'none',
    language_override: 'text_language',
  },
);
bookSchema.index({ active_offers: 1, lowest_price: 1 });

module.exports = model('Book', bookSchema);
