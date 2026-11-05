const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * ============================================================================
 * SONECOMX PRO - PROTOCOLE D'AUTHENTIFICATION & CONTRÔLE D'ACCÈS (RBAC)
 * ============================================================================
 * Vérifie l'authenticité des jetons JWT, valide l'état du compte utilisateur
 * et restreint l'accès aux rôles autorisés (user, pro, admin).
 */

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ ERREUR CRITIQUE SÉCURITÉ: JWT_SECRET non défini dans les variables d\'environnement.');
    }
    return 'sonecomx_pro_dev_jwt_secret_must_be_set_in_env_382910472';
  }
  return secret;
};

/**
 * Protocole de protection des routes privées
 * Vérifie la présence et l'intégrité du token JWT (Header Bearer ou Cookie HttpOnly).
 */
exports.protect = async (req, res, next) => {
  let token;

  // 1. Extraction depuis l'en-tête Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Extraction de secours depuis les cookies sécurisés
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Si aucun jeton n'est fourni
  if (!token || token === 'none') {
    return res.status(401).json({
      success: false,
      code: 'AUTH_TOKEN_MISSING',
      message: 'Accès non autorisé : jeton d\'authentification manquant.'
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    // Vérification de l'existence et de l'état actif du compte
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur associé au jeton introuvable.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'Ce compte utilisateur a été désactivé par l\'administrateur.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Votre session a expiré. Veuillez vous reconnecter.'
      : 'Jeton d\'authentification invalide ou altéré.';
    return res.status(401).json({
      success: false,
      code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      message
    });
  }
};

/**
 * Protocole d'autorisation basé sur les rôles (RBAC)
 * @param  {...string} roles Rôles autorisés ('admin', 'pro', 'user')
 */
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_INSUFFICIENT_ROLE',
      message: `Accès refusé : le rôle '${req.user ? req.user.role : 'anonyme'}' ne dispose pas des privilèges requis.`
    });
  }
  next();
};

/**
 * Protocole d'authentification optionnelle (pour le profilage ou les prix pro)
 * Attache req.user si un jeton valide est présent, sans bloquer la requête en cas d'absence.
 */
exports.optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token && token !== 'none') {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (e) {
      // Ignorer l'erreur pour une authentification optionnelle
    }
  }
  next();
};
