const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');

router.get('/:productId', async (req, res) => {
  try {
    const isId = mongoose.Types.ObjectId.isValid(req.params.productId);
    const query = isId
      ? { $or: [{ _id: req.params.productId }, { slug: req.params.productId }] }
      : { slug: req.params.productId };

    const p = await Product.findOne(query)
      .select('reviews rating numReviews')
      .populate('reviews.user', 'firstName lastName avatar');

    if (!p) return res.status(404).json({ success: false, message: 'Produit introuvable' });
    res.json({ success: true, data: p.reviews, rating: p.rating, numReviews: p.numReviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
