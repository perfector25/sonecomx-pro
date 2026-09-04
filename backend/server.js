const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const Category = require('./models/Category');
const User = require('./models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Trop de requêtes, réessayez dans 15 minutes.' });
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sanitize data
app.use(mongoSanitize());
// Prevent XSS attacks — appliqué uniquement sur les routes non-images
// (xss-clean tronque les strings base64 > ~4KB, ce qui détruit les images envoyées en base64)
app.use((req, res, next) => {
  const skipRoutes = ['/api/products', '/api/categories'];
  const shouldSkip = skipRoutes.some(r => req.path.startsWith(r)) &&
    (req.method === 'POST' || req.method === 'PUT');
  if (shouldSkip) return next();
  return xss()(req, res, next);
});
// Prevent HTTP Param Pollution — autoriser les champs tableau
app.use(hpp({ whitelist: ['images', 'features', 'tags', 'sort', 'fields'] }));

// Logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Static files
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes API
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/categories',require('./routes/categories'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/quotes',    require('./routes/quotes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reviews',   require('./routes/reviews'));
app.use('/api/upload',    require('./routes/upload'));

// Frontend catch-all — serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne'
  });
});

const seedCategories = async () => {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      const categories = [
        { name: 'Boulonnerie & Sécurité',      icon: '/images/categories/boulonnerie-securite.png', order: 1,  productCount: 2100 },
        { name: 'Carreaux & Sanitaire',         icon: '/images/categories/carreaux et sanitaire.png', order: 2,  productCount: 610  },
        { name: 'Échelles & Escabeaux',         icon: '/images/categories/echelles et escabeaux.png', order: 3,  productCount: 160  },
        { name: 'Éclairage',                    icon: '/images/categories/eclairage.png',             order: 4,  productCount: 480  },
        { name: 'Électricité & Solaire',        icon: '/images/categories/electricite et solaire.png', order: 5,  productCount: 1100 },
        { name: 'EPI & Signalisation',          icon: '/images/categories/epi-signalisation.png',     order: 6,  productCount: 340  },
        { name: 'Équipement industriel',        icon: '/images/categories/equipement-industriel.png', order: 7,  productCount: 940  },
        { name: 'Matériel agricole',            icon: '/images/categories/materiel-agricole.png',     order: 8,  productCount: 520  },
        { name: 'Matériel de chantier',         icon: '/images/categories/materiels de chantier.png', order: 9,  productCount: 870  },
        { name: 'Parc métallique',              icon: '/images/categories/parc metalique.png',        order: 10, productCount: 200  },
        { name: 'Peinture & Étanchéité',        icon: '/images/categories/peinture et etancheite.png', order: 11, productCount: 540  },
        { name: 'Plomberie',                    icon: '/images/categories/plomberie.png',             order: 12, productCount: 740  },
        { name: 'Pneu & Huile',                 icon: '/images/categories/pneu et huile.png',        order: 13, productCount: 390  },
        { name: 'Portatif & Accessoires',       icon: '/images/categories/portatif-accessoires.png', order: 14, productCount: 820  },
        { name: 'Soudure',                      icon: '/images/categories/soudure.png',               order: 15, productCount: 310  },
        { name: 'Consommable & Logistique',     icon: '/images/categories/conssomable et logistique.png', order: 16, productCount: 1450 }
      ];
      await Category.create(categories);
      console.log('🌱 Base de données auto-seedée avec les 16 catégories.');
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

// MongoDB connection
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGODB_URL;
mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ MongoDB connecté');
    await seedCategories();
    await seedAdmin();
    app.listen(PORT, () =>
      console.log(`🚀 Serveur SONECOMX PRO démarré sur le port ${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌ Erreur MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
