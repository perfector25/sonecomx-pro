const User = require('../models/User');
const jwt = require('jsonwebtoken');

const sendToken = (user, statusCode, res) => {
  const token = user.getSignedToken();
  const cookieDays = parseInt(process.env.JWT_COOKIE_EXPIRE, 10) || 30;
  const options = {
    expires: new Date(Date.now() + cookieDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };
  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        company: user.company,
        avatar: user.avatar
      }
    });
};

exports.register = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "La création de compte est désactivée. Cette plateforme est un site vitrine, seul l'administrateur dispose d'un compte."
  });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Compte désactivé' });
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Accès refusé. Seul l'administrateur peut se connecter sur cette plateforme vitrine." });
    }
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.logout = (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
  res.status(200).json({ success: true, message: 'Déconnecté avec succès' });
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).populate('wishlist', 'name price thumbnail slug');
  res.status(200).json({ success: true, data: user });
};

exports.updateProfile = async (req, res) => {
  try {
    const fields = ['firstName', 'lastName', 'phone', 'company', 'address', 'language'];
    const updates = {};
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }
    user.password = newPassword;
    await user.save();
    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const pid = req.params.productId;
    const idx = user.wishlist.indexOf(pid);
    if (idx > -1) { user.wishlist.splice(idx, 1); }
    else { user.wishlist.push(pid); }
    await user.save();
    res.status(200).json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
