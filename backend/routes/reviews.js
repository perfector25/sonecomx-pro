const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
router.get('/:productId', async (req, res) => {
  const p = await Product.findById(req.params.productId).select('reviews rating numReviews');
  if (!p) return res.status(404).json({ success: false, message: 'Produit introuvable' });
  res.json({ success: true, data: p.reviews, rating: p.rating, numReviews: p.numReviews });
});
module.exports = router;
