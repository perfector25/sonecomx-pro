# SONECOMX PRO — Full Stack Web Application

**La maison des professionnels** — Quincaillerie générale, outillage, EPI et matériel de chantier.

---

## 🏗️ Architecture

```
sonecomx/
├── backend/
│   ├── server.js              # Point d'entrée Express
│   ├── config/db.js           # Connexion MongoDB
│   ├── models/
│   │   ├── User.js            # Utilisateurs + auth JWT
│   │   ├── Product.js         # Produits + avis
│   │   ├── Category.js        # Catégories
│   │   ├── Order.js           # Commandes
│   │   └── Quote.js           # Devis Pro
│   ├── controllers/
│   │   ├── authController.js      # Login, register, profil
│   │   ├── productController.js   # CRUD produits + recherche
│   │   ├── orderController.js     # Gestion commandes
│   │   └── dashboardController.js # Stats admin
│   ├── middleware/
│   │   └── auth.js            # JWT protect + authorize
│   ├── routes/
│   │   ├── auth.js            # /api/auth/*
│   │   ├── products.js        # /api/products/*
│   │   ├── categories.js      # /api/categories/*
│   │   ├── orders.js          # /api/orders/*
│   │   ├── users.js           # /api/users/*
│   │   ├── quotes.js          # /api/quotes/*
│   │   ├── dashboard.js       # /api/dashboard/*
│   │   └── reviews.js         # /api/reviews/*
│   └── utils/seed.js          # Données de démo
├── frontend/public/
│   ├── index.html             # SPA shell
│   ├── admin.html             # Dashboard admin
│   ├── css/
│   │   ├── main.css           # Styles frontend
│   │   └── admin.css          # Styles dashboard
│   └── js/
│       └── app.js             # SPA router + pages + API
├── .env                       # Variables d'environnement
└── package.json
```

---

## 🚀 Installation et démarrage

### Prérequis
- **Node.js** v18+
- **MongoDB** v6+ (local ou Atlas)

### 1. Installer les dépendances
```bash
cd sonecomx
npm install
```

### 2. Configurer l'environnement
Editez le fichier `.env` :
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sonecomxpro
JWT_SECRET=votre_secret_ultra_securise_ici
JWT_EXPIRE=7d
NODE_ENV=development
```

### 3. Peupler la base de données (optionnel)
```bash
npm run seed
```
Ceci crée :
- **Admin** : `admin@sonecomxpro.cm` / `Admin2025!`
- **Utilisateur Pro** : `thomas@test.cm` / `Test2025!`
- 16 catégories + 12 produits de démonstration

### 4. Démarrer le serveur
```bash
# Production
npm start

# Développement (avec rechargement automatique)
npm run dev
```

### 5. Accéder à l'application
| URL | Description |
|-----|-------------|
| `http://localhost:5000` | Site vitrine (SPA) |
| `http://localhost:5000/admin.html` | Dashboard administrateur |

---

## 🌐 Pages et fonctionnalités

### Frontend (SPA — Single Page Application)
| Route Hash | Page |
|------------|------|
| `#home` | Page d'accueil |
| `#catalogue` | Catalogue produits + filtres |
| `#catalogue?cat=Électricité` | Catalogue par catégorie |
| `#catalogue?search=makita` | Recherche |
| `#product?id=<id>` | Fiche produit détaillée |
| `#auth` | Connexion / Inscription |
| `#profile` | Mon compte |
| `#profile?tab=orders` | Mes commandes |
| `#profile?tab=quotes` | Mes devis |
| `#quote` | Demande de devis Pro |
| `#checkout` | Processus de commande |
| `#admin` | Dashboard admin (redirige vers admin.html) |

### Admin Dashboard (`/admin.html`)
- 📊 **Statistiques** : visiteurs, commandes, CA, taux rebond
- 📈 **Graphiques** : trafic 30j, sources, CA mensuel, langues, horaire
- 🛒 **Commandes** : liste, filtres, mise à jour statut
- 📦 **Produits** : CRUD complet, stock critique
- 👥 **Utilisateurs** : gestion, activation/désactivation
- 📋 **Devis** : traitement des demandes Pro
- ⚙️ **Paramètres** : configuration site, livraison, paiements

---

## 🔌 API REST — Endpoints

### Authentification
```
POST   /api/auth/register          Inscription
POST   /api/auth/login             Connexion
GET    /api/auth/logout            Déconnexion
GET    /api/auth/me                Profil utilisateur connecté
PUT    /api/auth/profile           Modifier le profil
PUT    /api/auth/password          Changer le mot de passe
PUT    /api/auth/wishlist/:id      Ajouter/retirer des favoris
```

### Produits
```
GET    /api/products               Liste (filtres: category, brand, search, sort, minPrice, maxPrice)
GET    /api/products/featured      Produits vedettes
GET    /api/products/:id           Détail produit
GET    /api/products/:id/related   Produits similaires
POST   /api/products               Créer (admin)
PUT    /api/products/:id           Modifier (admin)
DELETE /api/products/:id           Archiver (admin)
POST   /api/products/:id/reviews   Ajouter un avis (auth)
```

### Commandes
```
POST   /api/orders                 Passer une commande (auth)
GET    /api/orders/my              Mes commandes (auth)
GET    /api/orders/:id             Détail commande (auth)
GET    /api/orders                 Toutes les commandes (admin)
PUT    /api/orders/:id/status      Mettre à jour statut (admin)
```

### Devis
```
POST   /api/quotes                 Demander un devis (auth)
GET    /api/quotes/my              Mes devis (auth)
GET    /api/quotes                 Tous les devis (admin)
PUT    /api/quotes/:id             Répondre à un devis (admin)
```

### Utilisateurs
```
GET    /api/users                  Liste utilisateurs (admin)
PUT    /api/users/:id              Modifier utilisateur (admin)
DELETE /api/users/:id              Désactiver utilisateur (admin)
```

### Dashboard Admin
```
GET    /api/dashboard/stats        Statistiques globales (admin)
GET    /api/dashboard/activity     Activité récente (admin)
```

---

## 🌍 Langues supportées

| Code | Langue | Drapeau |
|------|--------|---------|
| FR | Français | 🇫🇷 |
| EN | English | 🇬🇧 |
| AR | عربي | 🇸🇦 |
| PT | Português | 🇵🇹 |
| ES | Español | 🇪🇸 |
| DE | Deutsch | 🇩🇪 |
| RU | Русский | 🇷🇺 |
| DA | Dansk | 🇩🇰 |
| ZH | 中文 | 🇨🇳 |
| IT | Italiano | 🇮🇹 |

---

## 💳 Modes de paiement

| Mode | Identifiant API |
|------|----------------|
| Orange Money | `orange_money` |
| MTN MoMo | `mtn_momo` |
| Carte bancaire | `card` |
| Virement bancaire | `wire` |
| Paiement à la livraison | `cod` |

---

## 🔐 Sécurité

- **JWT** (JSON Web Tokens) avec expiration configurable
- **bcryptjs** : hachage des mots de passe (12 rounds)
- **Helmet.js** : en-têtes de sécurité HTTP
- **Rate limiting** : 200 req/15min par IP
- **CORS** : origines autorisées configurables
- **Validation** : entrées validées côté serveur

---

## 📦 Technologies utilisées

| Couche | Technologies |
|--------|-------------|
| **Backend** | Node.js, Express.js, Mongoose |
| **Base de données** | MongoDB |
| **Auth** | JWT, bcryptjs |
| **Frontend** | HTML5, CSS3, JavaScript ES6+ (SPA vanilla) |
| **Icônes** | Tabler Icons |
| **Graphiques** | Chart.js 4 |
| **Sécurité** | Helmet, express-rate-limit, CORS |

---

## 🚀 Déploiement Production

### Variables d'environnement (`.env`)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/sonecomxpro
JWT_SECRET=<secret_très_long_et_aléatoire>
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7
CLIENT_URL=https://www.sonecomxpro.cm
```

### Avec PM2
```bash
npm install -g pm2
pm2 start backend/server.js --name sonecomx-pro
pm2 save
pm2 startup
```

### Avec Docker (optionnel)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "backend/server.js"]
```

---

## 📋 Catégories disponibles

1. Boulonnerie & Sécurité (2 100 réf.)
2. Électroménager (480 réf.)
3. Équipement industriel (940 réf.)
4. Échelle & Escabeau (160 réf.)
5. Matériel agricole (520 réf.)
6. Lavage & Manutention (310 réf.)
7. Parc métallique (200 réf.)
8. Matériel chantier (870 réf.)
9. Plomberie industrielle (740 réf.)
10. Pneu & Huile (390 réf.)
11. Sanitaire & Carreaux (610 réf.)
12. Électricité (1 100 réf.)
13. Consommable & Logistique (1 450 réf.)
14. Portatif & Accessoires (820 réf.)
15. Peinture & Étanchéité (540 réf.)
16. EPI & Signalisation (340 réf.)

---

© 2025 SONECOMX PRO SARL — La maison des professionnels
