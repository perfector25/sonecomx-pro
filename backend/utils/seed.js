require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

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

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');

    await User.deleteMany();
    await Category.deleteMany();
    try {
      await Category.collection.dropIndex('slug_1');
    } catch (e) {
      // Ignorer si l'index n'existe pas
    }
    await Product.deleteMany();
    try {
      await Product.collection.dropIndex('slug_1');
    } catch (e) {
      // Ignorer si l'index n'existe pas
    }
    console.log('🗑  Collections vidées');

    // Admin user
    await User.create({
      firstName: 'Admin', lastName: 'SONECOMX',
      email: 'admin@sonecomxpro.cm', password: 'Admin2025!',
      role: 'admin', isActive: true, isEmailVerified: true
    });
    // Test user
    await User.create({
      firstName: 'Thomas', lastName: 'Mballa',
      email: 'thomas@test.cm', password: 'Test2025!',
      role: 'pro', company: 'Bâtipro SARL', isActive: true, isEmailVerified: true
    });
    console.log('👤 Utilisateurs créés');

    const createdCats = await Category.create(categories);
    console.log('📦 Catégories créées');

    const catMap = {};
    createdCats.forEach(c => { catMap[c.name] = c._id; });

    const products = [
      { name: 'Perceuse à percussion Makita 18V',      brand: 'Makita',   category: catMap['Portatif & Accessoires'],   price: 111900, discount: 20, stock: 45, isFeatured: true, isNew: true,  description: 'Perceuse à percussion sans fil 18V, mandrin 13mm, couple max 40Nm. Livrée avec 2 batteries 3Ah et chargeur rapide en valise.',   shortDesc: 'Perceuse sans fil 18V 3Ah kit complet',   tags: ['perceuse','makita','18v','sans fil'], rating: 4.8, numReviews: 342 },
      { name: 'Meuleuse angulaire Bosch 125mm 1400W',  brand: 'Bosch',    category: catMap['Portatif & Accessoires'],   price: 45000,  discount: 0,  stock: 32, isFeatured: true, isNew: true,  description: 'Meuleuse angulaire professionnelle 1400W, disque 125mm, régulateur électronique de vitesse, protection anti-relancement.',           shortDesc: 'Meuleuse 125mm 1400W pro',                 tags: ['meuleuse','bosch','125mm','électrique'], rating: 4.5, numReviews: 89  },
      { name: 'Clé dynamométrique Stanley 1/2"',       brand: 'Stanley',  category: catMap['Portatif & Accessoires'],   price: 23000,  discount: 20, stock: 68, isFeatured: true, isNew: false, description: 'Clé dynamométrique 1/2" 40–200 Nm, graduation 2 Nm, cliquet réversible, mécanisme à cliquet précision ±4%, livrée en coffret.',  shortDesc: '40–200 Nm précision ±4%',                 tags: ['clé','dynamométrique','stanley'], rating: 4.9, numReviews: 128 },
      { name: 'Tableau électrique Legrand 12 modules', brand: 'Legrand',  category: catMap['Électricité & Solaire'],     price: 15000,  discount: 14, stock: 120, isFeatured: true, isNew: false, description: 'Tableau électrique encastrable 12 modules, IP40, avec porte transparente. Prévu pour disjoncteurs DX3. Conforme NF EN 61439.',    shortDesc: '12 modules IP40 encastrable',              tags: ['tableau','électrique','legrand'], rating: 4.4, numReviews: 56  },
      { name: 'Cheville chimique Fischer 345ml',       brand: 'Fischer',  category: catMap['Boulonnerie & Sécurité'],   price: 8400,   discount: 0,  stock: 200, isFeatured: false, isNew: false, description: 'Cheville chimique résine époxy bi-composant 345ml, pour béton fissuré et non fissuré, portée jusqu\'à 4500 Nm.',                shortDesc: 'Résine époxy 345ml béton fissuré',         tags: ['cheville','chimique','fischer','époxy'], rating: 4.7, numReviews: 73  },
      { name: 'Casque de chantier Uvex EPI Classe A',  brand: 'Uvex',     category: catMap['EPI & Signalisation'],      price: 9000,   discount: 17, stock: 250, isFeatured: true, isNew: false, description: 'Casque de protection classe A conforme EN 397, coque HDPE, réglage rotatif 52–63cm, 6 points de suspension, couleur jaune fluo.',  shortDesc: 'Classe A EN 397 jaune fluo',               tags: ['casque','uvex','epi','protection'], rating: 4.9, numReviews: 214 },
      { name: 'Niveau laser croix Stabila 20m',        brand: 'Stabila',  category: catMap['Portatif & Accessoires'],   price: 44000,  discount: 12, stock: 28, isFeatured: false, isNew: true,  description: 'Niveau laser croix automatique, portée 20m, précision ±0.3mm/m, IP54, livré avec récepteur laser LR 80 et trépied.',              shortDesc: '20m portée ±0.3mm/m IP54',                 tags: ['niveau','laser','stabila','croix'], rating: 4.6, numReviews: 45  },
      { name: 'Peinture façade Sikkens 15L',           brand: 'Sikkens',  category: catMap['Peinture & Étanchéité'],    price: 35000,  discount: 11, stock: 80, isFeatured: false, isNew: false, description: 'Peinture façade imperméabilisante, haute élasticité, résistance aux intempéries, couverture 6–8 m²/L en 2 couches, 35 teintes.',  shortDesc: 'Imperméabilisante 15L 35 teintes',         tags: ['peinture','sikkens','façade'], rating: 4.3, numReviews: 62  },
      { name: 'Serrure 3 points Vachette A2P',         brand: 'Vachette', category: catMap['Boulonnerie & Sécurité'],   price: 50000,  discount: 14, stock: 40, isFeatured: false, isNew: false, description: 'Serrure encastrée 3 points haute sécurité certifiée A2P**, crémone 5 pistons, anti-crochetage, anti-perçage, coffre 45mm.',      shortDesc: 'Certifiée A2P** 3 points 5 pistons',      tags: ['serrure','vachette','3 points','sécurité'], rating: 4.8, numReviews: 91  },
      { name: 'Robinet thermostatique Grohe 34mm',     brand: 'Grohe',    category: catMap['Carreaux & Sanitaire'],     price: 56000,  discount: 0,  stock: 22, isFeatured: false, isNew: true,  description: 'Mitigeur de douche thermostatique Grohtherm 1000, limiteur de température 38°C, corps laiton chromé, certification WRAS.',        shortDesc: 'Thermostatique 38°C sécurité laiton',     tags: ['robinet','grohe','thermostatique'], rating: 4.7, numReviews: 18  },
      { name: 'Coffret 94 pièces Facom douilles',      brand: 'Facom',    category: catMap['Portatif & Accessoires'],   price: 75000,  discount: 11, stock: 15, isFeatured: true, isNew: false, description: 'Coffret 94 pièces douilles métriques 1/4" et 1/2", clé à cliquet réversible, jeu d\'embouts 25mm, coffret soufflé ABS.',         shortDesc: '94 pièces 1/4" & 1/2" coffret ABS',      tags: ['facom','coffret','douilles','métriques'], rating: 4.9, numReviews: 214 },
      { name: 'Lampe frontale Petzl 800lm',            brand: 'Petzl',    category: catMap['EPI & Signalisation'],      price: 22000,  discount: 0,  stock: 55, isFeatured: false, isNew: true,  description: 'Lampe frontale rechargeable ACTIK CORE 800 lumens, portée 100m, 4 modes éclairage, batterie USB-C, IP67, poids 100g.',           shortDesc: 'Rechargeable 800lm 100m IP67',             tags: ['lampe','petzl','frontale','rechargeable'], rating: 4.8, numReviews: 31  },
    ];

    products.forEach((p, idx) => {
      p.thumbnail = `/images/products/${p.brand.toLowerCase()}-${p.name.toLowerCase().replace(/[^a-z0-9]/g,'-').substring(0,20)}.jpg`;
      p.images = [p.thumbnail];
      p.sku = `SNX-${p.brand.substring(0,3).toUpperCase()}-${String(idx + 1).padStart(3, '0')}`;
    });

    await Product.create(products);
    console.log('🛒 Produits créés');
    console.log('\n✅ Seed terminé avec succès !');
    console.log('📧 Admin: admin@sonecomxpro.cm / Admin2025!');
    console.log('📧 User:  thomas@test.cm / Test2025!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur seed:', err.message);
    process.exit(1);
  }
};

seed();
