const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, authorize } = require('../middleware/auth');
router.get('/', async (req, res) => {
  const cats = await Category.find({ isActive: true }).sort('order').lean();
  res.json({ success: true, data: cats });
});
router.post('/', protect, authorize('admin'), async (req, res) => {
  const c = await Category.create(req.body);
  res.status(201).json({ success: true, data: c });
});
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const c = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: c });
});
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  await Category.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
});
module.exports = router;
