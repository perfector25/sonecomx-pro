const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
const { protect, authorize } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sonecomx_pro_super_secret_jwt_key_2025_secure_98432849283');
      req.user = await User.findById(decoded.id);
    } catch (e) {}
  }
  next();
};

router.post('/', optionalAuth, async (req, res) => {
  try {
    const q = await Quote.create({ ...req.body, user: req.user ? req.user.id : undefined });
    res.status(201).json({ success: true, data: q });
  } catch(err) { res.status(400).json({ success: false, message: err.message }); }
});
router.get('/my', protect, async (req, res) => {
  const quotes = await Quote.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, data: quotes });
});
router.get('/', protect, authorize('admin'), async (req, res) => {
  const quotes = await Quote.find().populate('user','firstName lastName email company').sort({ createdAt: -1 });
  res.json({ success: true, data: quotes });
});
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const q = await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: q });
});
module.exports = router;
