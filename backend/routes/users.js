const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
router.get('/', protect, authorize('admin'), async (req, res) => {
  const page = parseInt(req.query.page) || 1; const limit = 20;
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
    User.countDocuments()
  ]);
  res.json({ success: true, count: users.length, total, data: users });
});
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: user });
});
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
});
module.exports = router;
