const express = require('express');
const router = express.Router();
const oc = require('../controllers/orderController');
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sonecomx_secret_jwt_2025');
      req.user = await User.findById(decoded.id);
    } catch (e) {}
  }
  next();
};

router.post('/', optionalAuth, oc.createOrder);
router.get('/my', protect, oc.getMyOrders);
router.get('/', protect, authorize('admin'), oc.getAllOrders);
router.get('/:id', protect, oc.getOrder);
router.put('/:id/status', protect, authorize('admin'), oc.updateOrderStatus);
module.exports = router;
