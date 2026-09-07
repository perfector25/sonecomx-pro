const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  name:        { type: String, required: [true, 'Nom produit requis'], trim: true },
  slug:        { type: String, unique: true, sparse: true, lowercase: true },
  description: { type: String, required: true },
  shortDesc:   { type: String, maxlength: 200 },
  sku:         { type: String, unique: true, sparse: true },
  brand:       { type: String, required: true, trim: true },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price:       { type: Number, required: true, min: 0 },
  priceOld:    { type: Number, default: 0 },
  discount:    { type: Number, default: 0, min: 0, max: 100 },
  stock:       { type: Number, required: true, default: 0 },
  unit:        { type: String, default: 'unité' },
  images:      [{ type: String }],
  thumbnail:   { type: String, default: '' },
  features:    [{ key: String, value: String }],
  tags:        [String],
  reviews:     [ReviewSchema],
  rating:      { type: Number, default: 0 },
  numReviews:  { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  isFeatured:  { type: Boolean, default: false },
  isNew:       { type: Boolean, default: false },
  isProOnly:   { type: Boolean, default: false },
  sold:        { type: Number, default: 0 },
  views:       { type: Number, default: 0 },
  weight:      { type: Number, default: 0 },
  dimensions:  { length: Number, width: Number, height: Number },
  createdAt:   { type: Date, default: Date.now }
}, { timestamps: true, suppressReservedKeysWarning: true });

// Auto-generate slug
ProductSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      + '-' + Date.now();
  }
  if (this.discount > 0 && this.price) {
    this.priceOld = this.priceOld || this.price;
    this.price = Math.round(this.priceOld * (1 - this.discount / 100));
  }
  next();
});

// Recalculate average rating
ProductSchema.methods.calcRating = function() {
  if (this.reviews.length === 0) { this.rating = 0; this.numReviews = 0; return; }
  this.rating = this.reviews.reduce((s, r) => s + r.rating, 0) / this.reviews.length;
  this.numReviews = this.reviews.length;
};

ProductSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });
ProductSchema.index({ category: 1, isActive: 1, price: 1 });

module.exports = mongoose.model('Product', ProductSchema);
