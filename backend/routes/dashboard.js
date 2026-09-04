const express = require('express');
const router = express.Router();
const dc = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');
router.get('/stats', protect, authorize('admin'), dc.getStats);
router.get('/activity', protect, authorize('admin'), dc.getRecentActivity);
module.exports = router;
