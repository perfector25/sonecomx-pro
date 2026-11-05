const express = require('express');
const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) { }
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// Chargement des variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

// Protocoles de sécurité SONECOMX PRO
const {
  apiLimiter,
  corsOptions,
  helmetConfig,
  noSqlSanitizer,
  xssProtection,
  hppProtection,
  securityErrorHandler
} = require('./middleware/security');

const Category = require('./models/Category');
const User = require('./models/User');

const app = express();

// Masquer la signature serveur Express
app.disable('x-powered-by');

// 1. Protocole En-têtes HTTP de sécurité (Helmet & CSP durci)
app.use(helmetConfig);

// 2. Protocole CORS (Contrôle strict des origines autorisées)
app.use(cors(corsOptions));

// 3. Protocole Rate Limiting global (Anti-DDoS / Scraping sur /api/)
app.use('/api/', apiLimiter);

// 4. Analyseurs de corps de requête (Body parsers avec taille maximale maîtrisée)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. Protocole Assainissement des données (Anti-NoSQL Injection, XSS, HPP)
app.use(noSqlSanitizer);
app.use(xssProtection);
app.use(hppProtection);

// Journalisation (Logging)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Fichiers statiques
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/upload', require('./routes/upload'));

// Route directe du panneau d'administration
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin.html'));
});

// Route Catch-all SPA frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// 6. Protocole Gestionnaire d'erreurs sécurisé (Aucune fuite de données en production)
app.use(securityErrorHandler);

const seedCategories = async () => {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      const categories = [
        { name: 'Boulonnerie & Sécurité', icon: '/images/categories/boulonnerie-securite.png', order: 1, productCount: 2100 },
        { name: 'Carreaux & Sanitaire', icon: '/images/categories/carreaux et sanitaire.png', order: 2, productCount: 610 },
        { name: 'Échelles & Escabeaux', icon: '/images/categories/echelles et escabeaux.png', order: 3, productCount: 160 },
        { name: 'Éclairage', icon: '/images/categories/eclairage.png', order: 4, productCount: 480 },
        { name: 'Électricité & Solaire', icon: '/images/categories/electricite et solaire.png', order: 5, productCount: 1100 },
        { name: 'EPI & Signalisation', icon: '/images/categories/epi-signalisation.png', order: 6, productCount: 340 },
        { name: 'Équipement industriel', icon: '/images/categories/equipement-industriel.png', order: 7, productCount: 940 },
        { name: 'Matériel agricole', icon: '/images/categories/materiel-agricole.png', order: 8, productCount: 520 },
        { name: 'Matériel de chantier', icon: '/images/categories/materiels de chantier.png', order: 9, productCount: 870 },
        { name: 'Parc métallique', icon: '/images/categories/parc metalique.png', order: 10, productCount: 200 },
        { name: 'Peinture & Étanchéité', icon: '/images/categories/peinture et etancheite.png', order: 11, productCount: 540 },
        { name: 'Plomberie', icon: '/images/categories/plomberie.png', order: 12, productCount: 740 },
        { name: 'Pneu & Huile', icon: '/images/categories/pneu et huile.png', order: 13, productCount: 390 },
        { name: 'Portatif & Accessoires', icon: '/images/categories/portatif-accessoires.png', order: 14, productCount: 820 },
        { name: 'Soudure', icon: '/images/categories/soudure.png', order: 15, productCount: 310 },
        { name: 'Consommable & Logistique', icon: '/images/categories/conssomable et logistique.png', order: 16, productCount: 1450 },
        { name: 'Électroménager', icon: '/images/categories/electromenager.png', order: 17, productCount: 450 },
        { name: 'Plomberie industrielle', icon: '/images/categories/plomberie-industrielle.png', order: 18, productCount: 680 }
      ];
      await Category.create(categories);
      console.log('🌱 Base de données auto-seedée avec les 18 catégories.');
    }
  } catch (err) {
    console.error('❌ Erreur auto-seed catégories:', err.message);
  }
};

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        firstName: 'Admin',
        lastName: 'SONECOMX',
        email: process.env.ADMIN_EMAIL || 'admin@sonecomxpro.cm',
        password: process.env.ADMIN_PASSWORD || 'Admin2025!',
        role: 'admin',
        isActive: true,
        isEmailVerified: true
      });
      console.log('👤 Administrateur initialisé avec succès.');
    }
  } catch (err) {
    console.error('❌ Erreur auto-seed admin:', err.message);
  }
};

// Connexion sécurisée à MongoDB
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGODB_URL;

if (!mongoUri) {
  console.error("❌ Erreur critique sécurité : Aucune chaîne de connexion MongoDB (MONGODB_URI) définie dans les variables d'environnement.");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ MongoDB connecté avec succès (Protocole sécurisé TLS/SSL)');
    await seedCategories();
    await seedAdmin();
    app.listen(PORT, () =>
      console.log(`🚀 Serveur SONECOMX PRO démarré sur le port ${PORT} avec protocoles de sécurité actifs`)
    );
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
