const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, unique: true },
  slug:        { type: String, unique: true, sparse: true, lowercase: true },
  description: { type: String },
  icon:        { type: String, default: 'ti-package' },
  image:       { type: String, default: '' },
  parent:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  order:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  productCount:{ type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

CategorySchema.virtual('children', {
  ref: 'Category', localField: '_id', foreignField: 'parent'
});

CategorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase()
      .replace(/[àáâã]/g,'a').replace(/[éèêë]/g,'e')
      .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-');
  }
  next();
});

module.exports = mongoose.model('Category', CategorySchema);
