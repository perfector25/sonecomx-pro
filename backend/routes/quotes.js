const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Quote = require('../models/Quote');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { submissionLimiter } = require('../middleware/security');
const { validateQuote } = require('../middleware/validators');

// Création de devis (soumis au protocole anti-spam et validation de données)
router.post('/', submissionLimiter, validateQuote, optionalAuth, async (req, res) => {
  try {
    const q = await Quote.create({ ...req.body, user: req.user ? req.user.id : undefined });
    res.status(201).json({ success: true, data: q });
  } catch(err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const quotes = await Quote.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: quotes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const quotes = await Quote.find().populate('user','firstName lastName email company phone').sort({ createdAt: -1 });
    res.json({ success: true, data: quotes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const isId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isId
      ? { $or: [{ _id: req.params.id }, { quoteNumber: req.params.id }] }
      : { quoteNumber: req.params.id };

    const q = await Quote.findOne(query).populate('user', 'firstName lastName email company phone');
    if (!q) return res.status(404).json({ success: false, message: 'Devis introuvable' });

    const isOwner = q.user && q.user._id && q.user._id.toString() === req.user.id;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à ce devis' });
    }

    res.json({ success: true, data: q });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const isId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isId ? { _id: req.params.id } : { quoteNumber: req.params.id };

    const q = await Quote.findOneAndUpdate(query, req.body, { new: true });
    if (!q) return res.status(404).json({ success: false, message: 'Devis introuvable' });
    res.json({ success: true, data: q });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
