const express = require('express');
const router = express.Router();
const oc = require('../controllers/orderController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { submissionLimiter } = require('../middleware/security');
const { validateOrder } = require('../middleware/validators');

// Création de commande sécurisée (anti-spam et validation stricte des données)
router.post('/', submissionLimiter, validateOrder, optionalAuth, oc.createOrder);

router.get('/my', protect, oc.getMyOrders);
router.get('/', protect, authorize('admin'), oc.getAllOrders);
router.get('/:id', protect, oc.getOrder);
router.put('/:id/status', protect, authorize('admin'), oc.updateOrderStatus);

module.exports = router;
