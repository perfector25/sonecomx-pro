const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:      { type: String, required: true },
  quantity:  { type: Number, required: true, min: 1 },
  price:     { type: Number, required: true },
  thumbnail: String
});

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [OrderItemSchema],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone:    { type: String, required: true },
    street:   { type: String, required: true },
    city:     { type: String, required: true },
    region:   String,
    country:  { type: String, default: 'Cameroun' }
  },
  paymentMethod: {
    type: String,
    enum: ['orange_money','mtn_momo','card','wire','cod'],
    required: true
  },
  paymentResult: {
    id: String, status: String, updateTime: String, transactionId: String
  },
  itemsPrice:    { type: Number, required: true, default: 0 },
  shippingPrice: { type: Number, required: true, default: 0 },
  taxPrice:      { type: Number, required: true, default: 0 },
  totalPrice:    { type: Number, required: true, default: 0 },
  status: {
    type: String,
    enum: ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'],
    default: 'pending'
  },
  isPaid:        { type: Boolean, default: false },
  paidAt:        Date,
  isDelivered:   { type: Boolean, default: false },
  deliveredAt:   Date,
  notes:         String,
  trackingNumber:String,
  statusHistory: [{
    status:  String,
    comment: String,
    date:    { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

OrderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = 'SNX-' + Date.now().toString().slice(-6) +
      Math.random().toString(36).slice(2,5).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
