const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * ============================================================================
 * SONECOMX PRO - PROTOCOLE DE VALIDATION DES ENTRÉES (INPUT VALIDATION)
 * ============================================================================
 * Assure la conformité des données entrantes avec les règles métier
 * et prévient l'injection de charges malveillantes (Payload Injection).
 */

/**
 * Middleware d'interception des erreurs de validation
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));
    return res.status(400).json({
      success: false,
      message: errorList[0].message,
      errors: errorList
    });
  }
  next();
};

/**
 * Protocole de validation pour la connexion administrateur / utilisateur
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('L\'adresse email est requise')
    .isEmail().withMessage('Veuillez fournir une adresse email valide')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis')
    .isLength({ min: 6 }).withMessage('Le mot de passe doit comporter au moins 6 caractères'),
  handleValidationErrors
];

/**
 * Protocole de validation pour le changement de mot de passe
 */
const validateUpdatePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Le mot de passe actuel est requis'),
  body('newPassword')
    .notEmpty().withMessage('Le nouveau mot de passe est requis')
    .isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[A-Z])(?=.*\d)/).withMessage('Le nouveau mot de passe doit contenir au moins une lettre majuscule et un chiffre'),
  handleValidationErrors
];

/**
 * Protocole de validation pour les demandes de devis
 */
const validateQuote = [
  body('contactName')
    .trim()
    .notEmpty().withMessage('Le nom de contact est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
  body('contactEmail')
    .trim()
    .notEmpty().withMessage('L\'adresse email de contact est requise')
    .isEmail().withMessage('Email de contact invalide')
    .normalizeEmail(),
  body('contactPhone')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Le numéro de téléphone est trop long'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Le nom de l\'entreprise est trop long'),
  body('items')
    .isArray({ min: 1 }).withMessage('Le devis doit contenir au moins un article'),
  body('items.*.description')
    .trim()
    .notEmpty().withMessage('La description de chaque article est requise'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('La quantité de chaque article doit être un entier supérieur ou égal à 1'),
  handleValidationErrors
];

/**
 * Protocole de validation pour la passation de commande
 */
const validateOrder = [
  body('items')
    .isArray({ min: 1 }).withMessage('La commande doit comporter au moins un article'),
  body('items.*.product')
    .custom(val => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Identifiant de produit invalide dans les articles'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('La quantité doit être au minimum de 1'),
  body('shippingAddress.fullName')
    .trim()
    .notEmpty().withMessage('Le nom du destinataire est requis'),
  body('shippingAddress.phone')
    .trim()
    .notEmpty().withMessage('Le téléphone de livraison est requis'),
  body('shippingAddress.street')
    .trim()
    .notEmpty().withMessage('L\'adresse de livraison est requise'),
  body('shippingAddress.city')
    .trim()
    .notEmpty().withMessage('La ville de livraison est requise'),
  body('paymentMethod')
    .isIn(['orange_money', 'mtn_momo', 'card', 'wire', 'cod'])
    .withMessage('Mode de paiement non reconnu ou invalide'),
  handleValidationErrors
];

/**
 * Protocole de validation des paramètres d'identifiant MongoDB ObjectId (:id)
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .custom(val => mongoose.Types.ObjectId.isValid(val))
    .withMessage(`Le paramètre '${paramName}' n'est pas un identifiant MongoDB valide`),
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateUpdatePassword,
  validateQuote,
  validateOrder,
  validateObjectId,
  handleValidationErrors
};

