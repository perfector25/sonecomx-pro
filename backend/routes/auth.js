// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, updateProfile, updatePassword, toggleWishlist } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);
router.put('/wishlist/:productId', protect, toggleWishlist);
module.exports = router;
