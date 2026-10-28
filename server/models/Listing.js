const { Schema, model } = require('mongoose');

const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'ACCEPTABLE']; // fixed vocabulary (SRS 6.6)

const listingSchema = new Schema(
  {
    book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    seller_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    condition: { type: String, required: true, enum: CONDITIONS },
    price: { type: Number, required: true, min: 1 }, // paise
    stock_qty: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ['ACTIVE', 'OUT_OF_STOCK', 'UNLISTED', 'BLOCKED'], default: 'ACTIVE' },
    pre_block_status: {
  type: String,
  enum: ['ACTIVE', 'OUT_OF_STOCK', 'UNLISTED'],
  select: false,
},
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);
listingSchema.index({ book_id: 1, status: 1, price: 1 });

module.exports = model('Listing', listingSchema);
module.exports.CONDITIONS = CONDITIONS;
