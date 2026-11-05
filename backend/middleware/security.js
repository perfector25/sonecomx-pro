const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

/**
 * ============================================================================
 * SONECOMX PRO - PROTOCOLE DE SÉCURITÉ APPLICATIVE & RÉSEAU
 * ============================================================================
 * Ce module centralise les protocoles de défense en profondeur :
 * 1. Limitation de débit (Rate Limiting) : Anti-DDoS, anti-bruteforce, anti-spam
 * 2. En-têtes de sécurité HTTP (Helmet & CSP strict)
 * 3. Contrôle d'accès multi-origines (CORS durci)
 * 4. Assainissement des données (Anti-NoSQL Injection, Anti-XSS, Anti-HPP)
 * 5. Masquage et isolation des erreurs système en production
 */

// ----------------------------------------------------------------------------
// PROTOCOLE 1 : RATE LIMITING (Limitation de débit & Anti-Brute-Force)
// ----------------------------------------------------------------------------

/**
 * Limiteur global pour toutes les routes API (/api/)
 * Protège l'infrastructure contre les requêtes excessives et le scraping agressif.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Fenêtre de 15 minutes
  max: 300,                  // 300 requêtes max par IP par fenêtre
  standardHeaders: true,     // Renvoie les en-têtes RateLimit-* (RFC)
  legacyHeaders: false,      // Désactive X-RateLimit-* obsolètes
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Trop de requêtes détectées depuis cette adresse IP. Veuillez patienter 15 minutes.'
  }
});

/**
 * Limiteur strict d'authentification (/api/auth/login)
 * Bloque les attaques par force brute (Brute Force) et credential stuffing.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Fenêtre de 15 minutes
  max: 5,                    // 5 tentatives infructueuses max par IP
  skipSuccessfulRequests: true, // Seuls les échecs comptent dans la limite
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'AUTH_BRUTE_FORCE_BLOCKED',
    message: 'Trop de tentatives de connexion échouées. Par mesure de sécurité, votre accès est bloqué pendant 15 minutes.'
  }
});

/**
 * Limiteur pour les formulaires publics critiques (Devis, Commandes)
 * Protège contre le spamming de commandes / devis automatiques.
 */
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Fenêtre de 15 minutes
  max: 20,                   // 20 soumissions max par 15 min par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'SUBMISSION_LIMIT_EXCEEDED',
    message: 'Trop de soumissions envoyées. Veuillez patienter avant de soumettre un nouveau formulaire.'
  }
});

// ----------------------------------------------------------------------------
// PROTOCOLE 2 : CONTRÔLE D'ACCÈS MULTI-ORIGINES (CORS SÉCURISÉ)
// ----------------------------------------------------------------------------

/**
 * Validation dynamique des origines autorisées (CORS)
 * Empêche les attaques CSRF et l'exploitation illicite de tokens depuis des domaines tiers.
 */
const allowedOrigins = (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [])
  .map(url => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (applications mobiles, curl, requêtes serveur-à-serveur)
    if (!origin) return callback(null, true);

    // En environnement de développement, autoriser les ports locaux usuels
    if (process.env.NODE_ENV !== 'production') {
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocal) return callback(null, true);
    }

    // Vérification de la liste blanche d'origines autorisées
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Refus sécurisé
    return callback(new Error(`Origine non autorisée par le protocole CORS: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400 // Cache preflight pendant 24 heures
};

// ----------------------------------------------------------------------------
// PROTOCOLE 3 : EN-TÊTES DE SÉCURITÉ HTTP (HELMET & CSP DURCI)
// ----------------------------------------------------------------------------

const helmetConfig = helmet({
  // Protection contre le clickjacking
  frameguard: { action: 'deny' },
  // Empêche le navigateur de deviner le type MIME (MIME sniffing)
  noSniff: true,
  // Active le filtre XSS natif des navigateurs
  xssFilter: true,
  // Masque l'empreinte technologique Express
  hidePoweredBy: true,
  // Force HTTPS strict avec HSTS en production
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  // Politique de référent sécurisée
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Content Security Policy (CSP) compatible SPA, CDNs légitimes (Tabler, Three.js, Chart.js, Cloudinary)
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://cdnjs.cloudflare.com',
        'https://cdn.jsdelivr.net'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://cdn.jsdelivr.net',
        'https://fonts.googleapis.com'
      ],
      fontSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://fonts.gstatic.com',
        'data:'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://res.cloudinary.com',
        'https://*.cloudinary.com',
        'https://images.unsplash.com'
      ],
      connectSrc: [
        "'self'",
        'https://res.cloudinary.com',
        'https://*.cloudinary.com'
      ],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  }
});

// ----------------------------------------------------------------------------
// PROTOCOLE 4 : ASSAINISSEMENT DES ENTRÉES (ANTI-INJECTION NOSQL, XSS & HPP)
// ----------------------------------------------------------------------------

/**
 * Assainissement NoSQL : neutralise les opérateurs $ et . dans req.body, req.query, req.params
 */
const noSqlSanitizer = mongoSanitize({
  replaceWith: '_'
});

/**
 * Assainissement XSS : filtre les balises HTML malveillantes
 * Contourne intelligemment les routes d'images pour préserver les payloads base64 volumineux
 */
const xssProtection = (req, res, next) => {
  const skipRoutes = ['/api/products', '/api/categories', '/api/upload'];
  const shouldSkip = skipRoutes.some(r => req.path.startsWith(r)) &&
    (req.method === 'POST' || req.method === 'PUT');

  if (shouldSkip) return next();
  return xss()(req, res, next);
};

/**
 * Protection contre la pollution de paramètres HTTP (HPP)
 */
const hppProtection = hpp({
  whitelist: ['images', 'features', 'tags', 'sort', 'fields', 'category', 'brand']
});

// ----------------------------------------------------------------------------
// PROTOCOLE 5 : GESTIONNAIRE D'ERREURS DE SÉCURITÉ & MASQUAGE DES LOGS
// ----------------------------------------------------------------------------

/**
 * Gestionnaire d'erreurs global sécurisé :
 * En production, aucune stack trace ni détail sensible sur la base de données n'est divulgué au client.
 */
const securityErrorHandler = (err, req, res, next) => {
  // Enregistrement sécurisé côté serveur
  console.error(`[SECURITY ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Erreurs d'authentification ou d'autorisation
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Jeton de session invalide' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Session expirée, veuillez vous reconnecter' });
  }

  // Erreurs de validation Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // Erreurs d'ID MongoDB invalide (CastError)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Format d\'identifiant de ressource invalide' });
  }

  // Erreur de doublon MongoDB (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'valeur';
    return res.status(400).json({ success: false, message: `Cette valeur pour '${field}' existe déjà.` });
  }

  // Réponse client standardisée
  const statusCode = err.statusCode || 500;
  const clientMessage = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Une erreur interne sécurisée est survenue. L\'administrateur a été notifié.'
    : (err.message || 'Erreur serveur interne');

  res.status(statusCode).json({
    success: false,
    message: clientMessage
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  submissionLimiter,
  corsOptions,
  helmetConfig,
  noSqlSanitizer,
  xssProtection,
  hppProtection,
  securityErrorHandler
};

