const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'Prénom requis'], trim: true, maxlength: 50 },
  lastName:  { type: String, required: [true, 'Nom requis'],    trim: true, maxlength: 50 },
  email:     { type: String, required: [true, 'Email requis'], unique: true, lowercase: true,
               match: [/^\S+@\S+\.\S+$/, 'Email invalide'] },
  phone:     { type: String, trim: true },
  password:  { type: String, required: [true, 'Mot de passe requis'], minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
               match: [/^(?=.*[A-Z])(?=.*\d).{8,}$/, 'Le mot de passe doit contenir au moins une majuscule et un chiffre'],
               select: false },
  role:      { type: String, enum: ['user','pro','admin'], default: 'user' },
  company:   { type: String, trim: true },
  address: {
    street: String, city: String, region: String, country: { type: String, default: 'Cameroun' }
  },
  avatar:          { type: String, default: '' },
  isActive:        { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  resetPasswordToken:   String,
  resetPasswordExpire:  Date,
  wishlist:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  language:  { type: String, default: 'FR' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
}, { timestamps: true });

// Hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function(entered) {
  return bcrypt.compare(entered, this.password);
};

UserSchema.methods.getSignedToken = function() {
  const secret = process.env.JWT_SECRET || 'sonecomx_pro_super_secret_jwt_key_2025_secure_98432849283';
  const expire = process.env.JWT_EXPIRE || '30d';
  return jwt.sign({ id: this._id, role: this.role }, secret, {
    expiresIn: expire
  });
};

UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', UserSchema);
