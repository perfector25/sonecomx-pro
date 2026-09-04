// ─── routes/products.js ───────────────────────────────────────────
const express = require('express');
const r1 = express.Router();
const pc = require('../controllers/productController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
r1.get('/',            optionalAuth, pc.getProducts);
r1.get('/featured',    pc.getFeatured);
r1.get('/:id',         optionalAuth, pc.getProduct);
r1.get('/:id/related', pc.getRelated);
r1.post('/',           protect, authorize('admin'), pc.createProduct);
r1.put('/:id',         protect, authorize('admin'), pc.updateProduct);
r1.delete('/:id',      protect, authorize('admin'), pc.deleteProduct);
r1.post('/:id/reviews',protect, pc.addReview);
module.exports = r1;

// ─── routes/categories.js ─────────────────────────────────────────
const e2 = require('express'); const r2 = e2.Router();
const Category = require('../models/Category');
const { protect: p2, authorize: a2 } = require('../middleware/auth');
r2.get('/', async (req, res) => {
  const cats = await Category.find({ isActive: true, parent: null }).populate('children').sort('order').lean();
  res.json({ success: true, data: cats });
});
r2.get('/:id', async (req, res) => {
  const cat = await Category.findOne({ $or: [{ _id: req.params.id }, { slug: req.params.id }] }).populate('children');
  if (!cat) return res.status(404).json({ success: false, message: 'Catégorie introuvable' });
  res.json({ success: true, data: cat });
});
r2.post('/',    p2, a2('admin'), async (req, res) => { const c = await Category.create(req.body); res.status(201).json({ success: true, data: c }); });
r2.put('/:id',  p2, a2('admin'), async (req, res) => { const c = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: c }); });
r2.delete('/:id',p2,a2('admin'), async (req, res) => { await Category.findByIdAndUpdate(req.params.id, { isActive: false }); res.json({ success: true, message: 'Catégorie archivée' }); });
module.exports = r2;

// ─── routes/orders.js ─────────────────────────────────────────────
const e3 = require('express'); const r3 = e3.Router();
const oc = require('../controllers/orderController');
const { protect: p3, authorize: a3 } = require('../middleware/auth');
r3.post('/',           p3, oc.createOrder);
r3.get('/my',          p3, oc.getMyOrders);
r3.get('/:id',         p3, oc.getOrder);
r3.get('/',            p3, a3('admin'), oc.getAllOrders);
r3.put('/:id/status',  p3, a3('admin'), oc.updateOrderStatus);
module.exports = r3;

// ─── routes/users.js ──────────────────────────────────────────────
const e4 = require('express'); const r4 = e4.Router();
const User = require('../models/User');
const { protect: p4, authorize: a4 } = require('../middleware/auth');
r4.get('/', p4, a4('admin'), async (req, res) => {
  const page = parseInt(req.query.page) || 1; const limit = 20;
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
    User.countDocuments()
  ]);
  res.json({ success: true, count: users.length, total, data: users });
});
r4.put('/:id', p4, a4('admin'), async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: user });
});
r4.delete('/:id', p4, a4('admin'), async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Utilisateur désactivé' });
});
module.exports = r4;

// ─── routes/quotes.js ─────────────────────────────────────────────
const e5 = require('express'); const r5 = e5.Router();
const Quote = require('../models/Quote');
const { protect: p5, authorize: a5 } = require('../middleware/auth');
r5.post('/', p5, async (req, res) => {
  const q = await Quote.create({ ...req.body, user: req.user.id, contactName: req.user.firstName + ' ' + req.user.lastName, contactEmail: req.user.email });
  res.status(201).json({ success: true, data: q });
});
r5.get('/my', p5, async (req, res) => {
  const quotes = await Quote.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, data: quotes });
});
r5.get('/', p5, a5('admin'), async (req, res) => {
  const quotes = await Quote.find().populate('user','firstName lastName email company').sort({ createdAt: -1 });
  res.json({ success: true, data: quotes });
});
r5.put('/:id', p5, a5('admin'), async (req, res) => {
  const q = await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: q });
});
module.exports = r5;

// ─── routes/dashboard.js ──────────────────────────────────────────
const e6 = require('express'); const r6 = e6.Router();
const dc = require('../controllers/dashboardController');
const { protect: p6, authorize: a6 } = require('../middleware/auth');
r6.get('/stats',    p6, a6('admin'), dc.getStats);
r6.get('/activity', p6, a6('admin'), dc.getRecentActivity);
module.exports = r6;

// ─── routes/reviews.js ────────────────────────────────────────────
const e7 = require('express'); const r7 = e7.Router();
const Product7 = require('../models/Product');
const { protect: p7 } = require('../middleware/auth');
r7.get('/:productId', async (req, res) => {
  const p = await Product7.findById(req.params.productId).select('reviews rating numReviews').populate('reviews.user','firstName lastName avatar');
  if (!p) return res.status(404).json({ success: false, message: 'Produit introuvable' });
  res.json({ success: true, data: p.reviews, rating: p.rating, numReviews: p.numReviews });
});
module.exports = r7;
