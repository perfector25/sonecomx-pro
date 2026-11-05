// routes/auth.js
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  toggleWishlist
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const { validateLogin, validateUpdatePassword } = require('../middleware/validators');

// Authentification & Session (soumis au protocole anti-bruteforce authLimiter)
router.post('/register', register);
router.post('/login', authLimiter, validateLogin, login);
router.get('/logout', logout);

// Profil & Espace sécurisé
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, validateUpdatePassword, updatePassword);
router.put('/wishlist/:productId', protect, toggleWishlist);

module.exports = router;
