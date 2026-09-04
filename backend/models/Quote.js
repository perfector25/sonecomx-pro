const mongoose = require('mongoose');

const QuoteItemSchema = new mongoose.Schema({
  product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 1 },
  unit:        { type: String, default: 'unité' },
  unitPrice:   Number,
  totalPrice:  Number
});

const QuoteSchema = new mongoose.Schema({
  quoteNumber:  { type: String, unique: true },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  company:      String,
  contactName:  { type: String, required: true },
  contactEmail: { type: String, required: true },
  contactPhone: String,
  items:        [QuoteItemSchema],
  totalEstimate:{ type: Number, default: 0 },
  message:      String,
  status: {
    type: String,
    enum: ['pending','processing','sent','accepted','rejected','expired'],
    default: 'pending'
  },
  adminReply:   String,
  validUntil:   Date,
  createdAt:    { type: Date, default: Date.now }
}, { timestamps: true });

QuoteSchema.pre('save', function(next) {
  if (!this.quoteNumber) {
    this.quoteNumber = 'DEV-' + Date.now().toString().slice(-6) +
      Math.random().toString(36).slice(2,4).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Quote', QuoteSchema);
