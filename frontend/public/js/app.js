/* ═══════════════════════════════════════════════════════════
   SONECOMX PRO — Main App JS
   Architecture: SPA with hash routing, REST API, LocalStorage
═══════════════════════════════════════════════════════════ */

const API = '/api';

/* ── State ─────────────────────────────────────────────── */
const State = {
  user: null,
  token: localStorage.getItem('snx_token'),
  cart: JSON.parse(localStorage.getItem('snx_cart') || '[]'),
  wishlist: [],
  categories: [],
  lang: localStorage.getItem('snx_lang') || 'FR',
};

/* ── HTTP Helper ─────────────────────────────────────────── */
const Http = {
  async req(method, url, data = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (State.token) opts.headers['Authorization'] = `Bearer ${State.token}`;
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(API + url, opts);
    const json = await res.json();
    if (!json.success && res.status === 401) { Auth.logout(); }
    return json;
  },
  get: (url) => Http.req('GET', url),
  post: (url, data) => Http.req('POST', url, data),
  put: (url, data) => Http.req('PUT', url, data),
  delete: (url) => Http.req('DELETE', url),
};

/* ── Toast ───────────────────────────────────────────────── */
const Toast = {
  show(msg, type = 'info', duration = 3500) {
    const icons = { success: 'ti-check', error: 'ti-alert-circle', warning: 'ti-alert-triangle', info: 'ti-info-circle' };
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="ti ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, duration);
  }
};

/* ── Cart ────────────────────────────────────────────────── */
const Cart = {
  save() { localStorage.setItem('snx_cart', JSON.stringify(State.cart)); Cart.updateBadge(); },
  updateBadge() {
    const total = State.cart.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-count, .mobile-cart-badge').forEach(el => { el.textContent = total; el.style.display = total ? '' : 'none'; });
  },
  add(product, qty = 1) {
    const existing = State.cart.find(i => i._id === product._id);
    if (existing) { existing.qty += qty; }
    else { State.cart.push({ _id: product._id, name: product.name, brand: product.brand, price: product.price, qty, icon: product.icon || '🔧' }); }
    Cart.save();
    Toast.show(`<strong>${product.name}</strong> ajouté au panier`, 'success');
    Cart.renderSidebar();
  },
  remove(id) { State.cart = State.cart.filter(i => i._id !== id); Cart.save(); Cart.renderSidebar(); },
  updateQty(id, delta) {
    const item = State.cart.find(i => i._id === id);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    Cart.save(); Cart.renderSidebar();
  },
  getTotal() { return State.cart.reduce((s, i) => s + i.price * i.qty, 0); },
  getShipping() { return Cart.getTotal() >= 50000 ? 0 : 2500; },
  renderSidebar() {
    const el = document.getElementById('cartItems');
    if (!el) return;
    if (State.cart.length === 0) {
      el.innerHTML = `<div class="cart-empty"><i class="ti ti-shopping-cart"></i><p>Votre panier est vide</p></div>`;
    } else {
      el.innerHTML = State.cart.map(item => `
        <div class="cart-item">
          <div class="cart-item-img">${item.icon || '🔧'}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-brand">${item.brand || ''}</div>
            <div class="cart-item-price">${fmt(item.price * item.qty)}</div>
            <div class="cart-qty">
              <button class="cart-qty-btn" onclick="Cart.updateQty('${item._id}',-1)">−</button>
              <span class="cart-qty-val">${item.qty}</span>
              <button class="cart-qty-btn" onclick="Cart.updateQty('${item._id}',1)">+</button>
            </div>
          </div>
          <button class="cart-remove" onclick="Cart.remove('${item._id}')"><i class="ti ti-x"></i></button>
        </div>`).join('');
    }
    const sub = Cart.getTotal(), ship = Cart.getShipping(), tax = Math.round(sub * 0.1925);
    document.getElementById('cartSubtotal').textContent = fmt(sub);
    document.getElementById('cartShipping').textContent = ship === 0 ? 'Gratuit' : fmt(ship);
    document.getElementById('cartTax').textContent = fmt(tax);
    document.getElementById('cartTotal').textContent = fmt(sub + ship + tax);
  },
  open() { document.getElementById('cartSidebar').classList.add('open'); document.getElementById('cartOverlay').classList.add('open'); Cart.renderSidebar(); },
  close() { document.getElementById('cartSidebar').classList.remove('open'); document.getElementById('cartOverlay').classList.remove('open'); }
};

/* ── Auth ────────────────────────────────────────────────── */
const Auth = {
  async login(email, password) {
    const res = await Http.post('/auth/login', { email, password });
    if (res.success) { State.token = res.token; State.user = res.user; localStorage.setItem('snx_token', res.token); Auth.updateUI(); return true; }
    return res.message || 'Erreur de connexion';
  },
  async register(data) {
    Toast.show("La création de compte client est désactivée. Cette plateforme est un site vitrine.", 'warning');
    return "La création de compte est désactivée.";
  },
  logout() { State.token = null; State.user = null; localStorage.removeItem('snx_token'); Auth.updateUI(); Router.go('home'); },
  async fetchMe() {
    if (!State.token) return;
    const res = await Http.get('/auth/me');
    if (res.success) { State.user = res.data; State.wishlist = res.data.wishlist?.map(p => p._id || p) || []; }
    else { State.token = null; localStorage.removeItem('snx_token'); }
  },
  updateUI() {
    const loggedIn = !!State.user;
    document.querySelectorAll('.auth-show-logged').forEach(el => el.style.display = loggedIn ? '' : 'none');
    document.querySelectorAll('.auth-show-guest').forEach(el => el.style.display = loggedIn ? 'none' : '');
    if (loggedIn) {
      document.querySelectorAll('.user-name-display').forEach(el => el.textContent = State.user.firstName);
      if (State.user.role === 'admin') document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    }
  }
};

const T = {
  FR: {
    tagline: 'La maison des professionnels', search: 'Rechercher un produit, une marque...', allDepts: 'TOUS LES RAYONS', promotions: 'Promotions', proQuote: 'Devis Pro', delivery: 'Livraison', heroBadge: 'Nouvelle collection 2025', heroTitle: 'Matériaux &<br><span>Équipements</span><br>Professionnels', heroDesc: 'Outillage, quincaillerie, EPI, matériel de chantier et industriel pour les professionnels.', seeCatalog: 'Voir le catalogue', requestQuote: 'Demander un devis', ourDepts: 'Nos rayons', allDeptsLink: 'Tous les rayons', bestSellers: 'Meilleures ventes', seeAll: 'Voir tout', stayInfo: 'Restez informé', subscribeTitle: 'Inscrivez-vous à nos offres', subscribeDesc: 'Recevez en avant-première nos promotions, nouveautés et conseils techniques.', emailPH: 'Votre adresse e-mail...', subscribBtn: "S'inscrire", promoEye: 'Offre professionnelle', promoTitle: 'Livraison partout dans le <span>territoire national</span>', promoDesc: 'Pour toute commande supérieure à 50 000 F CFA — livraison sous 24h.', orderNow: 'Consulter le catalogue & Devis', deliveryZones: 'Zones de livraison', freeDel: 'Livraison rapide', freeDel2: '24h grandes villes', certified: 'Produits certifiés', certified2: 'Garantie fabricant', securePay: 'Devis sur mesure', securePay2: 'Réponse sous 24h', proAcc: 'Compte Pro', proAcc2: 'Devis & facturation', experts: 'Conseils experts', experts2: 'Techniciens dispo', ourBrands: 'Nos marques', login: 'Connexion', register: "S'inscrire", myAccount: 'Mon compte', logout: 'Déconnexion', cart: 'Ma sélection (Devis)', aboutUs: 'À notre sujet', proServices: 'Services Pro', helpSupport: 'Aide & Support', payments: 'Devis & Conseils',
    topbarCities: 'Yaoundé — Douala — Bafoussam', topbarHours: 'Lun–Sam : 7h30–18h', becomeReseller: 'Devenir revendeur', proServiceQuote: 'Service Pro & Devis en ligne', deptBoulonnerie: 'Boulonnerie', deptChantier: 'Chantier', deptElectricite: 'Électricité', deptPlomberie: 'Plomberie', deptPeinture: 'Peinture', deptEPI: 'EPI', deptIndustriel: 'Industriel', deptAgricole: 'Agricole', virtualVisit: 'Visite Virtuelle', allDeptsTitle: 'TOUS NOS RAYONS', categoriesLabel: 'CATÉGORIES', cartEmpty: 'Votre sélection de produits est vide', subtotal: 'Sous-total', vat: 'TVA (19.25%)', total: 'Total', checkoutBtn: 'Demander un devis pour ma sélection', whoWeAre: 'Qui sommes-nous', ourAgencies: 'Nos agences', careers: 'Recrutement', contact: 'Contact', onlineQuote: 'Devis en ligne', siteDelivery: 'Livraison chantier', companyAccount: 'Compte entreprise', training: 'Formation', orderTracking: 'Suivi demande', returnsRefunds: 'Retours & remboursements', warranties: 'Garanties', faq: 'FAQ', privacy: 'Confidentialité', termsOfService: 'CGV', hello: 'Bonjour, ', myRecs: 'Mes recommandations', deliveryTracking: 'Suivi livraison', myOrders: 'Mes demandes', electricalTools: 'Outillage électrique', promoDiscount30: "Gamme professionnelle", electricity: 'Électricité', newLed: 'Nouveautés LED', constructionMaterial: 'Matériel chantier', cementsIronEquip: 'Ciment, fers, équipements', newArrivals: 'Nouveautés', noProductFound: 'Aucun produit trouvé.', home: 'Accueil', catalogueTitle: 'Catalogue', all: 'Tout', sortBy: 'Trier par', priceAsc: 'Prix croissant', priceDesc: 'Prix décroissant', topRated: 'Mieux notés', loading: 'Chargement...', productSingular: 'produit', productPlural: 'produits', noProductFoundTitle: 'Aucun produit trouvé', tryOtherFilters: "Essayez d'autres filtres", promoHeaderTitle: '🔥 Offres Spéciales & Promotions', promoHeaderDesc: "Profitez de réductions exclusives et d'offres limitées sur tout le matériel et équipement professionnel.", onSale: 'en promotion', noPromoActive: 'Aucune promotion en cours', noPromoDesc: 'Revenez plus tard pour découvrir nos offres', brandLabel: 'Marque :', clientReview: 'avis client', clientReviews: 'avis client', noDesc: 'Aucune description disponible.', addToCart: 'Ajouter à ma sélection (Devis)', skuLabel: 'Référence :', categoryLabel: 'Catégorie :', availabilityLabel: 'Disponibilité :', inStock: 'En stock', outOfStock: 'Rupture de stock', units: 'unités', shareProduct: 'Partager ce produit :', descriptionTab: 'Description', specsTab: 'Fiche Technique', reviewsTab: 'Avis', proReviews: 'Avis des professionnels', userLabel: 'Utilisateur', noReviews: 'Aucun avis pour le moment sur ce produit.', relatedProducts: 'Produits similaires', noRelatedProducts: 'Aucun produit similaire trouvé', authSub: 'Accédez à votre espace personal SONECOMX PRO', noAccount: 'Pas de compte ?', createAccount: 'Créer un compte', registerSub: 'Rejoignez la communauté SONECOMX PRO', firstNameLabel: 'Prénom', lastNameLabel: 'Nom', emailLabel: 'Email', phoneLabel: 'Téléphone', accountTypeLabel: 'Type de compte', individualOption: 'Particulier', proOption: 'Professionnel / Entreprise', companyLabel: 'Entreprise', companyPH: 'Nom de votre entreprise', passwordLabel: 'Mot de passe', passwordPH: 'Minimum 6 caractères', registerBtn: 'Créer mon compte', alreadyRegistered: 'Déjà inscrit ?', myInfo: 'Mes informations', myOrdersTab: 'Mes demandes', myQuotesTab: 'Mes devis', favorites: 'Favoris', security: 'Sécurité', adminDashboard: 'Dashboard Admin', saveChanges: 'Enregistrer les modifications', orderNumLabel: 'N° Demande', dateLabel: 'Date', totalLabel: 'Total', statusLabel: 'Statut', noOrders: 'Aucune demande', noOrdersDesc: 'Vos demandes de devis apparaîtront ici', startShopping: 'Découvrir le catalogue', quoteNumLabel: 'N° Devis', replyLabel: 'Réponse', noQuotes: 'Aucun devis', noQuotesDesc: 'Vos demandes de devis apparaîtront ici', currentPasswordLabel: 'Mot de passe actuel', newPasswordLabel: 'Nouveau mot de passe', confirmPasswordLabel: 'Confirmer le nouveau mot de passe', changePasswordBtn: 'Modifier le mot de passe', noFavoritesDesc: 'Vos produits favoris apparaîtront ici', quotePageTitle: 'Demande de devis Pro', quotePageDesc: 'Décrivez vos besoins et notre équipe vous répondra sous 24h avec un devis personnalisé.', needsDescLabel: 'Description des besoins', needsDescPH: 'Décrivez les produits dont vous avez besoin (quantités, références, délais...)', itemsOptional: 'Articles (optionnel)', itemDescPH: 'Description article', qtyPH: 'Qté', addItemBtn: 'Ajouter un article', sendRequestBtn: 'Envoyer la demande', shippingAddressLabel: 'Coordonnées & Adresse de livraison', fullNameLabel: 'Nom complet', addressLabel: 'Adresse', addressPH: 'Rue, quartier, boîte postale', cityLabel: 'Ville', regionLabel: 'Région', notesOptional: 'Notes (optionnel)', notesPH: 'Instructions de livraison, référence commande entreprise...', orderSummary: 'Récapitulatif de ma sélection', confirmOrderBtn: 'Transmettre ma demande de devis', secureCheckout: 'Demande sans engagement — Cotation sous 24h', showroomTitle: 'Visite Virtuelle du Showroom', showroomDesc: "Plongez au cœur de notre espace de vente à Yaoundé. Explorez nos rayons d'outillage, équipements professionnels et quincaillerie comme si vous y étiez.", immersive3DTitle: 'Espace immersif 3D', immersive3DDesc: "L'intégration de l'environnement 3D se fera ici.", startInteractiveTour: 'Lancer la visite interactive', aboutUsTitle: 'À propos de', aboutUsDesc: 'SONECOMX PRO SARL est le leader de la distribution de matériel professionnel au Cameroun. Nous accompagnons les artisans, les PME et les grandes industries avec des produits certifiés, un support technique de pointe et une logistique sans faille.', ourMissionTitle: 'Notre Mission', ourVisionDesc: 'Fournir les meilleurs outils et équipements aux professionnels pour garantir la réussite et la sécurité de leurs chantiers.', ourVisionTitle: 'Notre Vision', ourVisionDesc: "Devenir le partenaire de référence de l'industrie africaine, reconnu pour notre innovation et notre fiabilité.",
    free: 'Gratuit', newBadge: 'Nouveau', status_pending: 'En attente', status_processing: 'En traitement', status_shipped: 'Expédiée', status_delivered: 'Livrée', status_cancelled: 'Annulée', status_accepted: 'Accepté', status_rejected: 'Refusé', loading3D: "Chargement de l'environnement 3D...", skuTitle: 'Référence', brandTitle: 'Marque', stock: 'Stock', adminRole: 'Administrateur', fillAllFields: 'Remplissez tous les champs', loginSuccess: 'Connexion réussie ! Bienvenue 👋', fillRequiredFields: 'Remplissez tous les champs obligatoires', registerSuccess: 'Compte créé avec succès ! Bienvenue 🎉', profileUpdated: 'Profil mis à jour', passwordChanged: 'Mot de passe modifié', passwordsMismatch: 'Les mots de passe ne correspondent pas', addedToCart: 'ajouté à votre sélection', addedToWishlist: 'Ajouté aux favoris', removedFromWishlist: 'Retiré des favoris', orderConfirmed: 'Demande transmise', quoteSentSuccess: 'Devis envoyé ! Notre équipe vous répondra sous 24h. 📋', proSelection: 'Sélection Pro', proEquipDesc: 'Équipement professionnel complet', siteSafety: 'Sécurité chantier', epiDesc: 'Casques, gants, harnais, balisage'
  },
  EN: {
    tagline: 'The house of professionals', search: 'Search product, brand...', allDepts: 'ALL DEPARTMENTS', promotions: 'Promotions', proQuote: 'Pro Quote', delivery: 'Delivery', heroBadge: 'New Collection 2025', heroTitle: 'Materials &<br><span>Professional</span><br>Equipment', heroDesc: 'Tools, hardware, PPE and construction equipment for demanding professionals.', seeCatalog: 'View catalogue', requestQuote: 'Request a quote', ourDepts: 'Our departments', allDeptsLink: 'All departments', bestSellers: 'Best sellers', seeAll: 'See all', stayInfo: 'Stay informed', subscribeTitle: 'Subscribe to our offers', subscribeDesc: 'Get promotions, new arrivals and technical tips first.', emailPH: 'Your email address...', subscribBtn: 'Subscribe', promoEye: 'Professional offer', promoTitle: 'Free delivery across <span>Cameroon</span>', promoDesc: 'For any order over 50,000 CFA — delivery in 24h in major cities.', orderNow: 'Order now', deliveryZones: 'Delivery zones', freeDel: 'Fast delivery', freeDel2: '24h major cities', certified: 'Certified products', certified2: 'Manufacturer warranty', securePay: 'Secure payment', securePay2: 'Mobile Money, card', proAcc: 'Pro account', proAcc2: 'Quotes & invoicing', experts: 'Expert advice', experts2: 'Technicians available', ourBrands: 'Our brands', login: 'Login', register: 'Register', myAccount: 'My account', logout: 'Logout', cart: 'Cart', aboutUs: 'About us', proServices: 'Pro Services', helpSupport: 'Help & Support', payments: 'Payments',
    topbarCities: 'Yaounde — Douala — Bafoussam', topbarHours: 'Mon–Sat: 7:30 AM – 6:00 PM', becomeReseller: 'Become a reseller', proServiceQuote: 'Pro Service & Online Quote', deptBoulonnerie: 'Bolts & Screws', deptChantier: 'Jobsite', deptElectricite: 'Electricity', deptPlomberie: 'Plumbing', deptPeinture: 'Painting', deptEPI: 'PPE', deptIndustriel: 'Industrial', deptAgricole: 'Agricultural', virtualVisit: 'Virtual Tour', allDeptsTitle: 'ALL OUR DEPARTMENTS', categoriesLabel: 'CATEGORIES', cartEmpty: 'Your cart is empty', subtotal: 'Subtotal', vat: 'VAT (19.25%)', total: 'Total', checkoutBtn: 'Checkout', whoWeAre: 'Who we are', ourAgencies: 'Our stores', careers: 'Careers', contact: 'Contact', onlineQuote: 'Online quote', siteDelivery: 'Jobsite delivery', companyAccount: 'Company account', training: 'Training', orderTracking: 'Order tracking', returnsRefunds: 'Returns & refunds', warranties: 'Warranties', faq: 'FAQ', privacy: 'Privacy Policy', termsOfService: 'Terms of Service', hello: 'Hello, ', myRecs: 'My recommendations', deliveryTracking: 'Delivery tracking', myOrders: 'My orders', electricalTools: 'Power tools', promoDiscount30: 'Promo up to -30%', electricity: 'Electricity', newLed: 'New LED arrivals', constructionMaterial: 'Construction equipment', cementsIronEquip: 'Cement, steel, equipment', newArrivals: 'New arrivals', noProductFound: 'No products found.', home: 'Home', catalogueTitle: 'Catalogue', all: 'All', sortBy: 'Sort by', priceAsc: 'Price: Low to High', priceDesc: 'Price: High to Low', topRated: 'Top Rated', loading: 'Loading...', productSingular: 'product', productPlural: 'products', noProductFoundTitle: 'No products found', tryOtherFilters: 'Try other filters', promoHeaderTitle: '🔥 Special Offers & Promotions', promoHeaderDesc: 'Enjoy exclusive discounts and limited offers on all professional tools and equipment.', onSale: 'on sale', noPromoActive: 'No current promotions', noPromoDesc: 'Check back later to discover our offers', brandLabel: 'Brand:', clientReview: 'customer review', clientReviews: 'customer reviews', noDesc: 'No description available.', addToCart: 'Add to cart', skuLabel: 'SKU:', categoryLabel: 'Category:', availabilityLabel: 'Availability:', inStock: 'In stock', outOfStock: 'Out of stock', units: 'units', shareProduct: 'Share this product:', descriptionTab: 'Description', specsTab: 'Specs', reviewsTab: 'Reviews', proReviews: 'Professional reviews', userLabel: 'User', noReviews: 'No reviews for this product yet.', relatedProducts: 'Related products', noRelatedProducts: 'No related products found', authSub: 'Access your personal Sonecomx Pro area', noAccount: 'No account?', createAccount: 'Create an account', registerSub: 'Join the Sonecomx Pro community', firstNameLabel: 'First Name', lastNameLabel: 'Last Name', emailLabel: 'Email', phoneLabel: 'Phone', accountTypeLabel: 'Account Type', individualOption: 'Individual', proOption: 'Professional / Company', companyLabel: 'Company', companyPH: 'Your company name', passwordLabel: 'Password', passwordPH: 'Minimum 6 characters', registerBtn: 'Create my account', alreadyRegistered: 'Already registered?', myInfo: 'My Info', myOrdersTab: 'My Orders', myQuotesTab: 'My Quotes', favorites: 'Favorites', security: 'Security', adminDashboard: 'Admin Dashboard', saveChanges: 'Save changes', orderNumLabel: 'Order No.', dateLabel: 'Date', totalLabel: 'Total', statusLabel: 'Status', noOrders: 'No orders', noOrdersDesc: 'Your orders will appear here', startShopping: 'Start shopping', quoteNumLabel: 'Quote No.', replyLabel: 'Reply', noQuotes: 'No quotes', noQuotesDesc: 'Your quote requests will appear here', currentPasswordLabel: 'Current Password', newPasswordLabel: 'New Password', confirmPasswordLabel: 'Confirm New Password', changePasswordBtn: 'Change Password', noFavoritesDesc: 'Your favorite products will appear here', quotePageTitle: 'Pro Quote Request', quotePageDesc: 'Describe your needs and our team will get back to you within 24h with a personalized quote.', needsDescLabel: 'Description of needs', needsDescPH: 'Describe the products you need (quantities, SKUs, deadlines...)', itemsOptional: 'Items (optional)', itemDescPH: 'Item description', qtyPH: 'Qty', addItemBtn: 'Add an item', sendRequestBtn: 'Send request', shippingAddressLabel: 'Shipping Address', fullNameLabel: 'Full Name', addressLabel: 'Address', addressPH: 'Street, neighborhood, P.O. Box', cityLabel: 'City', regionLabel: 'Region', notesOptional: 'Notes (optional)', notesPH: 'Delivery instructions, company purchase order reference...', orderSummary: 'Order Summary', confirmOrderBtn: 'Confirm order', secureCheckout: '100% secure checkout', showroomTitle: 'Virtual Showroom Tour', showroomDesc: 'Immerse yourself in our sales space in Yaonde. Explore our tool, professional equipment, and hardware departments as if you were there.', immersive3DTitle: 'Immersive 3D Space', immersive3DDesc: 'The 3D environment integration will take place here.', startInteractiveTour: 'Start interactive tour', aboutUsTitle: 'About', aboutUsDesc: 'SONECOMX PRO SARL is the leading distributor of professional equipment in Cameroon. We support craftsmen, SMEs, and large industries with certified products, advanced technical support, and seamless logistics.', ourMissionTitle: 'Our Mission', ourMissionDesc: 'To provide the best tools and equipment to professionals to ensure the success and safety of their projects.', ourVisionTitle: 'Our Vision', ourVisionDesc: 'To become the reference partner for African industry, recognized for our innovation and reliability.',
    free: 'Free', newBadge: 'New', status_pending: 'Pending', status_processing: 'Processing', status_shipped: 'Shipped', status_delivered: 'Delivered', status_cancelled: 'Cancelled', status_accepted: 'Accepted', status_rejected: 'Rejected', loading3D: 'Loading 3D environment...', skuTitle: 'SKU', brandTitle: 'Brand', stock: 'Stock', adminRole: 'Administrator', fillAllFields: 'Please fill in all fields', loginSuccess: 'Login successful! Welcome 👋', fillRequiredFields: 'Please fill in all required fields', registerSuccess: 'Account successfully created! Welcome 🎉', profileUpdated: 'Profile updated', passwordChanged: 'Password changed', passwordsMismatch: 'Passwords do not match', addedToCart: 'added to cart', addedToWishlist: 'Added to favorites', removedFromWishlist: 'Removed from favorites', orderConfirmed: 'Order confirmed', quoteSentSuccess: 'Quote request sent! Our team will reply within 24h. 📋', proSelection: 'Pro Selection', proEquipDesc: 'Complete professional equipment', siteSafety: 'Site Safety', epiDesc: 'Helmets, gloves, harnesses, marking'
  },
  AR: {
    tagline: 'بيت المحترفين', search: 'ابحث عن منتج أو علامة...', allDepts: 'جميع الأقسام', promotions: 'العروض', proQuote: 'عرض سعر', delivery: 'التوصيل', heroBadge: 'مجموعة جديدة 2025', heroTitle: 'مواد و<br><span>معدات</span><br>احترافية', heroDesc: 'أدوات، مواد بناء، معدات حماية للمحترفين والشركات.', seeCatalog: 'عرض الكتالوج', requestQuote: 'طلب عرض سعر', ourDepts: 'أقسامنا', allDeptsLink: 'جميع الأقسام', bestSellers: 'الأكثر مبيعًا', seeAll: 'عرض الكل', stayInfo: 'ابق على اطلاع', subscribeTitle: 'اشترك في عروضنا', subscribeDesc: 'احصل على العروض والمنتجات الجديدة أولاً.', emailPH: 'عنوان بريدك الإلكتروني...', subscribBtn: 'اشتрак', promoEye: 'عرض احترافي', promoTitle: 'توصيل مجاني في <span>الكاميرون</span>', promoDesc: 'لأي طلب يتجاوز 50,000 فرنك — توصيل خلال 24 ساعة.', orderNow: 'اطلب الآن', deliveryZones: 'مناطق التوصيل', freeDel: 'توصيل سريع', freeDel2: '24 ساعة المدن الكبرى', certified: 'منتجات معتمدة', certified2: 'ضمان الصانع', securePay: 'دفع آمن', securePay2: 'موبايل موني، بطاقة', proAcc: 'حساب احترافي', proAcc2: 'عروض أسعار وفواتير', experts: 'نصائح الخبراء', experts2: 'فنيون متاحون', ourBrands: 'علاماتنا', login: 'تسجيل الدخول', register: 'إنشاء حساب', myAccount: 'حسابي', logout: 'تسجيل الخروج', cart: 'السلة', aboutUs: 'معلومات عنا', proServices: 'خدمات احترافية', helpSupport: 'المساعدة', payments: 'طرق الدفع',
    topbarCities: 'ياوندي — دوالا — بافوسام', topbarHours: 'الاثنين–السبت: 7:30 ص – 6:00 م', becomeReseller: 'كن موزعًا', proServiceQuote: 'خدمة المحترفين وعرض السعر عبر الإنترنت', deptBoulonnerie: 'البراغي', deptChantier: 'موقع العمل', deptElectricite: 'الكهرباء', deptPlomberie: 'السباكة', deptPeinture: 'الطلاء', deptEPI: 'معدات الوقاية الشخصية', deptIndustriel: 'صناعي', deptAgricole: 'زراعي', virtualVisit: 'جولة افتراضية', allDeptsTitle: 'جميع أقسامنا', categoriesLabel: 'الفئات', cartEmpty: 'سلتك فارغة', subtotal: 'المجموع الفرعي', vat: 'ضريبة القيمة المضافة (19.25%)', total: 'المجموع', checkoutBtn: 'الدفع والشحن', whoWeAre: 'من نحن', ourAgencies: 'فروعنا', careers: 'الوظائف', contact: 'الاتصال', onlineQuote: 'طلب سعر عبر الإنترنت', siteDelivery: 'توصيل لموقع العمل', companyAccount: 'حساب الشركات', training: 'التدريب', orderTracking: 'تتبع الطلب', returnsRefunds: 'المرتجعات والاسترداد', warranties: 'الضمانات', faq: 'الأسئلة الشائعة', privacy: 'سياسة الخصوصية', termsOfService: 'الشروط والأحكام', hello: 'مرحبًا، ', myRecs: 'توصياتي', deliveryTracking: 'تتبع الشحن', myOrders: 'طلباتي', electricalTools: 'أدوات كهربائية', promoDiscount30: 'خصم يصل إلى 30%', electricity: 'الكهرباء', newLed: 'جديد إضاءة LED', constructionMaterial: 'معدات البناء', cementsIronEquip: 'إسمنت، حديد، معدات', newArrivals: 'وصل حديثًا', noProductFound: 'لم يتم العثور على منتجات.', home: 'الرئيسية', catalogueTitle: 'الكتالوج', all: 'الكل', sortBy: 'ترتيب حسب', priceAsc: 'السعر: من الأقل للأعلى', priceDesc: 'السعر: من الأعلى للأقل', topRated: 'الأعلى تقييمًا', loading: 'جاري التحميل...', productSingular: 'منتج', productPlural: 'منتجات', noProductFoundTitle: 'لم يتم العถور على منتجات', tryOtherFilters: 'جرّب تصفية أخرى', promoHeaderTitle: '🔥 عروض خاصة وتخفيضات', promoHeaderDesc: 'استمتع بخصومات حصرية وعروض محدودة على جميع الأدوات والمعدات الاحترافية.', onSale: 'في التخفيض', noPromoActive: 'لا توجد عروض حالية', noPromoDesc: 'تفقّد الصفحة لاحقًا لمعرفة عروضنا', brandLabel: 'العلامة التجارية:', clientReview: 'تقييم العميل', clientReviews: 'تقييمات العملاء', noDesc: 'لا يوجد وصف متاح.', addToCart: 'أضف إلى السلة', skuLabel: 'الرمز التجاري:', categoryLabel: 'الفئة:', availabilityLabel: 'التوفر:', inStock: 'متوفر في المخزون', outOfStock: 'غير متوفر', units: 'وحدات', shareProduct: 'شارك هذا المنتج:', descriptionTab: 'الوصف', specsTab: 'المواصفات الفنية', reviewsTab: 'التقييمات', proReviews: 'تقييمات المحترفين', userLabel: 'المستخدم', noReviews: 'لا توجد تقييمات لهذا المنتج بعد.', relatedProducts: 'منتجات مشابهة', noRelatedProducts: 'لم يتم العثور على منتجات مشابهة', authSub: 'الولوج إلى فضاءك الشخصي SONECOMX PRO', noAccount: 'ليس لديك حساب؟', createAccount: 'إنشاء حساب', registerSub: 'انضم إلى مجتمع SONECOMX PRO', firstNameLabel: 'الاسم الشخصي', lastNameLabel: 'الاسم العائلي', emailLabel: 'البريد الإلكتروني', phoneLabel: 'الهاتف', accountTypeLabel: 'نوع الحساب', individualOption: 'فردي', proOption: 'محترف / شركة', companyLabel: 'الشركة', companyPH: 'اسم شركتك', passwordLabel: 'كلمة المرور', passwordPH: '6 أحرف كحد أدنى', registerBtn: 'إنشاء حسابي', alreadyRegistered: 'مسجل بالفعل؟', myInfo: 'معلوماتي', myOrdersTab: 'طلباتي', myQuotesTab: 'عروض الأسعار', favorites: 'المفضلة', security: 'الأمان', adminDashboard: 'لوحة التحكم', saveChanges: 'حفظ التغييرات', orderNumLabel: 'رقم الطلب', dateLabel: 'التاريخ', totalLabel: 'المجموع', statusLabel: 'الحالة', noOrders: 'لا توجد طلبات', noOrdersDesc: 'ستظهر طلباتك هنا', startShopping: 'ابدأ التسوق', quoteNumLabel: 'رقم عرض السعر', replyLabel: 'الرد', noQuotes: 'لا توجد عروض أسعار', noQuotesDesc: 'ستظهر طلبات عروض الأسعار هنا', currentPasswordLabel: 'كلمة المرور الحالية', newPasswordLabel: 'كلمة المرور الجديدة', confirmPasswordLabel: 'تأكيد كلمة المرور الجديدة', changePasswordBtn: 'تغيير كلمة المرور', noFavoritesDesc: 'ستظهر منتجاتك المفضلة هنا', quotePageTitle: 'طلب عرض سعر للمحترفين', quotePageDesc: 'صف احتياجاتك وسيقوم فريقنا بالرد عليك في غضون 24 ساعة بعرض سعر مخصص.', needsDescLabel: 'وصف الاحتياجات', needsDescPH: 'صف المنتجات التي تحتاجها (الكميات، المراجع، الآجال...)', itemsOptional: 'المواد (اختياري)', itemDescPH: 'وصف المادة', qtyPH: 'الكمية', addItemBtn: 'إضافة مادة', sendRequestBtn: 'إرسال الطلب', shippingAddressLabel: 'عنوان الشحن', fullNameLabel: 'الاسم الكامل', addressLabel: 'العنوان', addressPH: 'الشارع، الحي، صندوق البريد', cityLabel: 'المدينة', regionLabel: 'المنطقة', notesOptional: 'ملاحظات (اختياري)', notesPH: 'تعليمات الشحن، مرجع الطلب الخاص بالشركة...', orderSummary: 'ملخص الطلب', confirmOrderBtn: 'تأكيد الطلب', secureCheckout: 'طلب آمن 100%', showroomTitle: 'جولة افتراضية في المعرض', showroomDesc: 'انغمس في قلب مساحة المبيعات لدينا في ياوندي. استكشف أقسام الأدوات والمعدات المهنية والبراغي وكأنك هناك.', immersive3DTitle: 'مساحة ثلاثية الأبعاد تفاعلية', immersive3DDesc: 'سيتم دمج البيئة ثلاثية الأبعاد هنا.', startInteractiveTour: 'بدء الجولة التفاعلية', aboutUsTitle: 'معلومات عن', aboutUsDesc: 'شركة SONECOMX PRO SARL هي الرائدة في توزيع المعدات المهنية في الكاميرون. نحن نرافق الحرفيين والشركات الصغيرة والمتوسطة والصناعات الكبرى بمنتجات معتمدة ودعم فني متطور ولوجستيات خالية من العيوب.', ourMissionTitle: 'مهمتنا', ourMissionDesc: 'توفير أفضل الأدوات والمعدات للمحترفين لضمان نجاح وسلامة مشاريعهم.', ourVisionTitle: 'رؤيتنا', ourVisionDesc: 'أن نصبح الشريك المرجعي للصناعة الأفريقية، والمعروفين بابتكارنا وموثوقيتنا.',
    free: 'مجاني', newBadge: 'جديد', status_pending: 'قيد الانتظار', status_processing: 'جاري المعalجة', status_shipped: 'تم الشحن', status_delivered: 'تم التوصيل', status_cancelled: 'ملغاة', status_accepted: 'مقبول', status_rejected: 'مرفوض', loading3D: 'جاري تحميل البيئة ثلاثية الأبعاد...', skuTitle: 'الرمز التجاري', brandTitle: 'العلامة التجارية', stock: 'المخزون', adminRole: 'مشرف', fillAllFields: 'يرجى ملء جميع الحقول', loginSuccess: 'تم تسجيل الدخول بنجاح! مرحبًا 👋', fillRequiredFields: 'يرجى ملء جميع الحقول المطلوبة', registerSuccess: 'تم إنشاء الحساب بنجاح! مرحبًا 🎉', profileUpdated: 'تم تحديث الملف الشخصي', passwordChanged: 'تم تغيير كلمة المرور', passwordsMismatch: 'كلمات المرور غير متطابقة', addedToCart: 'تمت إضافته إلى السلة', addedToWishlist: 'تمت الإضافة إلى المفضلة', removedFromWishlist: 'تمت الإزالة من المفضلة', orderConfirmed: 'تم تأكيد الطلب', quoteSentSuccess: 'تم إرسال طلب السعر! سيرد فريقنا في غضون 24 ساعة. 📋', proSelection: 'تحديد برو', proEquipDesc: 'معدات مهنية كاملة', siteSafety: 'سلامة الموقع', epiDesc: 'خوذات، قفازات، أحزمة، علامات'
  },
  ES: {
    tagline: 'La casa de los profesionales', search: 'Buscar producto, marca...', allDepts: 'TODOS LOS DEPARTAMENTOS', promotions: 'Promociones', proQuote: 'Presupuesto Pro', delivery: 'Entrega', heroBadge: 'Nueva colección 2025', heroTitle: 'Materiales y<br><span>Equipos</span><br>Profesionales', heroDesc: 'Herramientas, ferretería, EPI y material de construcción para profesionales.', seeCatalog: 'Ver catálogo', requestQuote: 'Pedir presupuesto', ourDepts: 'Nuestros departamentos', allDeptsLink: 'Todos los departamentos', bestSellers: 'Más vendidos', seeAll: 'Ver todo', stayInfo: 'Mantente informado', subscribeTitle: 'Suscríbete a nuestras ofertas', subscribeDesc: 'Recibe en primicia nuestras promociones y novedades.', emailPH: 'Tu dirección de email...', subscribBtn: 'Suscribirse', promoEye: 'Oferta profesional', promoTitle: 'Envío gratuito en <span>Camerún</span>', promoDesc: 'Para cualquier pedido superior a 50.000 CFA — entrega en 24h.', orderNow: 'Pedir ahora', deliveryZones: 'Zonas de entrega', freeDel: 'Entrega rápida', freeDel2: '24h grandes ciudades', certified: 'Productos certificados', certified2: 'Garantía fabricante', securePay: 'Pago seguro', securePay2: 'Mobile Money, tarjeta', proAcc: 'Cuenta Pro', proAcc2: 'Presupuestos y facturas', experts: 'Asesoramiento experto', experts2: 'Técnicos disponibles', ourBrands: 'Nuestras marcas', login: 'Iniciar sesión', register: 'Registrarse', myAccount: 'Mi cuenta', logout: 'Cerrar sesión', cart: 'Carrito', aboutUs: 'Sobre nosotros', proServices: 'Servicios Pro', helpSupport: 'Ayuda', payments: 'Pagos',
    topbarCities: 'Yaundé — Douala — Bafoussam', topbarHours: 'Lun–Sáb: 7:30 – 18:00', becomeReseller: 'Convertirse en distribuidor', proServiceQuote: 'Servicio Pro y Presupuesto en línea', deptBoulonnerie: 'Tornillería', deptChantier: 'Obra', deptElectricite: 'Electricidad', deptPlomberie: 'Fontanería', deptPeinture: 'Pintura', deptEPI: 'EPI', deptIndustriel: 'Industrial', deptAgricole: 'Agrícola', virtualVisit: 'Visita Virtual', allDeptsTitle: 'TODOS NUESTROS DEPARTAMENTOS', categoriesLabel: 'CATEGORÍAS', cartEmpty: 'Su carrito está vacío', subtotal: 'Subtotal', vat: 'IVA (19.25%)', total: 'Total', checkoutBtn: 'Realizar pedido', whoWeAre: 'Quiénes somos', ourAgencies: 'Nuestras tiendas', careers: 'Empleo', contact: 'Contacto', onlineQuote: 'Presupuesto en línea', siteDelivery: 'Entrega en obra', companyAccount: 'Cuenta de empresa', training: 'Formación', orderTracking: 'Seguimiento de pedido', returnsRefunds: 'Devoluciones y reembolsos', warranties: 'Garantías', faq: 'FAQ', privacy: 'Privacidad', termsOfService: 'Condiciones generales', hello: 'Hola, ', myRecs: 'Mis recomendaciones', deliveryTracking: 'Seguimiento de entrega', myOrders: 'Mis pedidos', electricalTools: 'Herramientas eléctricas', promoDiscount30: 'Promo hasta -30%', electricity: 'Electricidad', newLed: 'Novedades LED', constructionMaterial: 'Material de obra', cementsIronEquip: 'Cemento, fers, equipos', newArrivals: 'Novedades', noProductFound: 'No se encontraron productos.', home: 'Inicio', catalogueTitle: 'Catálogo', all: 'Todo', sortBy: 'Ordenar por', priceAsc: 'Precio de menor a mayor', priceDesc: 'Precio de mayor a menor', topRated: 'Mejor valorados', loading: 'Cargando...', productSingular: 'producto', productPlural: 'productos', noProductFoundTitle: 'No se encontraron productos', tryOtherFilters: 'Intente otros filtros', promoHeaderTitle: '🔥 Ofertas Especiales y Promociones', promoHeaderDesc: 'Disfrute de descuentos exclusivos y ofertas limitadas en todas las herramientas y equipos profesionales.', onSale: 'en promoción', noPromoActive: 'No hay promociones activas', noPromoDesc: 'Vuelva más tarde para descubrir nuestras ofertas', brandLabel: 'Marca:', clientReview: 'opinión de cliente', clientReviews: 'opiniones de clientes', noDesc: 'No hay descripción disponible.', addToCart: 'Añadir al carrito', skuLabel: 'Referencia:', categoryLabel: 'Categoría:', availabilityLabel: 'Disponibilidad:', inStock: 'En stock', outOfStock: 'Agotado', units: 'unidades', shareProduct: 'Compartir este producto:', descriptionTab: 'Descripción', specsTab: 'Ficha técnica', reviewsTab: 'Opiniones', proReviews: 'Opiniones de profesionales', userLabel: 'Usuario', noReviews: 'Aún no hay opiniones para este producto.', relatedProducts: 'Productos similares', noRelatedProducts: 'No se encontraron productos similares', authSub: 'Acceda a su área personal SONECOMX PRO', noAccount: '¿No tiene cuenta?', createAccount: 'Crear una cuenta', registerSub: 'Únase a la comunidad SONECOMX PRO', firstNameLabel: 'Nombre', lastNameLabel: 'Apellido', emailLabel: 'Email', phoneLabel: 'Teléfono', accountTypeLabel: 'Tipo de cuenta', individualOption: 'Particular', proOption: 'Profesional / Empresa', companyLabel: 'Empresa', companyPH: 'Nombre de su empresa', passwordLabel: 'Contraseña', passwordPH: 'Mínimo 6 caracteres', registerBtn: 'Crear mi cuenta', alreadyRegistered: '¿Ya registrado?', myInfo: 'Mis datos', myOrdersTab: 'Mis pedidos', myQuotesTab: 'Mis presupuestos', favorites: 'Favoritos', security: 'Seguridad', adminDashboard: 'Panel de administración', saveChanges: 'Guardar cambios', orderNumLabel: 'Nº Pedido', dateLabel: 'Fecha', totalLabel: 'Total', statusLabel: 'Estado', noOrders: 'Sin pedidos', noOrdersDesc: 'Sus pedidos aparecerán aquí', startShopping: 'Comenzar compras', quoteNumLabel: 'Nº Presupuesto', replyLabel: 'Respuesta', noQuotes: 'Sin presupuestos', noQuotesDesc: 'Sus solicitudes de presupuesto aparecerán aquí', currentPasswordLabel: 'Contraseña actual', newPasswordLabel: 'Nueva contraseña', confirmPasswordLabel: 'Confirmar nueva contraseña', changePasswordBtn: 'Modificar contraseña', noFavoritesDesc: 'Sus productos favoritos aparecerán aquí', quotePageTitle: 'Solicitud de presupuesto Pro', quotePageDesc: 'Describa sus necesidades y nuestro equipo le responderá en 24 horas con un presupuesto personalizado.', needsDescLabel: 'Descripción de necesidades', needsDescPH: 'Describa los productos que necesita (cantidades, referencias, plazos...)', itemsOptional: 'Artículos (opcional)', itemDescPH: 'Descripción del artículo', qtyPH: 'Cant', addItemBtn: 'Añadir artículo', sendRequestBtn: 'Enviar solicitud', shippingAddressLabel: 'Dirección de envío', fullNameLabel: 'Nombre completo', addressLabel: 'Dirección', addressPH: 'Calle, barrio, código postal', cityLabel: 'Ciudad', regionLabel: 'Región', notesOptional: 'Notas (opcional)', notesPH: 'Instrucciones de envío, referencia pedido empresa...', orderSummary: 'Resumen de pedido', confirmOrderBtn: 'Confirmar pedido', secureCheckout: 'Pedido 100% seguro', showroomTitle: 'Visita Virtual del Showroom', showroomDesc: 'Sumérjase en nuestra tienda de Yaundé. Explore las secciones de herramientas, equipos profesionales y ferretería como si estuviera allí.', immersive3DTitle: 'Espacio interactivo 3D', immersive3DDesc: 'La integración del entorno 3D se realizará aquí.', startInteractiveTour: 'Iniciar visita interactiva', aboutUsTitle: 'Sobre', aboutUsDesc: 'SONECOMX PRO SARL es el líder en la distribución de material profesional en Camerún. Acompañamos a artesanos, PYMEs y grandes industrias con productos certificados, soporte técnico avanzado y logística sin fallos.', ourMissionTitle: 'Nuestra Misión', ourMissionDesc: 'Proporcionar las mejores herramientas y equipos a los profesionales para garantizar el éxito y la seguridad de sus obras.', ourVisionTitle: 'Nuestra Visión', ourVisionDesc: 'Convertirnos en el socio de referencia de la industria africana, reconocido por nuestra innovación y fiabilidad.',
    free: 'Gratuito', newBadge: 'Nuevo', status_pending: 'Pendiente', status_processing: 'En proceso', status_shipped: 'Enviado', status_delivered: 'Entregado', status_cancelled: 'Cancelado', status_accepted: 'Aceptado', status_rejected: 'Rechazado', loading3D: 'Cargando el entorno 3D...', skuTitle: 'Referencia', brandTitle: 'Marca', stock: 'Stock', adminRole: 'Administrador', fillAllFields: 'Complete todos los campos', loginSuccess: '¡Inicio de sesión correcto! Bienvenido 👋', fillRequiredFields: 'Complete todos los campos obligatorios', registerSuccess: '¡Cuenta creada con éxito! Bienvenido 🎉', profileUpdated: 'Perfil actualizado', passwordChanged: 'Contraseña modificada', passwordsMismatch: 'Las contraseñas no coinciden', addedToCart: 'añadido al carrito', addedToWishlist: 'Añadido a favoritos', removedFromWishlist: 'Eliminado de favoritos', orderConfirmed: 'Pedido confirmado', quoteSentSuccess: '¡Solicitud de presupuesto enviada! Nuestro equipo le responderá en 24h. 📋', proSelection: 'Selección Pro', proEquipDesc: 'Equipo profesional completo', siteSafety: 'Seguridad de la obra', epiDesc: 'Cascos, guantes, arneses, balizaje'
  },
  DE: {
    tagline: 'Das Haus der Profis', search: 'Produkt oder Marke suchen...', allDepts: 'ALLE ABTEILUNGEN', promotions: 'Aktionen', proQuote: 'Pro-Angebot', delivery: 'Lieferung', heroBadge: 'Neue Kollektion 2025', heroTitle: 'Material und<br><span>Professionelle</span><br>Ausrüstung', heroDesc: 'Werkzeug, Eisenwaren, PSA und Baugeräte für anspruchsvolle Profis.', seeCatalog: 'Katalog ansehen', requestQuote: 'Angebot anfordern', ourDepts: 'Unsere Abteilungen', allDeptsLink: 'Alle Abteilungen', bestSellers: 'Bestseller', seeAll: 'Alle anzeigen', stayInfo: 'Bleib informiert', subscribeTitle: 'Angebote abonnieren', subscribeDesc: 'Erhalte zuerst Aktionen, Neuheiten und technische Tipps.', emailPH: 'Deine E-Mail...', subscribBtn: 'Abonnieren', promoEye: 'Profi-Angebot', promoTitle: 'Kostenlose Lieferung in <span>Kamerun</span>', promoDesc: 'Bei Bestellungen über 50.000 CFA — Lieferung in 24 Std.', orderNow: 'Jetzt bestellen', deliveryZones: 'Lieferzonen', freeDel: 'Schnelle Lieferung', freeDel2: '24 Std. Großstädte', certified: 'Zertifizierte Produkte', certified2: 'Herstellergarantie', securePay: 'Sicheres Bezahlen', securePay2: 'Mobile Money, Karte', proAcc: 'Pro-Konto', proAcc2: 'Angebote & Rechnungen', experts: 'Expertenrat', experts2: 'Techniker verfügbar', ourBrands: 'Unsere Marken', login: 'Anmelden', register: 'Registrieren', myAccount: 'Mein Konto', logout: 'Abmelden', cart: 'Warenkorb', aboutUs: 'Über uns', proServices: 'Pro-Services', helpSupport: 'Hilfe', payments: 'Zahlungen',
    topbarCities: 'Yaounde — Douala — Bafoussam', topbarHours: 'Mo–Sa: 7:30 – 18:00 Uhr', becomeReseller: 'Händler werden', proServiceQuote: 'Pro-Service & Online-Angebot', deptBoulonnerie: 'Schrauben', deptChantier: 'Baustelle', deptElectricite: 'Elektrizität', deptPlomberie: 'Sanitär', deptPeinture: 'Malerei', deptEPI: 'PSA', deptIndustriel: 'Industriell', deptAgricole: 'Landwirtschaftlich', virtualVisit: 'Virtueller Rundgang', allDeptsTitle: 'ALLE UNSERE ABTEILUNGEN', categoriesLabel: 'KATEGORIEN', cartEmpty: 'Ihr Warenkorb ist leer', subtotal: 'Zwischensumme', vat: 'MwSt. (19.25%)', total: 'Gesamt', checkoutBtn: 'Zur Kasse', whoWeAre: 'Über uns', ourAgencies: 'Unsere Filialen', careers: 'Karriere', contact: 'Kontakt', onlineQuote: 'Online-Angebot', siteDelivery: 'Baustellenlieferung', companyAccount: 'Firmenkonto', training: 'Schulung', orderTracking: 'Bestellverfolgung', returnsRefunds: 'Rückgabe & Erstattung', warranties: 'Garantien', faq: 'FAQ', privacy: 'Datenschutz', termsOfService: 'AGB', hello: 'Hallo, ', myRecs: 'Meine Empfehlungen', deliveryTracking: 'Lieferungsverfolgung', myOrders: 'Meine Bestellungen', electricalTools: 'Elektrowerkzeuge', promoDiscount30: 'Promo bis zu -30%', electricity: 'Elektrizität', newLed: 'Neue LED-Produkte', constructionMaterial: 'Baumaterial', cementsIronEquip: 'Zement, Eisen, Ausrüstung', newArrivals: 'Neuheiten', noProductFound: 'Keine Produkte gefunden.', home: 'Startseite', catalogueTitle: 'Katalog', all: 'Alle', sortBy: 'Sortieren nach', priceAsc: 'Preis aufsteigend', priceDesc: 'Preis absteigend', topRated: 'Bestbewertet', loading: 'Wird geladen...', productSingular: 'Produkt', productPlural: 'Produkte', noProductFoundTitle: 'Keine Produkte gefunden', tryOtherFilters: 'Andere Filter ausprobieren', promoHeaderTitle: '🔥 Sonderangebote & Aktionen', promoHeaderDesc: 'Profitieren Sie von exklusiven Rabatten und zeitlich begrenzten Angeboten auf alle Profi-Werkzeuge und -Geräte.', onSale: 'im Angebot', noPromoActive: 'Keine aktuellen Aktionen', noPromoDesc: 'Schauen Sie später vorbei, um unsere Angebote zu entdecken', brandLabel: 'Marke:', clientReview: 'Kundenbewertung', clientReviews: 'Kundenbewertungen', noDesc: 'Keine Beschreibung verfügbar.', addToCart: 'In den Warenkorb', skuLabel: 'Referenz:', categoryLabel: 'Kategorie:', availabilityLabel: 'Verfügbarkeit:', inStock: 'Auf Lager', outOfStock: 'Ausverkauft', units: 'Einheiten', shareProduct: 'Dieses Produkt teilen:', descriptionTab: 'Beschreibung', specsTab: 'Technische Daten', reviewsTab: 'Bewertungen', proReviews: 'Profi-Bewertungen', userLabel: 'Benutzer', noReviews: 'Noch keine Bewertungen für dieses Produkt.', relatedProducts: 'Ähnliche Produkte', noRelatedProducts: 'Keine ähnlichen Produkte gefunden', authSub: 'Melden Sie sich in Ihrem SONECOMX PRO Bereich an', noAccount: 'Kein Konto?', createAccount: 'Konto erstellen', registerSub: 'Werden Sie Teil der SONECOMX PRO Community', firstNameLabel: 'Vorname', lastNameLabel: 'Nachname', emailLabel: 'E-Mail', phoneLabel: 'Telefon', accountTypeLabel: 'Kontotyp', individualOption: 'Privatkunde', proOption: 'Gewerbekunde / Unternehmen', companyLabel: 'Unternehmen', companyPH: 'Name Ihres Unternehmens', passwordLabel: 'Passwort', passwordPH: 'Mindestens 6 Zeichen', registerBtn: 'Konto erstellen', alreadyRegistered: 'Bereits registriert?', myInfo: 'Meine Informationen', myOrdersTab: 'Meine Bestellungen', myQuotesTab: 'Meine Angebote', favorites: 'Favoriten', security: 'Sicherheit', adminDashboard: 'Admin-Dashboard', saveChanges: 'Änderungen speichern', orderNumLabel: 'Bestellnummer', dateLabel: 'Datum', totalLabel: 'Gesamt', statusLabel: 'Status', noOrders: 'Keine Bestellungen', noOrdersDesc: 'Ihre Bestellungen werden hier angezeigt', startShopping: 'Einkauf starten', quoteNumLabel: 'Angebotsnummer', replyLabel: 'Antwort', noQuotes: 'Keine Angebote', noQuotesDesc: 'Ihre Angebote werden hier angezeigt', currentPasswordLabel: 'Aktuelles Passwort', newPasswordLabel: 'Neues Passwort', confirmPasswordLabel: 'Neues Passwort bestätigen', changePasswordBtn: 'Passwort ändern', noFavoritesDesc: 'Ihre Favoriten werden hier angezeigt', quotePageTitle: 'Pro-Angebotsanfrage', quotePageDesc: 'Beschreiben Sie Ihren Bedarf, und unser Team antwortet Ihnen innerhalb von 24 Stunden mit einem maßgeschneiderten Angebot.', needsDescLabel: 'Beschreibung des Bedarfs', needsDescPH: 'Beschreiben Sie die benötigten Produkte (Mengen, Referenzen, Fristen...)', itemsOptional: 'Artikel (optional)', itemDescPH: 'Artikelbeschreibung', qtyPH: 'Menge', addItemBtn: 'Artikel hinzufügen', sendRequestBtn: 'Anfrage senden', shippingAddressLabel: 'Lieferadresse', fullNameLabel: 'Vollständiger Name', addressLabel: 'Adresse', addressPH: 'Straße, Stadtteil, Postfach', cityLabel: 'Stadt', regionLabel: 'Region', notesOptional: 'Anmerkungen (optional)', notesPH: 'Lieferanweisungen, Bestellreferenz des Unternehmens...', orderSummary: 'Bestellübersicht', confirmOrderBtn: 'Bestellung bestätigen', secureCheckout: '100% sichere Bestellung', showroomTitle: 'Virtueller Showroom-Rundgang', showroomDesc: 'Tauchen Sie ein in unser Verkaufsgeschäft in Yaounde. Erkunden Sie unsere Abteilungen für Werkzeuge, professionelle Ausrüstung und Eisenwaren, als ob Sie vor Ort wären.', immersive3DTitle: 'Interaktiver 3D-Bereich', immersive3DDesc: 'Die Integration der 3D-Umgebung erfolgt hier.', startInteractiveTour: 'Interaktiven Rundgang starten', aboutUsTitle: 'Über', aboutUsDesc: 'SONECOMX PRO SARL ist der führende Distributor für professionelle Ausrüstung in Kamerun. Wir unterstützen Handwerker, KMU und die Großindustrie mit zertifizierten Produkten, erstklassigem technischen Support und zuverlässiger Logistik.', ourMissionTitle: 'Unsere Mission', ourMissionDesc: 'Profis mit den besten Werkzeugen und Geräten auszustatten, um den Erfolg und die Sicherheit ihrer Baustellen zu gewährleisten.', ourVisionTitle: 'Unsere Vision', ourVisionDesc: 'Der bevorzugte Partner der afrikanischen Industrie zu werden, bekannt für Innovation und Zuverlässigkeit.',
    free: 'Kostenlos', newBadge: 'Neu', status_pending: 'Ausstehend', status_processing: 'In Bearbeitung', status_shipped: 'Versandt', status_delivered: 'Geliefert', status_cancelled: 'Storniert', status_accepted: 'Akzeptiert', status_rejected: 'Abgelehnt', loading3D: '3D-Umgebung wird geladen...', skuTitle: 'Referenz', brandTitle: 'Marke', stock: 'Lagerbestand', adminRole: 'Administrator', fillAllFields: 'Bitte füllen Sie alle Felder aus', loginSuccess: 'Anmeldung erfolgreich! Willkommen 👋', fillRequiredFields: 'Bitte füllen Sie alle Pflichtfelder aus', registerSuccess: 'Konto erfolgreich erstellt! Willkommen 🎉', profileUpdated: 'Profil aktualisiert', passwordChanged: 'Passwort geändert', passwordsMismatch: 'Passwörter stimmen nicht überein', addedToCart: 'in den Warenkorb gelegt', addedToWishlist: 'Zu Favoriten hinzugefügt', removedFromWishlist: 'Aus Favoriten entfernt', orderConfirmed: 'Bestellung bestätigt', quoteSentSuccess: 'Angebotsanfrage gesendet! Unser Team wird innerhalb von 24 Std. antworten. 📋', proSelection: 'Profi-Auswahl', proEquipDesc: 'Komplette professionelle Ausrüstung', siteSafety: 'Baustellensicherheit', epiDesc: 'Helme, Handschuhe, Gurte, Markierungen'
  },
  PT: {
    tagline: 'A casa dos profissionais', search: 'Pesquisar produto, marca...', allDepts: 'TODOS OS DEPARTAMENTOS', promotions: 'Promoções', proQuote: 'Orçamento Pro', delivery: 'Entrega', heroBadge: 'Nova coleção 2025', heroTitle: 'Materiais e<br><span>Equipamentos</span><br>Profissionais', heroDesc: 'Ferramentas, ferragens, EPI e materiais de construção para profissionais.', seeCatalog: 'Ver catálogo', requestQuote: 'Pedir orçamento', ourDepts: 'Os nossos departamentos', allDeptsLink: 'Todos os departamentos', bestSellers: 'Mais vendidos', seeAll: 'Ver tudo', stayInfo: 'Fique informado', subscribeTitle: 'Subscreva as nossas ofertas', subscribeDesc: 'Receba em primeira mão promoções e novidades.', emailPH: 'O seu e-mail...', subscribBtn: 'Subscrever', promoEye: 'Oferta profissional', promoTitle: 'Entrega gratuita em <span>Camarões</span>', promoDesc: 'Para encomendas superiores a 50.000 CFA — entrega em 24h.', orderNow: 'Encomendar agora', deliveryZones: 'Zonas de entrega', freeDel: 'Entrega rápida', freeDel2: '24h grandes cidades', certified: 'Produtos certificados', certified2: 'Garantia fabricante', securePay: 'Pagamento seguro', securePay2: 'Mobile Money, cartão', proAcc: 'Conta Pro', proAcc2: 'Orçamentos e faturas', experts: 'Conselhos de especialistas', experts2: 'Técnicos disponíveis', ourBrands: 'As nossas marcas', login: 'Entrar', register: 'Registar', myAccount: 'A minha conta', logout: 'Sair', cart: 'Carrinho', aboutUs: 'Sobre nós', proServices: 'Serviços Pro', helpSupport: 'Ajuda', payments: 'Pagamentos',
    topbarCities: 'Iaundé — Douala — Bafoussam', topbarHours: 'Seg–Sáb: 7:30 – 18:00', becomeReseller: 'Tornar-se revendedor', proServiceQuote: 'Serviço Pro e Orçamento online', deptBoulonnerie: 'Parafusos', deptChantier: 'Obras', deptElectricite: 'Eletricidade', deptPlomberie: 'Canalização', deptPeinture: 'Pintura', deptEPI: 'EPI', deptIndustriel: 'Industrial', deptAgricole: 'Agrícola', virtualVisit: 'Visita Virtual', allDeptsTitle: 'TODOS OS NOSSOS DEPARTAMENTOS', categoriesLabel: 'CATEGORIAS', cartEmpty: 'O seu carrinho está vazio', subtotal: 'Subtotal', vat: 'IVA (19.25%)', total: 'Total', checkoutBtn: 'Finalizar compra', whoWeAre: 'Quem somos', ourAgencies: 'Nuestras lojas', careers: 'Carreiras', contact: 'Contato', onlineQuote: 'Orçamento online', siteDelivery: 'Entrega na obra', companyAccount: 'Conta de empresa', training: 'Formação', orderTracking: 'Acompanhar pedido', returnsRefunds: 'Devoluções e reembolsos', warranties: 'Garantias', faq: 'FAQ', privacy: 'Privacidade', termsOfService: 'Termos de Serviço', hello: 'Olá, ', myRecs: 'Minhas recomendações', deliveryTracking: 'Acompanhamento de entrega', myOrders: 'Meus pedidos', electricalTools: 'Ferramentas elétricas', promoDiscount30: 'Promoção até -30%', electricity: 'Eletricidade', newLed: 'Novidades LED', constructionMaterial: 'Material de obra', cementsIronEquip: 'Cimento, ferros, equipamentos', newArrivals: 'Novidades', noProductFound: 'Nenhum produto encontrado.', home: 'Início', catalogueTitle: 'Catálogo', all: 'Tudo', sortBy: 'Ordenar por', priceAsc: 'Preço crescente', priceDesc: 'Preço decrescente', topRated: 'Mais votados', loading: 'A carregar...', productSingular: 'produto', productPlural: 'produtos', noProductFoundTitle: 'Nenhum produto encontrado', tryOtherFilters: 'Tente outros filtros', promoHeaderTitle: '🔥 Ofertas Especiais & Promoções', promoHeaderDesc: 'Aproveite descontos exclusivos e ofertas limitadas em todas as ferramentas e equipamentos profissionais.', onSale: 'em promoção', noPromoActive: 'Nenhuma promoção ativa', noPromoDesc: 'Volte mais tarde para descobrir as nossas ofertas', brandLabel: 'Marca:', clientReview: 'opinião do cliente', clientReviews: 'opiniões dos clientes', noDesc: 'Nenhuma descrição disponível.', addToCart: 'Adicionar ao carrinho', skuLabel: 'Referência:', categoryLabel: 'Categoria:', availabilityLabel: 'Disponibilidade:', inStock: 'Em stock', outOfStock: 'Esgotado', units: 'unidades', shareProduct: 'Partilhar este produto:', descriptionTab: 'Descrição', specsTab: 'Ficha técnica', reviewsTab: 'Avaliações', proReviews: 'Avaliações de profissionais', userLabel: 'Utilizador', noReviews: 'Ainda não há avaliações para este produto.', relatedProducts: 'Produtos semelhantes', noRelatedProducts: 'Nenhum produto semelhante encontrado', authSub: 'Aceda à sua área pessoal SONECOMX PRO', noAccount: 'Não tem conta?', createAccount: 'Criar uma conta', registerSub: 'Junte-se à comunidade SONECOMX PRO', firstNameLabel: 'Nome', lastNameLabel: 'Sobrenome', emailLabel: 'E-mail', phoneLabel: 'Telefone', accountTypeLabel: 'Tipo de conta', individualOption: 'Particular', proOption: 'Profissional / Empresa', companyLabel: 'Empresa', companyPH: 'Nome da sua empresa', passwordLabel: 'Senha', passwordPH: 'Mínimo 6 caracteres', registerBtn: 'Criar minha conta', alreadyRegistered: 'Já registado?', myInfo: 'Minhas informações', myOrdersTab: 'Meus pedidos', myQuotesTab: 'Meus orçamentos', favorites: 'Favoritos', security: 'Segurança', adminDashboard: 'Painel de administração', saveChanges: 'Guardar alterações', orderNumLabel: 'Nº Encomenda', dateLabel: 'Data', totalLabel: 'Total', statusLabel: 'Estado', noOrders: 'Sem encomendas', noOrdersDesc: 'As suas encomendas aparecerão aqui', startShopping: 'Começar compras', quoteNumLabel: 'Nº Orçamento', replyLabel: 'Resposta', noQuotes: 'Sem orçamentos', noQuotesDesc: 'As suas solicitações de orçamento aparecerão aqui', currentPasswordLabel: 'Senha atual', newPasswordLabel: 'Nova senha', confirmPasswordLabel: 'Confirmar nova senha', changePasswordBtn: 'Modificar senha', noFavoritesDesc: 'Os seus produtos favoritos aparecerão aqui', quotePageTitle: 'Solicitação de orçamento Pro', quotePageDesc: 'Descreva as suas necessidades e a nossa equipa responderá em 24h com um orçamento personalizado.', needsDescLabel: 'Descrição das necessidades', needsDescPH: 'Descreva os produtos de que necessita (quantidades, referências, prazos...)', itemsOptional: 'Artigos (opcional)', itemDescPH: 'Descrição do artigo', qtyPH: 'Qtd', addItemBtn: 'Adicionar artigo', sendRequestBtn: 'Enviar solicitação', shippingAddressLabel: 'Endereço de entrega', fullNameLabel: 'Nome completo', addressLabel: 'Endereço', addressPH: 'Rua, bairro, caixa postal', cityLabel: 'Cidade', regionLabel: 'Região', notesOptional: 'Notas (opcional)', notesPH: 'Instruções de entrega, referência do pedido da empresa...', orderSummary: 'Resumo da encomenda', confirmOrderBtn: 'Confirmar encomenda', secureCheckout: 'Compra 100% segura', showroomTitle: 'Visita Virtual do Showroom', showroomDesc: 'Mergulhe na nossa loja em Yaundé. Explore as secções de ferramentas, equipamentos profissionais e ferragens como se estivesse lá.', immersive3DTitle: 'Espaço interativo 3D', immersive3DDesc: 'A integração do ambiente 3D será feita aqui.', startInteractiveTour: 'Iniciar visita interativa', aboutUsTitle: 'Sobre', aboutUsDesc: 'A SONECOMX PRO SARL é líder na distribuição de equipamento profissional nos Camarões. Acompanhamos artesãos, PMEs e grandes indústrias com produtos certificados, suporte técnico avançado e logística sem falhas.', ourMissionTitle: 'Nossa Missão', ourMissionDesc: 'Fornecer as melhores ferramentas e equipamentos aos profissionais para garantir o sucesso e la segurança das suas obras.', ourVisionTitle: 'Nossa Visão', ourVisionDesc: 'Tornar-se o parceiro de referência da indústria africana, reconhecido pela nossa inovação e fiabilidade.',
    free: 'Gratuito', newBadge: 'Novo', status_pending: 'Pendente', status_processing: 'Em processamento', status_shipped: 'Enviado', status_delivered: 'Entregue', status_cancelled: 'Cancelada', status_accepted: 'Aceito', status_rejected: 'Rejeitado', loading3D: 'Carregando o ambiente 3D...', skuTitle: 'Referência', brandTitle: 'Marca', stock: 'Stock', adminRole: 'Administrador', fillAllFields: 'Preencha todos os campos', loginSuccess: 'Login bem-sucedido! Bem-vindo 👋', fillRequiredFields: 'Preencha todos os campos obrigatórios', registerSuccess: 'Conta criada com sucesso! Bem-vindo 🎉', profileUpdated: 'Perfil atualizado', passwordChanged: 'Senha alterada', passwordsMismatch: 'As senhas não coincidem', addedToCart: 'adicionado ao carrinho', addedToWishlist: 'Adicionado aos favoritos', removedFromWishlist: 'Removido dos favoritos', orderConfirmed: 'Encomenda confirmada', quoteSentSuccess: 'Solicitação de orçamento enviada! A nossa equipa responderá em 24h. 📋', proSelection: 'Seleção Pro', proEquipDesc: 'Equipamento profissional completo', siteSafety: 'Segurança da obra', epiDesc: 'Capacetes, luvas, arneses, marcação'
  },
  RU: {
    tagline: 'Дом профессионалов', search: 'Поиск товара, бренда...', allDepts: 'ВСЕ ОТДЕЛЫ', promotions: 'Акции', proQuote: 'Про-смета', delivery: 'Доставка', heroBadge: 'Новая коллекция 2025', heroTitle: 'Материалы и<br><span>Профессиональное</span><br>оборудование', heroDesc: 'Инструменты, метизы, СИЗ и строительное оборудование для профессионалов.', seeCatalog: 'Смотреть каталог', requestQuote: 'Запросить смету', ourDepts: 'Наши отделы', allDeptsLink: 'Все отделы', bestSellers: 'Лидеры продаж', seeAll: 'Смотреть все', stayInfo: 'Будь в курсе', subscribeTitle: 'Подпишитесь на акции', subscribeDesc: 'Получайте первыми акции, новинки и советы.', emailPH: 'Ваш email...', subscribBtn: 'Подписаться', promoEye: 'Профессиональное предложение', promoTitle: 'Бесплатная доставка по <span>Камеруну</span>', promoDesc: 'При заказе от 50 000 франков — доставка 24 ч.', orderNow: 'Заказать сейчас', deliveryZones: 'Зоны доставки', freeDel: 'Быстрая доставка', freeDel2: '24 ч крупные города', certified: 'Сертифицированные товары', certified2: 'Гарантия производителя', securePay: 'Безопасная оплата', securePay2: 'Mobile Money, карта', proAcc: 'Про-аккаунт', proAcc2: 'Сметы и счета', experts: 'Совет экспертов', experts2: 'Техники доступны', ourBrands: 'Наши бренды', login: 'Войти', register: 'Регистрация', myAccount: 'Мой аккаунт', logout: 'Выйти', cart: 'Корзина', aboutUs: 'О нас', proServices: 'Про-услуги', helpSupport: 'Помощь', payments: 'Оплата',
    topbarCities: 'Яунде — Дуала — Бафусам', topbarHours: 'Пн–Сб: 7:30 – 18:00', becomeReseller: 'Стать дилером', proServiceQuote: 'Про-сервис и онлайн-смета', deptBoulonnerie: 'Болты и винты', deptChantier: 'Стройплощадка', deptElectricite: 'Электричество', deptPlomberie: 'Сантехника', deptPeinture: 'Малярные работы', deptEPI: 'СИЗ', deptIndustriel: 'Промышленный', deptAgricole: 'Сельскохозяйственный', virtualVisit: 'Виртуальный тур', allDeptsTitle: 'ВСЕ НАШИ ОТДЕЛЫ', categoriesLabel: 'КАТЕГОРИИ', cartEmpty: 'Ваша корзина пуста', subtotal: 'Подытог', vat: 'НДС (19.25%)', total: 'Итого', checkoutBtn: 'Оформить заказ', whoWeAre: 'О нас', ourAgencies: 'Наши филиалы', careers: 'Вакансии', contact: 'Контакты', onlineQuote: 'Онлайн-смета', siteDelivery: 'Доставка на объект', companyAccount: 'Корпоративный аккаунт', training: 'Обучение', orderTracking: 'Отслеживание заказа', returnsRefunds: 'Возврат и возмещение', warranties: 'Гарантии', faq: 'FAQ', privacy: 'Конфиденциальность', termsOfService: 'Условия использования', hello: 'Здравствуйте, ', myRecs: 'Мои рекомендации', deliveryTracking: 'Отслеживание доставки', myOrders: 'Мои заказы', electricalTools: 'Электроинструменты', promoDiscount30: 'Акции до -30%', electricity: 'Электричество', newLed: 'Новинки LED', constructionMaterial: 'Стройматериалы', cementsIronEquip: 'Цемент, арматура, оборудование', newArrivals: 'Новинки', noProductFound: 'Товары не найдены.', home: 'Главная', catalogueTitle: 'Каталог', all: 'Все', sortBy: 'Сортировка', priceAsc: 'Дешевле', priceDesc: 'Дороже', topRated: 'Высокий рейтинг', loading: 'Загрузка...', productSingular: 'товар', productPlural: 'товаров', noProductFoundTitle: 'Товары не найдены', tryOtherFilters: 'Попробуйте другие фильтры', promoHeaderTitle: '🔥 Специальные предложения и акции', promoHeaderDesc: 'Воспользуйтесь эксклюзивными скидками и ограниченными предложениями на профессиональный инструмент и оборудование.', onSale: 'по акции', noPromoActive: 'Нет текущих акций', noPromoDesc: 'Загляните позже, чтобы узнать о наших предложениях', brandLabel: 'Бренд:', clientReview: 'отзыв клиента', clientReviews: 'отзывов клиентов', noDesc: 'Описание недоступно.', addToCart: 'В корзину', skuLabel: 'Артикул:', categoryLabel: 'Категория:', availabilityLabel: 'Наличие:', inStock: 'В наличии', outOfStock: 'Нет в наличии', units: 'шт.', shareProduct: 'Поделиться товаром:', descriptionTab: 'Описание', specsTab: 'Характеристики', reviewsTab: 'Отзывы', proReviews: 'Отзывы профессионалов', userLabel: 'Пользователь', noReviews: 'На этот товар пока нет отзывов.', relatedProducts: 'Похожие товары', noRelatedProducts: 'Похожие товары не найдены', authSub: 'Войдите в личный кабинет SONECOMX PRO', noAccount: 'Нет аккаунта?', createAccount: 'Создать аккаунт', registerSub: 'Присоединяйтесь к сообществу SONECOMX PRO', firstNameLabel: 'Имя', lastNameLabel: 'Фамилия', emailLabel: 'Email', phoneLabel: 'Телефон', accountTypeLabel: 'Тип аккаунта', individualOption: 'Частное лицо', proOption: 'Юридическое лицо / Компания', companyLabel: 'Компания', companyPH: 'Название вашей компании', passwordLabel: 'Пароль', passwordPH: 'Минимум 6 символов', registerBtn: 'Создать аккаунт', alreadyRegistered: 'Уже зарегистрированы?', myInfo: 'Мои данные', myOrdersTab: 'Мои заказы', myQuotesTab: 'Мои сметы', favorites: 'Избранное', security: 'Безопасность', adminDashboard: 'Панель управления', saveChanges: 'Сохранить изменения', orderNumLabel: '№ Заказа', dateLabel: 'Дата', totalLabel: 'Итого', statusLabel: 'Статус', noOrders: 'Нет заказов', noOrdersDesc: 'Ваши заказы будут отображаться здесь', startShopping: 'Начать покупки', quoteNumLabel: '№ Сметы', replyLabel: 'Ответ', noQuotes: 'Нет смет', noQuotesDesc: 'Ваши запросы смет будут отображаться здесь', currentPasswordLabel: 'Текущий пароль', newPasswordLabel: 'Новый пароль', confirmPasswordLabel: 'Подтвердите новый пароль', changePasswordBtn: 'Изменить пароль', noFavoritesDesc: 'Ваши избранные товары будут отображаться здесь', quotePageTitle: 'Запрос сметы Pro', quotePageDesc: 'Опишите ваши потребности, и наша команда ответит вам в течение 24 часов с индивидуальным предложением.', needsDescLabel: 'Описание потребностей', needsDescPH: 'Опишите товары, которые вам необходимы (количество, артикулы, сроки...)', itemsOptional: 'Товары (необязательно)', itemDescPH: 'Описание товара', qtyPH: 'Кол-во', addItemBtn: 'Добавить товар', sendRequestBtn: 'Отправить запрос', shippingAddressLabel: 'Адрес доставки', fullNameLabel: 'Полное имя', addressLabel: 'Адрес', addressPH: 'Улица, район, а/я', cityLabel: 'Город', regionLabel: 'Регион', notesOptional: 'Примечания (необязательно)', notesPH: 'Инструкции по доставке, номер заказа компании...', orderSummary: 'Детали заказа', confirmOrderBtn: 'Подтвердить заказ', secureCheckout: '100% безопасный заказ', showroomTitle: 'Виртуальный тур по шоуруму', showroomDesc: 'Погрузитесь в атмосферу нашего торгового зала в Яунде. Изучайте отделы инструментов, профессионального оборудования и метизов, как если бы вы были там.', immersive3DTitle: 'Интерактивное 3D-пространство', immersive3DDesc: 'Интеграция 3D-среды будет выполнена здесь.', startInteractiveTour: 'Запустить интерактивный тур', aboutUsTitle: 'О компании', aboutUsDesc: 'SONECOMX PRO SARL — лидер в сфере дистрибуции профессионального оборудования в Камеруне. Мы поддерживаем мастеров, малый бизнес и крупные промышленные предприятия, предоставляя сертифицированную продукцию, передовую техподдержку и надежную логистику.', ourMissionTitle: 'Наша Миссия', ourMissionDesc: 'Обеспечивать профессионалов лучшими инструментами и оборудованием для гарантии успеха и безопасности на строительных объектах.', ourVisionTitle: 'Наше Видение', ourVisionDesc: 'Стать ведущим партнером для африканской промышленности, известным инновациями и надежностью.',
    free: 'Бесплатно', newBadge: 'Новинка', status_pending: 'В ожидании', status_processing: 'Обрабатывается', status_shipped: 'Отправлено', status_delivered: 'Доставлено', status_cancelled: 'Отменено', status_accepted: 'Принято', status_rejected: 'Отклонено', loading3D: 'Загрузка 3D-среды...', skuTitle: 'Артикул', brandTitle: 'Бренд', stock: 'Склад', adminRole: 'Администратор', fillAllFields: 'Пожалуйста, заполните все поля', loginSuccess: 'Вход выполнен успешно! Добро пожаловать 👋', fillRequiredFields: 'Пожалуйста, заполните все обязательные поля', registerSuccess: 'Аккаунт успешно создан! Добро пожаловать 🎉', profileUpdated: 'Профиль обновлен', passwordChanged: 'Пароль изменен', passwordsMismatch: 'Пароли не совпадают', addedToCart: 'добавлен в корзину', addedToWishlist: 'Добавлено в избранное', removedFromWishlist: 'Удалено из избранного', orderConfirmed: 'Заказ подтвержден', quoteSentSuccess: 'Запрос сметы отправлен! Наша команда ответит вам в течение 24 часов с индивидуальным предложением. 📋', proSelection: 'Про выбор', proEquipDesc: 'Полное профессиональное оборудование', siteSafety: 'Безопасность на объекте', epiDesc: 'Каски, перчатки, ремни, разметка'
  }
};

const LANGS = [
  { code: 'FR', flag: '🇫🇷', name: 'Français' }, { code: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'AR', flag: '🇸🇦', name: 'عربي' }, { code: 'PT', flag: '🇵🇹', name: 'Português' },
  { code: 'ES', flag: '🇪🇸', name: 'Español' }, { code: 'DE', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'RU', flag: '🇷🇺', name: 'Русский' }, { code: 'DA', flag: '🇩🇰', name: 'Dansk' },
  { code: 'ZH', flag: '🇨🇳', name: '中文' }, { code: 'IT', flag: '🇮🇹', name: 'Italiano' }
];

function t(key) { return (T[State.lang] || T['FR'])[key] || T['FR'][key] || key; }
function fmt(n) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F'; }
function stars(r) { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)); }
function catIcon(icon, size = '28px') {
  if (icon && (icon.includes('.') || icon.includes('/'))) {
    return `<img src="${icon}" alt="icon" style="width: ${size}; height: ${size}; object-fit: contain; display: inline-block; vertical-align: middle;" />`;
  }
  return `<i class="ti ${icon || 'ti-package'}" aria-hidden="true" style="font-size: ${size};"></i>`;
}

const CATEGORIES = [
  { name: 'Boulonnerie & Sécurité', icon: '/images/categories/boulonnerie-securite.png', count: '2 100' },
  { name: 'Carreaux & Sanitaire', icon: '/images/categories/carreaux et sanitaire.png', count: '610' },
  { name: 'Échelles & Escabeaux', icon: '/images/categories/echelles et escabeaux.png', count: '160' },
  { name: 'Éclairage', icon: '/images/categories/eclairage.png', count: '480' },
  { name: 'Électricité & Solaire', icon: '/images/categories/electricite et solaire.png', count: '1 100' },
  { name: 'EPI & Signalisation', icon: '/images/categories/epi-signalisation.png', count: '340' },
  { name: 'Équipement industriel', icon: '/images/categories/equipement-industriel.png', count: '940' },
  { name: 'Matériel agricole', icon: '/images/categories/materiel-agricole.png', count: '520' },
  { name: 'Matériel de chantier', icon: '/images/categories/materiels de chantier.png', count: '870' },
  { name: 'Parc métallique', icon: '/images/categories/parc metalique.png', count: '200' },
  { name: 'Peinture & Étanchéité', icon: '/images/categories/peinture et etancheite.png', count: '540' },
  { name: 'Plomberie', icon: '/images/categories/plomberie.png', count: '740' },
  { name: 'Pneu & Huile', icon: '/images/categories/pneu et huile.png', count: '390' },
  { name: 'Portatif & Accessoires', icon: '/images/categories/portatif-accessoires.png', count: '820' },
  { name: 'Soudure', icon: '/images/categories/soudure.png', count: '310' },
  { name: 'Consommable & Logistique', icon: '/images/categories/conssomable et logistique.png', count: '1 450' },
  { name: 'Électroménager', icon: '/images/categories/electromenager.png', count: '450' },
  { name: 'Plomberie industrielle', icon: '/images/categories/plomberie-industrielle.png', count: '680' }
];

const PRODUCT_ICONS = { Makita: '🔩', Bosch: '⚙️', Stanley: '🔧', Legrand: '💡', Fischer: '🔩', Uvex: '🪖', Stabila: '📐', Sikkens: '🎨', Vachette: '🔐', Grohe: '🚿', Facom: '🪛', Petzl: '🔦' };

/* ══════════════════════════════════════════════════════════
   PAGES RENDERER
══════════════════════════════════════════════════════════ */
const Pages = {

  /* ── HOME ─────────────────────────────────────────────── */
  async home() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="spinner"></div>`;
    const [featuredRes, allRes, newRes] = await Promise.all([
      Http.get('/products/featured'),
      Http.get('/products?limit=12&sort=bestseller'),
      Http.get('/products?limit=12&sort=newest')
    ]);
    const featured = (featuredRes.data || []).filter(p => p && p.name);
    const all = (allRes.data || []).filter(p => p && p.name);
    const newArrivals = (newRes.data && newRes.data.length ? newRes.data : featured).filter(p => p && p.name);

    app.innerHTML = `
      ${Pages.hero()}
      ${Pages.quickAccess()}
      <div class="section">
        <div class="section-header">
          <div class="section-title">${t('ourDepts')}</div>
          <span class="see-all" onclick="Router.go('catalogue')">${t('allDeptsLink')} <i class="ti ti-arrow-right"></i></span>
        </div>
        <div class="cat-grid">${(State.categories.length ? State.categories : CATEGORIES).map(c => `
          <div class="cat-card" onclick="Router.go('catalogue','cat=${encodeURIComponent(c.name)}')">
            <span class="cat-icon">
              ${catIcon(c.icon, c.icon && (c.icon.includes('.') || c.icon.includes('/')) ? '96px' : '36px')}
            </span>
            <div class="cat-name">${c.name}</div>
            <div class="cat-count">${typeof c.productCount !== 'undefined' ? c.productCount : c.count} réf.</div>
          </div>`).join('')}
        </div>
      </div>
      ${Pages.promoBanner()}
      <div class="section" style="padding-top:0">
        <div class="section-header">
          <div class="section-title">${t('bestSellers')}</div>
          <span class="see-all" onclick="Router.go('catalogue','sort=bestseller')">${t('seeAll')} <i class="ti ti-arrow-right"></i></span>
        </div>
        ${Pages.productMarquee(all.length ? all : featured, 'ltr')}
      </div>
      ${Pages.promo2Cards()}
      <div class="section" style="padding-top:0">
        <div class="section-header">
          <div class="section-title">${t('newArrivals')}</div>
          <span class="see-all" onclick="Router.go('catalogue','sort=newest')">${t('seeAll')} <i class="ti ti-arrow-right"></i></span>
        </div>
        ${Pages.productMarquee(newArrivals.length ? newArrivals : featured, 'ltr')}
      </div>
      ${Pages.trustBar()}
      ${Pages.brandsStrip()}
      ${Pages.newsletter()}
      ${Pages.footer()}
    `;
    App.initLang();
  },

  hero: () => `
    <div class="hero">
      <div class="hero-content" style="z-index:1;max-width:720px;">
        <div class="hero-badge">${t('heroBadge')}</div>
        <h1>${t('heroTitle')}</h1>
        <p class="hero-desc">${t('heroDesc')}</p>
        <div class="hero-btns">
          <button class="btn-primary" onclick="Router.go('catalogue')"><i class="ti ti-layout-grid"></i> ${t('seeCatalog')}</button>
          <button class="btn-outline" onclick="Router.go('quote')"><i class="ti ti-file-invoice"></i> ${t('requestQuote')}</button>
        </div>
      </div>
    </div>`,

  quickAccess: () => `
    <div class="quick-access">
      <div class="qa-item auth-show-logged" style="display:none">
        <div class="qa-icon"><i class="ti ti-user"></i></div>
        <div><div class="qa-label">${t('hello')}<span class="user-name-display"></span></div><div class="qa-title">${t('myRecs')}</div></div>
      </div>
      <div class="qa-item">
        <div class="qa-icon"><i class="ti ti-package"></i></div>
        <div><div class="qa-label">${t('deliveryTracking')}</div><div class="qa-title">${t('myOrders')}</div></div>
      </div>
      <div class="qa-item">
        <div class="qa-icon"><i class="ti ti-tool"></i></div>
        <div><div class="qa-label">${t('electricalTools')}</div><div class="qa-title">${t('promoDiscount30')}</div></div>
      </div>
      <div class="qa-item">
        <div class="qa-icon"><i class="ti ti-plug"></i></div>
        <div><div class="qa-label">${t('electricity')}</div><div class="qa-title">${t('newLed')}</div></div>
      </div>
      <div class="qa-item">
        <div class="qa-icon"><i class="ti ti-crane"></i></div>
        <div><div class="qa-label">${t('constructionMaterial')}</div><div class="qa-title">${t('cementsIronEquip')}</div></div>
      </div>
    </div>`,

  promoBanner: () => `
    <div class="promo-banner">
      <div>
        <div class="promo-eyebrow">${t('promoEye')}</div>
        <div class="promo-title">${t('promoTitle')}</div>
        <div class="promo-desc">${t('promoDesc')}</div>
        <div class="promo-cta">
          <button class="btn-primary" onclick="Router.go('catalogue')">${t('orderNow')}</button>
          <button class="btn-outline">${t('deliveryZones')}</button>
        </div>
      </div>
      <i class="ti ti-truck" style="font-size:70px;color:rgba(255,255,255,0.5);"></i>
    </div>`,

  promo2Cards: () => `
    <div class="promo2-grid">
      <div class="promo2-card blue">
        <div class="promo2-icon"><i class="ti ti-crane" style="font-size:44px;color:var(--blue);"></i></div>
        <div>
          <div class="promo2-badge">${t('proSelection')}</div>
          <div class="promo2-title-text">${t('constructionMaterial')}</div>
          <div class="promo2-sub">${t('proEquipDesc')}</div>
        </div>
      </div>
      <div class="promo2-card red">
        <div class="promo2-icon"><i class="ti ti-shield-check" style="font-size:44px;color:var(--red);"></i></div>
        <div>
          <div class="promo2-badge">${t('siteSafety')}</div>
          <div class="promo2-title-text">${t('epiSignal')}</div>
          <div class="promo2-sub">${t('epiDesc')}</div>
        </div>
      </div>
    </div>`,

  trustBar: () => `
    <div class="trust-bar">
      <div class="trust-item"><i class="ti ti-truck trust-icon"></i><div><div class="trust-title">${t('freeDel')}</div><div class="trust-sub">${t('freeDel2')}</div></div></div>
      <div class="trust-item"><i class="ti ti-shield-check trust-icon"></i><div><div class="trust-title">${t('certified')}</div><div class="trust-sub">${t('certified2')}</div></div></div>
      <div class="trust-item"><i class="ti ti-file-invoice trust-icon"></i><div><div class="trust-title">${t('proAcc')}</div><div class="trust-sub">${t('proAcc2')}</div></div></div>
      <div class="trust-item"><i class="ti ti-headset trust-icon"></i><div><div class="trust-title">${t('experts')}</div><div class="trust-sub">${t('experts2')}</div></div></div>
    </div>`,

  brandsStrip: () => {
    const logos = {
      'Bosch': '/images/brands/bosch.jpg',
      'Schneider': '/images/brands/schneider.jpg',
      'Legrand': '/images/brands/legrand.jpg',
      'Ingco': '/images/brands/ingco.jpg',
      'DeWalt': '/images/brands/dewalt.jpg',
      'Karcher': '/images/brands/karcher.jpg',
      'Leica': '/images/brands/leica.jpg',
      'Coverguard': '/images/brands/coverguard.jpg',
      'Stanley': '/images/brands/stanley.jpg',
      'Huawei': '/images/brands/huawei.jpg'
    };
    return `
    <div class="brands-strip" style="display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:center; padding:40px 20px; background:var(--white); border-top:1px solid var(--border); border-bottom:1px solid var(--border);">
      <div style="width:100%; text-align:center; font-family:'Barlow Condensed',sans-serif; font-weight:800; font-size:24px; text-transform:uppercase; color:var(--text-main); margin-bottom:16px;">${t('ourBrands')}</div>
      <div style="display:flex; flex-wrap:wrap; gap:16px; justify-content:center; max-width:1200px; margin:0 auto;">
        ${Object.entries(logos).map(([b, img]) => `
        <div class="brand-item" onclick="Router.go('catalogue','brand=${b}')" style="display:flex; justify-content:center; align-items:center; width:130px; height:70px; padding:12px; background:var(--white); border-radius:var(--radius-lg); border:1px solid var(--border); box-shadow:0 2px 8px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.3s ease;" onmouseover="this.style.borderColor='var(--blue)'; this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.06)'; this.querySelector('img').style.filter='none'; this.querySelector('img').style.opacity='1';" onmouseout="this.style.borderColor='var(--border)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'; this.querySelector('img').style.filter='grayscale(100%)'; this.querySelector('img').style.opacity='0.6';">
          <img src="${img}" alt="${b}" title="${b}" style="max-width:100%; max-height:100%; object-fit:contain; filter:grayscale(100%); opacity:0.6; transition:all 0.3s ease;">
        </div>`).join('')}
      </div>
    </div>`;
  },

  newsletter: () => `
    <div class="newsletter">
      <div class="newsletter-eyebrow">${t('stayInfo')}</div>
      <h2>${t('subscribeTitle')}</h2>
      <p>${t('subscribeDesc')}</p>
      <div class="newsletter-form">
        <input type="email" placeholder="${t('emailPH')}" id="nlEmail">
        <button class="btn-primary" onclick="App.newsletter()">${t('subscribBtn')}</button>
      </div>
    </div>`,

  footer: () => `
    <footer class="footer">
      <div class="footer-grid">
        <div>
          <div class="footer-col-title">${t('aboutUs')}</div>
          <ul class="footer-links">
            <li><a href="#" onclick="Router.go('about')">${t('whoWeAre')}</a></li>
            <li><a href="#">${t('ourAgencies')}</a></li>
            <li><a href="#">${t('careers')}</a></li>
            <li><a href="#">${t('contact')}</a></li>
          </ul>
        </div>
        <div>
          <div class="footer-col-title">${t('proServices')}</div>
          <ul class="footer-links">
            <li><a href="#" onclick="Router.go('quote')">${t('onlineQuote')}</a></li>
            <li><a href="#">${t('siteDelivery')}</a></li>
            <li><a href="#">${t('companyAccount')}</a></li>
            <li><a href="#">${t('training')}</a></li>
          </ul>
        </div>
        <div>
          <div class="footer-col-title">${t('helpSupport')}</div>
          <ul class="footer-links">
            <li><a href="#" onclick="State.user ? Router.go('profile','tab=orders') : App.openAuthModal()">${t('orderTracking')}</a></li>
            <li><a href="#">${t('returnsRefunds')}</a></li>
            <li><a href="#">${t('warranties')}</a></li>
            <li><a href="#">${t('faq')}</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div style="display:flex;align-items:center;">
          <img src="/images/logo.png?v=3" alt="SONECOMX PRO SARL" style="max-height: 35px; object-fit: contain;">
        </div>
        <div class="footer-bottom-text">© 2025 SONECOMX PRO SARL — ${t('tagline')}</div>
        <div class="footer-bottom-text"><a href="#" style="color:#6B7280;">${t('privacy')}</a> · <a href="#" style="color:#6B7280;">${t('termsOfService')}</a></div>
      </div>
    </footer>`,

  productCards(products) {
    const valid = (products || []).filter(p => p && (p.name || p._id));
    if (!valid.length) return `<div class="loading-text" style="grid-column:1/-1">${t('noProductFound')}</div>`;
    return valid.map((p, idx) => {
      const discountVal = p.discount > 0 ? p.discount : (p.priceOld && p.priceOld > p.price ? Math.round(((p.priceOld - p.price) / p.priceOld) * 100) : 0);
      let badgeHtml = '';
      if (discountVal > 0) {
        badgeHtml = `<span class="product-badge sale">-${discountVal}%</span>`;
      } else if (p.isNew) {
        badgeHtml = `<span class="product-badge new">${t('newBadge')}</span>`;
      }

      const oldPrice = p.priceOld || (discountVal > 0 ? Math.round(p.price * (1 + discountVal / 100)) : null);
      const iconOrImg = p.thumbnail 
        ? `<img src="${p.thumbnail}" alt="${p.name}">` 
        : `<span style="font-size:48px;">${PRODUCT_ICONS[p.brand] || '🔧'}</span>`;

      const btnLabel = State.lang === 'EN' ? 'ADD TO CART' : (State.lang === 'ES' ? 'AÑADIR' : (State.lang === 'DE' ? 'WARENKORB' : (State.lang === 'AR' ? 'أضف للسلة' : 'AJOUTER AU PANIER')));

      return `
      <div class="product-card" onclick="Router.go('product','id=${p._id}')">
        <div class="product-img-wrap">
          ${badgeHtml}
          <button class="product-wishlist ${State.wishlist.includes(p._id) ? 'active' : ''}" onclick="event.stopPropagation();App.toggleWishlist('${p._id}',this)" title="${t('favorites')}">
            <i class="ti ${State.wishlist.includes(p._id) ? 'ti-heart-filled' : 'ti-heart'}"></i>
          </button>
          ${iconOrImg}
        </div>
        <div class="product-info">
          ${p.brand ? `<div class="product-brand">${p.brand}</div>` : ''}
          <div class="product-name" title="${p.name}">${p.name}</div>
          <div class="product-stars">${stars(p.rating || 4.8)} <span>(${p.numReviews || (15 + (idx % 8) * 12)})</span></div>
          <div class="product-price-row">
            <div class="product-price">${fmt(p.price)}</div>
            ${oldPrice && oldPrice > p.price ? `<div class="product-price-old">${fmt(oldPrice)}</div>` : ''}
          </div>
          <button class="add-to-cart-btn" onclick="event.stopPropagation();Cart.add({_id:'${p._id}',name:'${p.name.replace(/'/g, "\\'")}',brand:'${p.brand || ''}',price:${p.price},icon:'${PRODUCT_ICONS[p.brand] || '🔧'}'})" title="${t('addToCart')}">
            <i class="ti ti-shopping-cart"></i> ${btnLabel}
          </button>
        </div>
      </div>`;
    }).join('');
  },

  productMarquee(products, direction = 'ltr') {
    const valid = (products || []).filter(p => p && (p.name || p._id));
    if (!valid.length) return `<div class="loading-text" style="grid-column:1/-1">${t('noProductFound')}</div>`;
    const cards = Pages.productCards(valid);
    return `
      <div class="products-marquee-wrap">
        <div class="products-marquee-track ${direction === 'rtl' ? 'scroll-rtl' : 'scroll-ltr'}">
          <div class="products-marquee-group">${cards}</div>
          <div class="products-marquee-group" aria-hidden="true">${cards}</div>
        </div>
      </div>`;
  },

  /* ── CATALOGUE ────────────────────────────────────────── */
  async catalogue(params = '') {
    const urlParams = new URLSearchParams(params);
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="breadcrumb"><a onclick="Router.go('home')">${t('home')}</a><span class="sep">/</span><span>${t('catalogueTitle')}</span></div>
      <div class="filters-bar">
        <span class="filter-chip active" onclick="App.filterCat(this,'')">${t('all')}</span>
        ${(State.categories.length ? State.categories : CATEGORIES).slice(0, 8).map(c => `<span class="filter-chip ${urlParams.get('cat') === c.name ? 'active' : ''}" onclick="App.filterCat(this,'${encodeURIComponent(c.name)}')">${c.name.split(' ')[0]}</span>`).join('')}
        <select class="filter-select" id="sortSelect" onchange="App.filterSort(this.value)">
          <option value="">${t('sortBy')}</option>
          <option value="newest" ${urlParams.get('sort') === 'newest' ? 'selected' : ''}>${t('newArrivals')}</option>
          <option value="bestseller" ${urlParams.get('sort') === 'bestseller' ? 'selected' : ''}>${t('bestSellers')}</option>
          <option value="price_asc" ${urlParams.get('sort') === 'price_asc' ? 'selected' : ''}>${t('priceAsc')}</option>
          <option value="price_desc" ${urlParams.get('sort') === 'price_desc' ? 'selected' : ''}>${t('priceDesc')}</option>
          <option value="rating" ${urlParams.get('sort') === 'rating' ? 'selected' : ''}>${t('topRated')}</option>
        </select>
        <div class="results-count" id="resultsCount">${t('loading')}</div>
      </div>
      <div class="section">
        <div id="catalogueGrid" class="products-grid"><div class="spinner" style="grid-column:1/-1"></div></div>
        <div id="pagination" style="text-align:center;padding:20px 0;"></div>
      </div>
      ${Pages.footer()}`;

    const q = [];
    if (urlParams.get('cat')) q.push(`category=${encodeURIComponent(urlParams.get('cat'))}`);
    if (urlParams.get('sort')) q.push(`sort=${encodeURIComponent(urlParams.get('sort'))}`);
    if (urlParams.get('brand')) q.push(`brand=${encodeURIComponent(urlParams.get('brand'))}`);
    if (urlParams.get('search')) q.push(`search=${encodeURIComponent(urlParams.get('search'))}`);

    const res = await Http.get('/products?' + q.join('&') + '&limit=20');
    const grid = document.getElementById('catalogueGrid');
    const cnt = document.getElementById('resultsCount');
    if (res.success && res.data.length) {
      grid.innerHTML = Pages.productCards(res.data);
      cnt.textContent = `${res.total} ${res.total > 1 ? t('productPlural') : t('productSingular')}`;
    } else {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="ti ti-search"></i><h3>${t('noProductFoundTitle')}</h3><p>${t('tryOtherFilters')}</p></div>`;
      cnt.textContent = `0 ${t('productSingular')}`;
    }
  },

  /* ── PROMOTIONS ───────────────────────────────────────── */
  async promotions(params = '') {
    const urlParams = new URLSearchParams(params);
    const app = document.getElementById('app');
    const selectedCat = urlParams.get('cat') || '';
    const currentSort = urlParams.get('sort') || '';
    const catsList = (State.categories.length ? State.categories : CATEGORIES);

    app.innerHTML = `
      <div class="fam-promo-wrap">
        <!-- Hero Section -->
        <div class="fam-hero">
          <div class="fam-hero-left" style="max-width:850px;margin:0 auto;text-align:center;">
            <div class="fam-hero-badge"><i class="ti ti-sparkles"></i> BIENVENUE CHEZ SONECOMX PRO</div>
            <h1 class="fam-hero-title">
              PRODUITS DE QUALITÉ.<br>
              <span>LA CONFIANCE DES PROFESSIONNELS.</span>
            </h1>
            <p class="fam-hero-desc" style="max-width:640px;margin:0 auto 24px;">
              Découvrez une large sélection d'outillages, quincaillerie et équipements professionnels rigoureusement sélectionnés pour vos chantiers et projets.
            </p>
            <div class="fam-hero-btns" style="justify-content:center;">
              <button class="fam-btn-primary" onclick="App.scrollPromoToProducts()">
                DÉCOUVRIR LES OFFRES <i class="ti ti-chevron-right"></i>
              </button>
              <button class="fam-btn-outline" onclick="Router.go('catalogue')">
                VOIR LE CATALOGUE
              </button>
            </div>

            <!-- Micro Feature Bullets -->
            <div class="fam-hero-bullets" style="justify-content:center;">
              <div class="fam-micro-item">
                <i class="ti ti-star"></i>
                <div>
                  <div class="fam-micro-text-title">Qualité Supérieure</div>
                  <div class="fam-micro-text-sub">Produits Sélectionnés</div>
                </div>
              </div>
              <div class="fam-micro-item">
                <i class="ti ti-credit-card"></i>
                <div>
                  <div class="fam-micro-text-title">Paiement Sécurisé</div>
                  <div class="fam-micro-text-sub">100% Fiable & Protégé</div>
                </div>
              </div>
              <div class="fam-micro-item">
                <i class="ti ti-rotate-clockwise-2"></i>
                <div>
                  <div class="fam-micro-text-title">Retours Faciles</div>
                  <div class="fam-micro-text-sub">Service Garanti</div>
                </div>
              </div>
              <div class="fam-micro-item">
                <i class="ti ti-headset"></i>
                <div>
                  <div class="fam-micro-text-title">Support Client</div>
                  <div class="fam-micro-text-sub">Disponible 24h/7j</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Trust / Value Proposition Bar -->
        <div class="fam-trust-bar">
          <div class="fam-trust-item">
            <div class="fam-trust-icon-wrap"><i class="ti ti-truck"></i></div>
            <div>
              <div class="fam-trust-title">LIVRAISON NATIONALE</div>
              <div class="fam-trust-desc">Partout sur le territoire</div>
            </div>
          </div>
          <div class="fam-trust-item">
            <div class="fam-trust-icon-wrap"><i class="ti ti-rotate-clockwise-2"></i></div>
            <div>
              <div class="fam-trust-title">GARANTIE & RETOURS</div>
              <div class="fam-trust-desc">Garantie fabricant conforme</div>
            </div>
          </div>
          <div class="fam-trust-item">
            <div class="fam-trust-icon-wrap"><i class="ti ti-shield-check"></i></div>
            <div>
              <div class="fam-trust-title">PAIEMENT SÉCURISÉ</div>
              <div class="fam-trust-desc">Transactions fiables et sécurisées</div>
            </div>
          </div>
          <div class="fam-trust-item">
            <div class="fam-trust-icon-wrap"><i class="ti ti-headset"></i></div>
            <div>
              <div class="fam-trust-title">ASSISTANCE 24/7</div>
              <div class="fam-trust-desc">Une équipe à votre écoute</div>
            </div>
          </div>
        </div>

        <!-- Shop by Category (Circular Carousel) -->
        <div class="fam-section">
          <div class="fam-section-header">
            <div class="fam-section-title-wrap">
              <div class="fam-section-title">PARCOURIR PAR RAYON</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;position:relative;max-width:1200px;margin:0 auto;">
            <button class="fam-arrow-btn" style="position:absolute;left:-14px;z-index:10;" onclick="App.scrollPromoCat(-1)"><i class="ti ti-chevron-left"></i></button>
            <div class="fam-cat-circles-grid" id="famCatCircles">
              <div class="fam-cat-circle-card ${!selectedCat ? 'active' : ''}" onclick="App.filterPromoCat(this,'')">
                <div class="fam-cat-circle-img" style="background:#fef2f2;border-color:${!selectedCat ? 'var(--fam-red)' : '#e2e8f0'};">
                  <i class="ti ti-grid-dots" style="font-size:32px;color:var(--fam-red);"></i>
                </div>
                <div class="fam-cat-circle-name">Tous les rayons</div>
              </div>
              ${catsList.slice(0, 10).map(c => `
                <div class="fam-cat-circle-card ${selectedCat === c.name ? 'active' : ''}" onclick="App.filterPromoCat(this,'${encodeURIComponent(c.name)}')">
                  <div class="fam-cat-circle-img">
                    ${c.icon && (c.icon.includes('.') || c.icon.includes('/')) 
                      ? `<img src="${c.icon}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${c.name}">`
                      : `<i class="ti ${c.icon || 'ti-package'}" style="font-size:30px;color:var(--fam-navy);"></i>`
                    }
                  </div>
                  <div class="fam-cat-circle-name">${c.name.split('&')[0].trim()}</div>
                </div>
              `).join('')}
            </div>
            <button class="fam-arrow-btn" style="position:absolute;right:-14px;z-index:10;" onclick="App.scrollPromoCat(1)"><i class="ti ti-chevron-right"></i></button>
          </div>
        </div>

        <!-- Best Sellers / Promotional Products Section -->
        <div class="fam-section" id="promotionsGridContainer">
          <div class="fam-products-header">
            <div>
              <div class="fam-products-title">MEILLEURES VENTES & PROMOTIONS</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <select class="form-select" id="promoSortSelect" onchange="App.filterPromoSort(this.value)" style="width:auto;padding:6px 14px;font-size:12px;font-weight:600;border-radius:6px;">
                <option value="">${t('sortBy')}</option>
                <option value="newest" ${currentSort === 'newest' ? 'selected' : ''}>${t('newArrivals')}</option>
                <option value="bestseller" ${currentSort === 'bestseller' ? 'selected' : ''}>${t('bestSellers')}</option>
                <option value="price_asc" ${currentSort === 'price_asc' ? 'selected' : ''}>${t('priceAsc')}</option>
                <option value="price_desc" ${currentSort === 'price_desc' ? 'selected' : ''}>${t('priceDesc')}</option>
                <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>${t('topRated')}</option>
              </select>
              <span class="fam-view-all-link" onclick="Router.go('catalogue','sort=bestseller')">VOIR TOUT</span>
            </div>
          </div>
          <div id="promotionsGrid" class="fam-products-grid">
            <div class="spinner" style="grid-column:1/-1"></div>
          </div>
        </div>

        <!-- Special Offer Banner (UP TO 10% OFF) -->
        <div class="fam-special-banner">
          <div class="fam-special-left">
            <div class="fam-gift-visual">🎁</div>
            <div>
              <div class="fam-special-tag">OFFRE SPÉCIALE</div>
              <div class="fam-special-title">JUSQU'À <span>-10% DE RÉDUCTION</span></div>
              <div class="fam-special-desc">Offre à durée limitée sur une sélection d'outils et matériels professionnels.</div>
            </div>
          </div>
          <div class="fam-special-cta">
            <button class="fam-btn-primary" onclick="App.scrollPromoToProducts()">
              PROFITER DES PROMOTIONS <i class="ti ti-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- Why Shop With Us? -->
        <div class="fam-why-us">
          <div class="fam-why-title">POURQUOI <span>NOUS CHOISIR ?</span></div>
          <div class="fam-why-grid">
            <div class="fam-why-card">
              <div class="fam-why-icon"><i class="ti ti-users"></i></div>
              <div>
                <div class="fam-why-val">10 000+</div>
                <div class="fam-why-lbl">Clients satisfaits</div>
              </div>
            </div>
            <div class="fam-why-card">
              <div class="fam-why-icon"><i class="ti ti-star"></i></div>
              <div>
                <div class="fam-why-val">4.8 / 5</div>
                <div class="fam-why-lbl">Note moyenne avis</div>
              </div>
            </div>
            <div class="fam-why-card">
              <div class="fam-why-icon"><i class="ti ti-shopping-bag"></i></div>
              <div>
                <div class="fam-why-val">500+</div>
                <div class="fam-why-lbl">Produits certifiés</div>
              </div>
            </div>
            <div class="fam-why-card">
              <div class="fam-why-icon"><i class="ti ti-shield-check"></i></div>
              <div>
                <div class="fam-why-val">100%</div>
                <div class="fam-why-lbl">Commandes sécurisées</div>
              </div>
            </div>
          </div>
        </div>

        <!-- What Our Customers Say -->
        <div class="fam-testimonials-sec">
          <div class="fam-test-title">CE QUE DISENT <span>NOS CLIENTS</span></div>
          <div class="fam-test-grid">
            <div class="fam-test-card">
              <div class="fam-test-stars">★★★★★</div>
              <div class="fam-test-quote-icon">“</div>
              <p class="fam-test-text">"Qualité exceptionnelle et livraison très rapide ! Entièrement satisfait de mes achats et du suivi client."</p>
              <div class="fam-test-user">
                <div class="fam-test-avatar">JM</div>
                <div>
                  <div class="fam-test-name">Jessica M.</div>
                  <div class="fam-test-badge">✓ Client Vérifié</div>
                </div>
              </div>
            </div>
            <div class="fam-test-card">
              <div class="fam-test-stars">★★★★★</div>
              <div class="fam-test-quote-icon">“</div>
              <p class="fam-test-text">"SONECOMX PRO est notre référence pour tout le matériel de chantier, l'outillage et les EPI de sécurité."</p>
              <div class="fam-test-user">
                <div class="fam-test-avatar">DR</div>
                <div>
                  <div class="fam-test-name">David R.</div>
                  <div class="fam-test-badge">✓ Professionnel du BTP</div>
                </div>
              </div>
            </div>
            <div class="fam-test-card">
              <div class="fam-test-stars">★★★★★</div>
              <div class="fam-test-quote-icon">“</div>
              <p class="fam-test-text">"Excellent service technique et matériel robuste. Livraison sous 24h respectée comme convenu."</p>
              <div class="fam-test-user">
                <div class="fam-test-avatar">SL</div>
                <div>
                  <div class="fam-test-name">Sophie L.</div>
                  <div class="fam-test-badge">✓ Client Vérifié</div>
                </div>
              </div>
            </div>
          </div>
          <div class="fam-test-dots">
            <div class="fam-dot active"></div>
            <div class="fam-dot"></div>
            <div class="fam-dot"></div>
          </div>
        </div>

        <!-- Newsletter Signup Strip -->
        <div class="fam-newsletter-wrap">
          <div class="fam-nl-inner">
            <div class="fam-nl-left">
              <div class="fam-nl-icon"><i class="ti ti-mail"></i></div>
              <div>
                <div class="fam-nl-title">REJOIGNEZ LA COMMUNAUTÉ SONECOMX PRO</div>
                <div class="fam-nl-desc">Inscrivez-vous pour recevoir en avant-première nos offres exclusives, remises spéciales et conseils pros.</div>
              </div>
            </div>
            <div class="fam-nl-form">
              <input type="email" id="famNlEmail" class="fam-nl-input" placeholder="Votre adresse e-mail...">
              <button class="fam-nl-btn" onclick="App.famNewsletter()">
                S'INSCRIRE <i class="ti ti-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        ${Pages.footer()}
      </div>`;

    App.initPromo3D();

    const q = ['promo=true'];
    if (selectedCat) q.push(`category=${encodeURIComponent(selectedCat)}`);
    if (currentSort) q.push(`sort=${encodeURIComponent(currentSort)}`);
    if (urlParams.get('brand')) q.push(`brand=${encodeURIComponent(urlParams.get('brand'))}`);
    if (urlParams.get('search')) q.push(`search=${encodeURIComponent(urlParams.get('search'))}`);

    const res = await Http.get('/products?' + q.join('&') + '&limit=20');
    const grid = document.getElementById('promotionsGrid');
    if (grid) {
      if (res.success && res.data && res.data.length) {
        grid.innerHTML = Pages.promoProductCards(res.data);
      } else {
        // Fallback: fetch featured or bestsellers if no products currently tagged promo
        const fallbackRes = await Http.get('/products?limit=10&sort=bestseller');
        if (fallbackRes.success && fallbackRes.data && fallbackRes.data.length) {
          grid.innerHTML = Pages.promoProductCards(fallbackRes.data);
        } else {
          grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="ti ti-tag"></i><h3>${t('noPromoActive')}</h3><p>${t('noPromoDesc')}</p></div>`;
        }
      }
    }
  },

  promoProductCards(products) {
    if (!products || !products.length) {
      return `<div class="empty-state" style="grid-column:1/-1"><i class="ti ti-tag"></i><h3>${t('noPromoActive')}</h3><p>${t('noPromoDesc')}</p></div>`;
    }
    const badges = ['TOP VENTE', 'PROMO -25%', 'NOUVEAU', 'PROMO -30%', 'PROMO -20%', 'OFFRE SPÉCIALE'];
    return products.map((p, idx) => {
      const discountVal = p.discount > 0 ? p.discount : (20 + (idx % 3) * 5);
      const discountLabel = p.discount > 0 ? `-${p.discount}%` : (p.isNew ? 'NOUVEAU' : (badges[idx % badges.length]));
      const oldPrice = p.priceOld || Math.round(p.price * (1 + discountVal / 100));
      const iconOrImg = p.thumbnail 
        ? `<img src="${p.thumbnail}" style="max-width:100%;max-height:100%;object-fit:contain;transition:transform 0.3s;" alt="${p.name}">`
        : `<span style="font-size:48px;">${PRODUCT_ICONS[p.brand] || '🔧'}</span>`;
      return `
        <div class="fam-product-card" onclick="Router.go('product','id=${p._id}')">
          <div class="fam-prod-img-wrap">
            <span class="fam-prod-badge">${discountLabel}</span>
            <button class="fam-prod-wishlist ${State.wishlist.includes(p._id) ? 'active' : ''}" onclick="event.stopPropagation();App.toggleWishlist('${p._id}',this)" title="${t('favorites')}">
              <i class="ti ${State.wishlist.includes(p._id) ? 'ti-heart-filled' : 'ti-heart'}"></i>
            </button>
            ${iconOrImg}
          </div>
          <div class="fam-prod-body">
            <div class="fam-prod-title" title="${p.name}">${p.name}</div>
            <div class="fam-prod-stars">
              ${stars(p.rating || 4.8)} <span>(${p.numReviews || (120 + idx * 45)})</span>
            </div>
            <div class="fam-prod-prices">
              <div class="fam-prod-price-now">${fmt(p.price)}</div>
              <div class="fam-prod-price-old">${fmt(oldPrice)}</div>
            </div>
            <button class="fam-add-cart-btn" onclick="event.stopPropagation();Cart.add({_id:'${p._id}',name:'${p.name.replace(/'/g, "\\'")}',brand:'${p.brand || ''}',price:${p.price},icon:'${PRODUCT_ICONS[p.brand] || '🔧'}'})" title="${t('addToCart')}">
              <i class="ti ti-shopping-cart"></i> AJOUTER AU PANIER
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  /* ── PRODUCT DETAIL ───────────────────────────────────── */
  async product(params = '') {
    const id = new URLSearchParams(params).get('id');
    if (!id) { Router.go('catalogue'); return; }
    const app = document.getElementById('app');
    app.innerHTML = `<div class="spinner"></div>`;
    const res = await Http.get(`/products/${id}`);
    if (!res.success) { app.innerHTML = `<div class="empty-state"><i class="ti ti-alert-circle"></i><h3>${t('noProductFoundTitle')}</h3></div>`; return; }
    const p = res.data;
    app.innerHTML = `
      <div class="breadcrumb"><a onclick="Router.go('home')">${t('home')}</a><span class="sep">/</span><a onclick="Router.go('catalogue')">${t('catalogueTitle')}</a><span class="sep">/</span><span>${p.name}</span></div>
      <div class="product-page-wrap">
        <div>
          <div class="product-main-img" id="productMainImgContainer" style="${p.thumbnail ? 'padding:0;background:none;' : ''}">
            ${p.images && p.images.length > 0 ? `<img id="mainProductImage" src="${p.images[0]}" style="width:100%;height:100%;object-fit:contain;border-radius:var(--radius-xl);" alt="${p.name}">` : (p.thumbnail ? `<img id="mainProductImage" src="${p.thumbnail}" style="width:100%;height:100%;object-fit:contain;border-radius:var(--radius-xl);" alt="${p.name}">` : (PRODUCT_ICONS[p.brand] || '🔧'))}
          </div>
          ${p.images && p.images.length > 1 ? `
            <div class="gallery-thumbs" style="display:flex;gap:10px;justify-content:center;margin-top:16px;overflow-x:auto;padding-bottom:5px;">
              ${p.images.map((img, idx) => `
                <div class="gallery-thumb ${idx === 0 ? 'active' : ''}" onclick="App.setProductImage('${img.replace(/'/g, "\\'")}', this)" style="width:70px;height:70px;border:2px solid ${idx === 0 ? 'var(--blue)' : 'var(--border)'};border-radius:var(--radius);cursor:pointer;padding:4px;background:var(--white);display:flex;align-items:center;justify-content:center;transition:all var(--transition);">
                  <img src="${img}" style="max-width:100%;max-height:100%;object-fit:contain;">
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div>
          <div class="product-detail-brand" style="font-size:12px;color:var(--blue);font-weight:700;text-transform:uppercase;margin-bottom:4px;">${t('brandLabel')} ${p.brand}</div>
          <h1 class="product-detail-name" style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:32px;text-transform:uppercase;margin-bottom:8px;color:var(--text);line-height:1.1;">${p.name}</h1>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px;">
            <span style="color:#FFCA28;font-size:16px;">${stars(p.rating || 0)}</span>
            <span style="font-size:12px;color:var(--text-muted);">(${p.numReviews || 0} ${p.numReviews > 1 ? t('clientReviews') : t('clientReview')})</span>
          </div>
          <div style="margin-bottom:20px;">
            <span class="price-now" style="font-size:32px;font-weight:800;font-family:'Barlow Condensed',sans-serif;color:var(--red);">${fmt(p.price)}</span>
            ${p.priceOld > p.price ? `<span class="price-was" style="font-size:16px;color:var(--text-muted);text-decoration:line-through;margin-left:10px;">${fmt(p.priceOld)}</span><span class="price-save" style="font-size:12px;color:var(--green);font-weight:600;background:var(--green-light);padding:2px 8px;border-radius:4px;margin-left:8px;">-${p.discount}%</span>` : ''}
          </div>
          <p style="font-size:14px;color:var(--text-muted);line-height:1.7;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:20px;">
            ${p.shortDesc || p.description?.substring(0, 250) || t('noDesc')}
          </p>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:20px;flex-wrap:wrap;">
            <div class="qty-selector" style="margin:0;display:flex;align-items:center;gap:8px;background:var(--white);border:1.5px solid var(--border);border-radius:var(--radius);padding:2px 8px;height:40px;">
              <button class="qty-btn" onclick="App.changeQty(-1)" style="border:none;background:none;font-size:18px;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">−</button>
              <input type="number" class="qty-input" id="qtyInput" value="1" min="1" max="${p.stock}" style="width:40px;height:30px;text-align:center;border:none;outline:none;font-weight:700;font-size:14px;background:transparent;">
              <button class="qty-btn" onclick="App.changeQty(1)" style="border:none;background:none;font-size:18px;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">+</button>
            </div>
            <button class="btn-primary" style="background:#1A1A2E;color:#fff;font-weight:700;font-size:13px;padding:0 24px;border-radius:var(--radius);border:none;height:40px;text-transform:uppercase;display:inline-flex;align-items:center;gap:8px;transition:all var(--transition);cursor:pointer;" onclick="Cart.add({_id:'${p._id}',name:'${p.name.replace(/'/g, "\\'")}',brand:'${p.brand}',price:${p.price},icon:'${PRODUCT_ICONS[p.brand] || '🔧'}'},parseInt(document.getElementById('qtyInput').value))" onmouseover="this.style.background='var(--blue)'" onmouseout="this.style.background='#1A1A2E'">
              <i class="ti ti-file-plus" style="font-size:16px;"></i> ${t('addToCart')}
            </button>
            <button style="height:40px;padding:0 16px;font-weight:700;font-size:13px;border-radius:var(--radius);border:1.5px solid var(--blue);color:var(--blue);background:transparent;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all 0.2s;" onclick="Router.go('quote')" onmouseover="this.style.background='var(--blue)';this.style.color='#fff';" onmouseout="this.style.background='transparent';this.style.color='var(--blue)';"><i class="ti ti-file-invoice" style="font-size:16px;"></i> Devis Express</button>
            <button class="btn-ghost ${State.wishlist.includes(p._id) ? 'active' : ''}" style="height:40px;width:40px;padding:0;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid var(--border);border-radius:var(--radius);background:var(--white);cursor:pointer;transition:all var(--transition);" onclick="App.toggleWishlist('${p._id}',this)" onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)';" onmouseout="if(!this.classList.contains('active')){this.style.borderColor='var(--border)';this.style.color='var(--text-muted)';}">
              <i class="ti ${State.wishlist.includes(p._id) ? 'ti-heart-filled' : 'ti-heart'}" style="font-size:18px;"></i>
            </button>
          </div>
          <div style="font-size:13px;color:var(--text-muted);display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
            <div><span style="font-weight:600;color:var(--text);">${t('skuLabel')}</span> ${p.sku || 'N/A'}</div>
            <div><span style="font-weight:600;color:var(--text);">${t('categoryLabel')}</span> ${p.category?.name || 'Général'}</div>
            <div><span style="font-weight:600;color:var(--text);">${t('availabilityLabel')}</span> <span style="font-weight:600;color:${p.stock > 0 ? 'var(--green)' : 'var(--red)'};">${p.stock > 0 ? t('inStock') : t('outOfStock')} (${p.stock} ${t('units')})</span></div>
          </div>
          <div style="font-size:13px;color:var(--text-muted);display:flex;align-items:center;gap:12px;border-top:1px solid var(--border);padding-top:16px;flex-wrap:wrap;">
            <span style="font-weight:600;color:var(--text);">${t('shareProduct')}</span>
            <div style="display:flex;gap:12px;font-size:16px;">
              <a href="#" style="color:#3B5998;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="ti ti-brand-facebook"></i></a>
              <a href="#" style="color:#1DA1F2;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="ti ti-brand-twitter"></i></a>
              <a href="#" style="color:#BD081C;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="ti ti-brand-pinterest"></i></a>
              <a href="#" style="color:#0077B5;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="ti ti-brand-linkedin"></i></a>
            </div>
          </div>
        </div>
      </div>
      
      <div class="product-tabs-section" style="max-width:1100px;margin:40px auto 0;padding:0 24px;">
        <div class="product-tabs-header" style="display:flex;justify-content:center;gap:30px;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:24px;">
          <button class="tab-btn active" onclick="App.changeProductTab(this,'desc')" style="background:none;border:none;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:18px;text-transform:uppercase;color:var(--red);cursor:pointer;padding-bottom:4px;border-bottom:2px solid var(--red);outline:none;">${t('descriptionTab')}</button>
          <button class="tab-btn" onclick="App.changeProductTab(this,'specs')" style="background:none;border:none;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:18px;text-transform:uppercase;color:var(--text-muted);cursor:pointer;padding-bottom:4px;border-bottom:2px solid transparent;outline:none;">${t('specsTab')}</button>
          <button class="tab-btn" onclick="App.changeProductTab(this,'reviews')" style="background:none;border:none;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:18px;text-transform:uppercase;color:var(--text-muted);cursor:pointer;padding-bottom:4px;border-bottom:2px solid transparent;outline:none;">${t('reviewsTab')} (${p.numReviews || 0})</button>
        </div>
        
        <div id="tab-desc" class="tab-content" style="display:block;font-size:14px;color:var(--text-muted);line-height:1.8;">
          <p>${p.description || t('noDesc')}</p>
        </div>
        
        <div id="tab-specs" class="tab-content" style="display:none;font-size:14px;color:var(--text-muted);line-height:1.8;">
          <div class="product-specs" style="background:var(--gray-bg);border-radius:var(--radius-lg);padding:20px;max-width:600px;margin:0 auto;">
            <div class="spec-row" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span class="spec-key" style="font-weight:600;color:var(--text);">${t('skuTitle')}</span><span>${p.sku || 'N/A'}</span></div>
            <div class="spec-row" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span class="spec-key" style="font-weight:600;color:var(--text);">${t('brandTitle')}</span><span>${p.brand}</span></div>
            <div class="spec-row" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span class="spec-key" style="font-weight:600;color:var(--text);">${t('stock')}</span><span>${p.stock} ${t('units')}</span></div>
            ${(p.features || []).map(f => `<div class="spec-row" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span class="spec-key" style="font-weight:600;color:var(--text);">${f.key}</span><span>${f.value}</span></div>`).join('')}
          </div>
        </div>
        
        <div id="tab-reviews" class="tab-content" style="display:none;font-size:14px;color:var(--text-muted);line-height:1.8;max-width:700px;margin:0 auto;">
          <div style="font-weight:700;font-size:16px;color:var(--text);margin-bottom:16px;text-transform:uppercase;font-family:'Barlow Condensed',sans-serif;">${t('proReviews')} (${p.numReviews || 0})</div>
          ${p.reviews && p.reviews.length > 0 ? `
            <div style="display:flex;flex-direction:column;gap:16px;">
              ${p.reviews.map(r => `
                <div style="border-bottom:1px solid var(--border);padding-bottom:12px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <span style="font-weight:600;color:var(--text);">${r.name || (r.user ? `${r.user.firstName} ${r.user.lastName}` : t('userLabel'))}</span>
                    <span style="color:#FFCA28;">${stars(r.rating || 0)}</span>
                  </div>
                  <p style="font-size:13px;color:var(--text-muted);">${r.comment}</p>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="text-align:center;padding:20px;color:var(--text-light);">
              <i class="ti ti-message-square" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.5;text-align:center;margin:0 auto 8px;"></i>
              <p>${t('noReviews')}</p>
            </div>
          `}
        </div>
      </div>

      <div class="related-products-section" style="max-width:1100px;margin:60px auto 0;padding:0 24px 40px;border-top:1px solid var(--border);padding-top:40px;">
        <div style="text-align:center;margin-bottom:30px;">
          <h2 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:26px;text-transform:uppercase;color:var(--text);margin-bottom:4px;">${t('relatedProducts')}</h2>
          <div style="font-size:20px;color:var(--red);line-height:0.5;font-weight:bold;margin-bottom:10px;">~</div>
        </div>
        <div id="relatedProductsGrid" class="products-grid">
          <div class="spinner" style="grid-column:1/-1"></div>
        </div>
      </div>
      <div class="mobile-product-sticky-bar">
        <div class="mobile-product-sticky-price">
          <div class="sticky-price-val">${fmt(p.price)}</div>
          <div class="sticky-price-label">${p.stock > 0 ? t('inStock') : t('outOfStock')}</div>
        </div>
        <div class="mobile-product-sticky-actions">
          <button class="sticky-quote-btn" onclick="Router.go('quote')">
            <i class="ti ti-file-invoice"></i> Devis
          </button>
          <button class="sticky-add-btn" onclick="Cart.add({_id:'${p._id}',name:'${p.name.replace(/'/g, "\\'")}',brand:'${p.brand || ''}',price:${p.price},icon:'${PRODUCT_ICONS[p.brand] || '🔧'}'},parseInt(document.getElementById('qtyInput')?.value || 1))">
            <i class="ti ti-file-plus"></i> ${t('addToCart')}
          </button>
        </div>
      </div>
      ${Pages.footer()}`;

    // Load related products
    Http.get(`/products/${id}/related`).then(relatedRes => {
      const grid = document.getElementById('relatedProductsGrid');
      if (grid) {
        if (relatedRes.success && relatedRes.data && relatedRes.data.length) {
          grid.innerHTML = Pages.productCards(relatedRes.data.slice(0, 5));
        } else {
          grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:13px;padding:20px 0;">${t('noRelatedProducts')}</div>`;
        }
      }
    }).catch(err => {
      console.error("Erreur lors de la récupération des produits similaires:", err);
    });
  },

  /* ── AUTH ─────────────────────────────────────────────── */
  auth() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="/images/logo.png?v=3" alt="SONECOMX PRO SARL" style="max-height: 50px; object-fit: contain;">
          </div>
          <div id="authContent">${Pages.loginForm()}</div>
        </div>
      </div>
      ${Pages.footer()}`;
  },

  loginForm: () => `
    <div class="auth-title">Espace Administration</div>
    <div class="auth-sub">Connexion réservée aux administrateurs de la plateforme SONECOMX PRO</div>
    <div class="form-group"><label class="form-label">${t('emailLabel')}</label><input class="form-input" type="email" id="loginEmail" placeholder="admin@sonecomxpro.cm" onkeydown="if(event.key==='Enter') App.login()"></div>
    <div class="form-group"><label class="form-label">${t('passwordLabel')}</label><input class="form-input" type="password" id="loginPassword" placeholder="••••••••" onkeydown="if(event.key==='Enter') App.login()"></div>
    <button class="btn-primary" style="width:100%;justify-content:center;padding:12px;" onclick="App.login()"><i class="ti ti-login"></i> ${t('login')}</button>`,

  /* ── PROFILE ──────────────────────────────────────────── */
  async profile(params = '') {
    if (!State.user) { Router.go('auth'); return; }
    const tab = new URLSearchParams(params).get('tab') || 'info';
    const app = document.getElementById('app');
    const initials = (State.user.firstName[0] + State.user.lastName[0]).toUpperCase();
    app.innerHTML = `
      <div class="breadcrumb"><a onclick="Router.go('home')">${t('home')}</a><span class="sep">/</span><span>${t('myAccount')}</span></div>
      <div class="profile-grid">
        <div class="profile-sidebar">
          <div class="profile-avatar">${initials}</div>
          <div class="profile-name">${State.user.firstName} ${State.user.lastName}</div>
          <div class="profile-role">${State.user.role === 'pro' ? `⚙️ ${t('companyAccount')}` : State.user.role === 'admin' ? `🛡️ ${t('adminRole')}` : `👤 ${t('individualOption')}`}</div>
          ${[
        { tab: 'info', icon: 'ti-user', label: t('myInfo') },
        { tab: 'orders', icon: 'ti-shopping-cart', label: t('myOrdersTab') },
        { tab: 'quotes', icon: 'ti-file-invoice', label: t('myQuotesTab') },
        { tab: 'wishlist', icon: 'ti-heart', label: t('favorites') },
        { tab: 'security', icon: 'ti-lock', label: t('security') },
      ].map(item => `<div class="profile-nav-item ${tab === item.tab ? 'active' : ''}" onclick="Router.go('profile','tab=${item.tab}')"><i class="ti ${item.icon}"></i>${item.label}</div>`).join('')}
          ${State.user.role === 'admin' ? `<div class="profile-nav-item" onclick="window.location.href='/admin.html'" style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px;"><i class="ti ti-layout-dashboard"></i>${t('adminDashboard')}</div>` : ''}
          <div class="profile-nav-item" onclick="Auth.logout()" style="color:var(--red);margin-top:8px;border-top:1px solid var(--border);padding-top:8px;"><i class="ti ti-logout"></i>${t('logout')}</div>
        </div>
        <div class="profile-content" id="profileContent"><div class="spinner"></div></div>
      </div>
      ${Pages.footer()}`;
    await Pages.profileTab(tab);
  },

  async profileTab(tab) {
    const el = document.getElementById('profileContent');
    if (!el) return;
    if (tab === 'info') {
      el.innerHTML = `
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;text-transform:uppercase;margin-bottom:20px;">${t('myInfo')}</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">${t('firstNameLabel')}</label><input class="form-input" id="editFirst" value="${State.user.firstName}"></div>
          <div class="form-group"><label class="form-label">${t('lastNameLabel')}</label><input class="form-input" id="editLast" value="${State.user.lastName}"></div>
        </div>
        <div class="form-group"><label class="form-label">${t('emailLabel')}</label><input class="form-input" value="${State.user.email}" disabled style="opacity:0.6"></div>
        <div class="form-group"><label class="form-label">${t('phoneLabel')}</label><input class="form-input" id="editPhone" value="${State.user.phone || ''}"></div>
        <div class="form-group"><label class="form-label">${t('companyLabel')}</label><input class="form-input" id="editCompany" value="${State.user.company || ''}"></div>
        <button class="btn-blue" onclick="App.updateProfile()"><i class="ti ti-check"></i> ${t('saveChanges')}</button>`;
    } else if (tab === 'orders') {
      el.innerHTML = `<div class="spinner"></div>`;
      const res = await Http.get('/orders/my');
      if (!res.success || !res.data.length) {
        el.innerHTML = `<div class="empty-state"><i class="ti ti-shopping-cart"></i><h3>${t('noOrderTitle')}</h3><p>${t('noOrderDesc')}</p><button class="btn-blue" onclick="Router.go('catalogue')" style="margin-top:16px;">${t('startShopping')}</button></div>`;
        return;
      }
      el.innerHTML = `
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;text-transform:uppercase;margin-bottom:20px;">${t('myOrdersTab')} (${res.data.length})</div>
        <table class="data-table">
          <thead><tr><th>${t('orderNum')}</th><th>${t('dateLabel')}</th><th>Total</th><th>${t('statusLabel')}</th></tr></thead>
          <tbody>${res.data.map(o => `
            <tr>
              <td style="font-weight:600;color:var(--blue);">${o.orderNumber}</td>
              <td>${new Date(o.createdAt).toLocaleDateString(State.lang === 'fr' ? 'fr-FR' : 'en-US')}</td>
              <td style="font-weight:600;">${fmt(o.totalPrice)}</td>
              <td><span class="badge ${o.status === 'delivered' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-pending'}">${o.status}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    } else if (tab === 'quotes') {
      el.innerHTML = `<div class="spinner"></div>`;
      const res = await Http.get('/quotes/my');
      if (!res.success || !res.data.length) {
        el.innerHTML = `<div class="empty-state"><i class="ti ti-file-invoice"></i><h3>${t('noQuotesTitle')}</h3><p>${t('noQuotesDesc')}</p><button class="btn-blue" onclick="Router.go('quote')" style="margin-top:16px;">${t('requestQuoteBtn')}</button></div>`;
        return;
      }
      el.innerHTML = `
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;text-transform:uppercase;margin-bottom:20px;">${t('myQuotesTab')}</div>
        <table class="data-table">
          <thead><tr><th>${t('quoteNum')}</th><th>${t('dateLabel')}</th><th>${t('statusLabel')}</th><th>${t('adminReplyLabel')}</th></tr></thead>
          <tbody>${res.data.map(q => `
            <tr>
              <td style="font-weight:600;color:var(--blue);">${q.quoteNumber}</td>
              <td>${new Date(q.createdAt).toLocaleDateString(State.lang === 'fr' ? 'fr-FR' : 'en-US')}</td>
              <td><span class="badge ${q.status === 'accepted' ? 'badge-success' : q.status === 'rejected' ? 'badge-danger' : 'badge-pending'}">${q.status}</span></td>
              <td style="font-size:12px;color:var(--text-muted);">${q.adminReply || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    } else if (tab === 'security') {
      el.innerHTML = `
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;text-transform:uppercase;margin-bottom:20px;">${t('security')}</div>
        <div class="form-group"><label class="form-label">${t('currentPasswordLabel')}</label><input class="form-input" type="password" id="curPwd"></div>
        <div class="form-group"><label class="form-label">${t('newPasswordLabel')}</label><input class="form-input" type="password" id="newPwd"></div>
        <div class="form-group"><label class="form-label">${t('confirmPasswordLabel')}</label><input class="form-input" type="password" id="confPwd"></div>
        <button class="btn-blue" onclick="App.changePassword()"><i class="ti ti-lock"></i> ${t('changePasswordBtn')}</button>`;
    } else if (tab === 'wishlist') {
      el.innerHTML = `<div class="empty-state"><i class="ti ti-heart"></i><h3>${t('favorites')}</h3><p>${t('noFavoritesDesc')}</p></div>`;
    }
  },

  /* ── QUOTE ────────────────────────────────────────────── */
  quote() {
    const app = document.getElementById('app');
    const u = State.user || {};
    app.innerHTML = `
      <div class="breadcrumb"><a onclick="Router.go('home')">${t('home')}</a><span class="sep">/</span><span>${t('quotePageTitle')}</span></div>
      <div style="max-width:800px;margin:0 auto;padding:28px 24px;">
        <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-xl);padding:32px;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:26px;text-transform:uppercase;margin-bottom:6px;display:flex;align-items:center;gap:10px;"><i class="ti ti-file-invoice" style="color:var(--blue);"></i> ${t('quotePageTitle')}</div>
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:24px;">${t('quotePageDesc')}</p>
          <div class="form-row">
            <div class="form-group"><label class="form-label">${t('fullNameLabel')} <span style="color:var(--red)">*</span></label><input class="form-input" id="qName" value="${u.firstName ? (u.firstName + ' ' + (u.lastName || '')) : ''}" placeholder="Votre nom complet"></div>
            <div class="form-group"><label class="form-label">${t('emailLabel')} <span style="color:var(--red)">*</span></label><input class="form-input" type="email" id="qEmail" value="${u.email || ''}" placeholder="votre@email.com"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">${t('companyLabel')}</label><input class="form-input" id="qCompany" value="${u.company || ''}" placeholder="${t('companyPH')}"></div>
            <div class="form-group"><label class="form-label">${t('phoneLabel')} <span style="color:var(--red)">*</span></label><input class="form-input" id="qPhone" value="${u.phone || ''}" placeholder="+237 6xx xxx xxx"></div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('needsDescLabel')} <span style="color:var(--red)">*</span></label>
            <textarea class="form-input" id="qMessage" rows="5" placeholder="${t('needsDescPH')}"></textarea>
          </div>
          <div id="quoteItems">
            <div style="font-weight:600;font-size:13px;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.3px;">${t('itemsOptional')}</div>
            <div id="quoteItemsList">
              <div class="form-row" style="margin-bottom:8px;">
                <input class="form-input" placeholder="${t('itemDescPH')}" id="qi_desc_0">
                <input class="form-input" type="number" placeholder="${t('qtyPH')}" id="qi_qty_0" min="1" value="1" style="max-width:80px">
              </div>
            </div>
            <button class="btn-ghost" style="font-size:12px;" onclick="App.addQuoteItem()"><i class="ti ti-plus"></i> ${t('addItemBtn')}</button>
          </div>
          <div style="margin-top:24px;">
            <button class="btn-primary" style="padding:12px 28px;" onclick="App.submitQuote()"><i class="ti ti-send"></i> ${t('sendRequestBtn')}</button>
          </div>
        </div>
      </div>
      ${Pages.footer()}`;
  },

  /* ── CHECKOUT ─────────────────────────────────────────── */
  checkout() {
    if (!State.cart.length) { Router.go('catalogue'); Toast.show(t('cartEmpty'), 'warning'); return; }
    Cart.close();
    const app = document.getElementById('app');
    const u = State.user || {};
    const sub = Cart.getTotal(), ship = Cart.getShipping(), tax = Math.round(sub * 0.1925);
    app.innerHTML = `
      <div class="breadcrumb"><a onclick="Router.go('home')">${t('home')}</a><span class="sep">/</span><a onclick="Cart.open()">${t('cart')}</a><span class="sep">/</span><span>${t('orderSummary')}</span></div>
      <div class="checkout-grid">
        <div>
          <div class="checkout-section">
            <div class="checkout-section-title"><i class="ti ti-map-pin" style="color:var(--blue);"></i> ${t('shippingAddressLabel')}</div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">${t('fullNameLabel')} <span style="color:var(--red)">*</span></label><input class="form-input" id="shFullName" value="${u.firstName ? (u.firstName + ' ' + (u.lastName || '')) : ''}" placeholder="Votre nom complet"></div>
              <div class="form-group"><label class="form-label">${t('phoneLabel')} <span style="color:var(--red)">*</span></label><input class="form-input" id="shPhone" value="${u.phone || ''}" placeholder="+237 6xx xxx xxx"></div>
            </div>
            <div class="form-group"><label class="form-label">${t('emailLabel')} <span style="color:var(--red)">*</span></label><input class="form-input" type="email" id="shEmail" value="${u.email || ''}" placeholder="votre@email.com"></div>
            <div class="form-group"><label class="form-label">${t('addressLabel')} <span style="color:var(--red)">*</span></label><input class="form-input" id="shStreet" placeholder="${t('addressPH')}"></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">${t('cityLabel')}</label>
                <select class="form-select" id="shCity">
                  <option>Yaoundé</option><option>Douala</option><option>Bafoussam</option>
                  <option>Garoua</option><option>Maroua</option><option>Bamenda</option><option>Ngaoundéré</option>
                </select>
              </div>
              <div class="form-group"><label class="form-label">${t('regionLabel')}</label><input class="form-input" id="shRegion" placeholder="Centre, Littoral..."></div>
            </div>
          </div>
          <div class="checkout-section">
            <div class="checkout-section-title"><i class="ti ti-notes" style="color:var(--blue);"></i> ${t('notesOptional')}</div>
            <textarea class="form-input" id="orderNotes" rows="3" placeholder="${t('notesPH')}"></textarea>
          </div>
        </div>
        <div>
          <div class="order-summary-card">
            <div class="order-summary-title">${t('orderSummary')}</div>
            ${State.cart.map(item => `
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
                <span style="color:var(--text-muted);">${item.name} ×${item.qty}</span>
                <span style="font-weight:600;">${fmt(item.price * item.qty)}</span>
              </div>`).join('')}
            <div style="border-top:1px solid var(--border);margin:12px 0;"></div>
            <div class="cart-summary-row"><span>${t('subtotal')}</span><span>${fmt(sub)}</span></div>
            <div class="cart-summary-row"><span>${t('delivery')}</span><span style="color:${ship === 0 ? 'var(--green)' : 'inherit'}">${ship === 0 ? t('free') : fmt(ship)}</span></div>
            <div class="cart-summary-row"><span>${t('vat')}</span><span>${fmt(tax)}</span></div>
            <div class="cart-summary-row total"><span>Montant Indicatif HT/TTC</span><span style="color:var(--blue);">${fmt(sub + ship + tax)}</span></div>
            <button class="btn-primary" style="width:100%;justify-content:center;padding:13px;margin-top:16px;" onclick="App.placeOrder()">
              <i class="ti ti-send"></i> ${t('confirmOrderBtn')}
            </button>
            <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;"><i class="ti ti-shield-check"></i> ${t('secureCheckout')}</p>
          </div>
        </div>
      </div>
      ${Pages.footer()}`;
  },

  /* ── ADMIN ────────────────────────────────────────────── */
  async admin() {
    if (!State.user || State.user.role !== 'admin') { Router.go('home'); return; }
    const app = document.getElementById('app');
    app.innerHTML = `<div class="spinner"></div>`;
    const [statsRes, actRes] = await Promise.all([Http.get('/dashboard/stats'), Http.get('/dashboard/activity')]);
    const stats = statsRes.data?.kpis || {};
    const activity = actRes.data || {};
    app.innerHTML = `
      <div style="background:var(--blue-dark);padding:16px 24px;display:flex;align-items:center;justify-content:space-between;color:#fff;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;">🛡️ DASHBOARD ADMINISTRATEUR</div>
        <div style="display:flex;gap:12px;">
          <button class="btn-outline" style="font-size:12px;padding:7px 14px;" onclick="Router.go('home')"><i class="ti ti-arrow-left"></i> Retour au site</button>
          <button class="btn-primary" style="font-size:12px;padding:7px 14px;" onclick="Pages.admin()"><i class="ti ti-refresh"></i> Actualiser</button>
        </div>
      </div>
      <div style="padding:20px 24px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:4px;">
        ${[
        { label: 'Visiteurs / mois', val: '24 381', trend: '+18.4%', icon: 'ti-users', color: 'var(--blue)' },
        { label: 'Commandes', val: stats.totalOrders || 0, trend: `+${stats.monthOrders || 0} ce mois`, icon: 'ti-shopping-cart', color: 'var(--green)' },
        { label: 'Chiffre d\'affaires', val: stats.monthRevenue ? fmt(stats.monthRevenue) : '—', trend: `vs ${stats.prevRevenue ? fmt(stats.prevRevenue) : '—'}`, icon: 'ti-currency-franc', color: 'var(--amber)' },
        { label: 'Devis en attente', val: stats.pendingQuotes || 0, trend: `${stats.totalQuotes || 0} total`, icon: 'ti-file-invoice', color: 'var(--red)' },
      ].map(kpi => `
          <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;border-left:3px solid ${kpi.color};">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;display:flex;align-items:center;gap:6px;"><i class="ti ${kpi.icon}" style="color:${kpi.color};font-size:14px;"></i>${kpi.label}</div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:26px;margin-bottom:4px;">${kpi.val}</div>
            <div style="font-size:11px;color:var(--green);">${kpi.trend}</div>
          </div>`).join('')}
      </div>
      <div style="padding:0 24px 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:16px;text-transform:uppercase;margin-bottom:14px;">Dernières commandes</div>
          <table class="data-table">
            <thead><tr><th>N°</th><th>Client</th><th>Total</th><th>Statut</th></tr></thead>
            <tbody>${(activity.recentOrders || []).map(o => `
              <tr>
                <td style="font-weight:600;color:var(--blue);font-size:12px;">${o.orderNumber}</td>
                <td style="font-size:12px;">${o.user?.firstName || ''} ${o.user?.lastName || ''}</td>
                <td style="font-weight:600;font-size:12px;">${fmt(o.totalPrice)}</td>
                <td><span class="badge ${o.status === 'delivered' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-pending'}" style="font-size:9px;">${o.status}</span></td>
              </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">Aucune commande</td></tr>'}
            </tbody>
          </table>
        </div>
        <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:16px;text-transform:uppercase;margin-bottom:14px;">Nouveaux utilisateurs</div>
          <table class="data-table">
            <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th></tr></thead>
            <tbody>${(activity.recentUsers || []).map(u => `
              <tr>
                <td style="font-size:12px;font-weight:600;">${u.firstName} ${u.lastName}</td>
                <td style="font-size:11px;color:var(--text-muted);">${u.email}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'pro' ? 'badge-info' : 'badge-success'}" style="font-size:9px;">${u.role}</span></td>
              </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px;">Aucun utilisateur</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      <div style="padding:0 24px 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
        ${[
        { icon: 'ti-package', label: 'Produits', count: stats.totalProducts || 0, sub: `⚠️ ${stats.lowStock || 0} en stock faible`, href: 'products' },
        { icon: 'ti-users', label: 'Utilisateurs', count: stats.totalUsers || 0, sub: `+${stats.monthUsers || 0} ce mois`, href: 'users' },
        { icon: 'ti-category', label: 'Catégories', count: '16', sub: 'Tous les rayons actifs', href: 'categories' },
      ].map(item => `
          <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="">
            <div style="width:44px;height:44px;background:var(--blue-light);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--blue);flex-shrink:0;"><i class="ti ${item.icon}"></i></div>
            <div><div style="font-size:22px;font-weight:800;font-family:'Barlow Condensed',sans-serif;">${item.count}</div><div style="font-size:13px;font-weight:600;">${item.label}</div><div style="font-size:11px;color:var(--text-muted);">${item.sub}</div></div>
          </div>`).join('')}
      </div>
      ${Pages.footer()}`;
  },

  /* ── ABOUT ────────────────────────────────────────────── */
  switchAboutTab(tabName, btn) {
    document.querySelectorAll('.about-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.about-tab-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(
      tabName === 'mission' ? 'aboutTabMission' :
      tabName === 'vision' ? 'aboutTabVision' : 'aboutTabGoals'
    );
    if (target) target.classList.add('active');
  },

  about() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <!-- 1. HERO BANNER -->
      <div class="about-hero">
        <div class="about-hero-title">${t('aboutUs')}</div>
        <div class="about-hero-breadcrumb">
          <a onclick="Router.go('home')">${t('home')}</a>
          <span class="sep">></span>
          <span>${t('aboutUs')}</span>
        </div>
      </div>

      <!-- 2. COMPANY PRESENTATION SECTION -->
      <div class="about-section">
        <div class="about-company-grid">
          <!-- Left: Image Collage with Floating Badge -->
          <div class="about-collage">
            <img src="/images/company/expert-superviseur.jpg" alt="Superviseur technique SONECOMX PRO" class="about-collage-img1" />
            <div class="about-badge-exp">
              <div class="exp-val">23+</div>
              <div class="exp-txt">ANNÉES D'EXPÉRIENCE<br>DANS LE SECTEUR</div>
            </div>
            <img src="/images/company/experte-ingenieure.jpg" alt="Ingénieure de projet SONECOMX PRO" class="about-collage-img2" />
          </div>

          <!-- Right: Description & Bullet Checklist -->
          <div class="about-company-info">
            <div class="about-tag">PRÉSENTATION DE L'ENTREPRISE</div>
            <h2 class="about-title">L'un des moyens les plus rapides d'assurer le <em>succès de vos projets</em></h2>
            <p class="about-company-desc">
              SONECOMX PRO SARL accompagne les professionnels du BTP, artisans, PME et grands complexes industriels en leur fournissant des équipements certifiés, un stock fiable et des solutions logistiques adaptées aux exigences de chaque chantier.
            </p>
            <div class="about-check-grid">
              <div class="about-check-item"><i class="ti ti-check"></i> <span>Solutions d'urgence & SAV réactif</span></div>
              <div class="about-check-item"><i class="ti ti-check"></i> <span>Conseils & expertise technique</span></div>
              <div class="about-check-item"><i class="ti ti-check"></i> <span>Tarifs compétitifs & garantis</span></div>
              <div class="about-check-item"><i class="ti ti-check"></i> <span>Équipe qualifiée & expérimentée</span></div>
            </div>
            <button class="btn-primary btn-animated" onclick="Router.go('quote')">
              <span>DEMANDER UN DEVIS</span> <i class="ti ti-arrow-right" style="margin-left:6px;"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 3. STATISTICS BAR -->
      <div class="about-stats-wrapper">
        <div class="about-stats-grid">
          <div class="about-stat-box">
            <div class="about-stat-icon"><i class="ti ti-briefcase"></i></div>
            <div>
              <div class="about-stat-num">23+</div>
              <div class="about-stat-label">Années d'expertise</div>
            </div>
          </div>
          <div class="about-stat-box">
            <div class="about-stat-icon"><i class="ti ti-file-text"></i></div>
            <div>
              <div class="about-stat-num">2 500+</div>
              <div class="about-stat-label">Projets & Devis traités</div>
            </div>
          </div>
          <div class="about-stat-box">
            <div class="about-stat-icon"><i class="ti ti-users"></i></div>
            <div>
              <div class="about-stat-num">68+</div>
              <div class="about-stat-label">Experts & Collaborateurs</div>
            </div>
          </div>
          <div class="about-stat-box">
            <div class="about-stat-icon"><i class="ti ti-award"></i></div>
            <div>
              <div class="about-stat-num">99+</div>
              <div class="about-stat-label">Distinctions & Partenariats</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. INFINITE SCROLLING COMPANY GALLERY (GAUCHE VERS DROITE) -->
      <div class="about-gallery-section">
        <div class="about-gallery-header">
          <div class="about-tag">NOS INFRASTRUCTURES & SHOWROOM</div>
          <h2 class="about-title" style="margin-bottom: 8px;">Au cœur de <em>SONECOMX PRO</em></h2>
          <p style="font-size:15px; color:var(--text-muted); max-width:650px; margin:0 auto;">
            Explorez nos espaces de vente spécialisés, nos rayons d'outillage de grandes marques et nos stocks permanents au Cameroun.
          </p>
        </div>

        <div class="about-gallery-marquee-wrap">
          <div class="about-gallery-track">
            <!-- SET 1 (15 Images) -->
            <div class="about-gallery-card">
              <img src="/images/company/facade.jpg" alt="Façade SONECOMX PRO" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Façade & Showroom Principal</div>
                <div class="about-gallery-badge-desc">La Maison des Professionnels — Siège Commercial</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/showroom-outillage.jpg" alt="Rayon Outillage DeWalt & Stanley" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Outillage & Soudure</div>
                <div class="about-gallery-badge-desc">Espaces officiels DeWalt, Stanley & machines de précision</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/compresseurs-industriels.jpg" alt="Compresseurs d'air & Générateurs" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Compresseurs & Matériel Chantier</div>
                <div class="about-gallery-badge-desc">Compresseurs Fiac, Ingco, moteurs industriels & nacelles</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/plomberie-industrielle.jpg" alt="Plomberie Industrielle & Vannes" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Plomberie Industrielle</div>
                <div class="about-gallery-badge-desc">Vannes de sectionnement, raccords fonte & haute pression</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/sanitaire-grohe.jpg" alt="Sanitaire & Carreaux GROHE" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Sanitaire & Carreaux GROHE</div>
                <div class="about-gallery-badge-desc">Cuvettes suspendues, vasques & robinetterie haut standing</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/douche-carrelage-design.jpg" alt="Espace Douche & Carrelage Design" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Espace Douche & Céramique Design</div>
                <div class="about-gallery-badge-desc">Cabines modernes, parois vitrées & faïences marbrées</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/exposition-carrelage.jpg" alt="Exposition Carrelage Grands Formats" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Carreaux Grands Formats & Grès</div>
                <div class="about-gallery-badge-desc">Revêtements muraux, sols intérieurs & extérieurs</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/showroom-electricite.jpg" alt="Électricité & Éclairage Solaire" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Électricité & Éclairage Solaire</div>
                <div class="about-gallery-badge-desc">Projecteurs LED industriels, panneaux & appareillages</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/lustres-luminaires.jpg" alt="Lustres & Luminaires de Luxe" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Lustrerie & Éclairage Décoratif</div>
                <div class="about-gallery-badge-desc">Suspensions de prestige, lustres cristal & solutions Schneider</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/levage-manutention.jpg" alt="Levage et Manutention" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Levage & Manutention</div>
                <div class="about-gallery-badge-desc">Élingues, chaînes, crics hydrauliques & batteries Bosch</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/sanitaire-meubles.jpg" alt="Meubles & Miroirs de Salle de Bain" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Espace Bain & Décoration</div>
                <div class="about-gallery-badge-desc">Mobilier design, vasques à poser & miroirs rétro-éclairés</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/showroom-securite.jpg" alt="Rayon EPI & Sécurité Chantier" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">EPI & Sécurité Chantier</div>
                <div class="about-gallery-badge-desc">Balisage routier, casques, tenues haute visibilité & EPI certifiés</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/robinetterie-eviers.jpg" alt="Mitigeurs & Éviers Q-Sink" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Robinetterie & Éviers Inox</div>
                <div class="about-gallery-badge-desc">Mitigeurs de cuisine design, éviers multifonctions Q-Sink</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/pneu-huile.jpg" alt="Pneus Industriels & Huile Moteur" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Pneus & Lubrifiants Moteur</div>
                <div class="about-gallery-badge-desc">Pneumatiques toutes dimensions, compresseurs & huiles pro</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/showroom-logistique.jpg" alt="Accueil & Conseil Pro" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Accueil & Comptoir Pro</div>
                <div class="about-gallery-badge-desc">Traitement rapide des devis, conseils & logistique de livraison</div>
              </div>
            </div>

            <!-- SET 2 (Duplicate for continuous seamless infinite loop) -->
            <div class="about-gallery-card">
              <img src="/images/company/facade.jpg" alt="Façade SONECOMX PRO" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Façade & Showroom Principal</div>
                <div class="about-gallery-badge-desc">La Maison des Professionnels — Siège Commercial</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/showroom-outillage.jpg" alt="Rayon Outillage DeWalt & Stanley" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Outillage & Soudure</div>
                <div class="about-gallery-badge-desc">Espaces officiels DeWalt, Stanley & machines de précision</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/compresseurs-industriels.jpg" alt="Compresseurs d'air & Générateurs" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Compresseurs & Matériel Chantier</div>
                <div class="about-gallery-badge-desc">Compresseurs Fiac, Ingco, moteurs industriels & nacelles</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/plomberie-industrielle.jpg" alt="Plomberie Industrielle & Vannes" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Plomberie Industrielle</div>
                <div class="about-gallery-badge-desc">Vannes de sectionnement, raccords fonte & haute pression</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/sanitaire-grohe.jpg" alt="Sanitaire & Carreaux GROHE" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Sanitaire & Carreaux GROHE</div>
                <div class="about-gallery-badge-desc">Cuvettes suspendues, vasques & robinetterie haut standing</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/douche-carrelage-design.jpg" alt="Espace Douche & Carrelage Design" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Espace Douche & Céramique Design</div>
                <div class="about-gallery-badge-desc">Cabines modernes, parois vitrées & faïences marbrées</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/exposition-carrelage.jpg" alt="Exposition Carrelage Grands Formats" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Carreaux Grands Formats & Grès</div>
                <div class="about-gallery-badge-desc">Revêtements muraux, sols intérieurs & extérieurs</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/showroom-electricite.jpg" alt="Électricité & Éclairage Solaire" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Électricité & Éclairage Solaire</div>
                <div class="about-gallery-badge-desc">Projecteurs LED industriels, panneaux & appareillages</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/lustres-luminaires.jpg" alt="Lustres & Luminaires de Luxe" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Lustrerie & Éclairage Décoratif</div>
                <div class="about-gallery-badge-desc">Suspensions de prestige, lustres cristal & solutions Schneider</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/levage-manutention.jpg" alt="Levage et Manutention" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Levage & Manutention</div>
                <div class="about-gallery-badge-desc">Élingues, chaînes, crics hydrauliques & batteries Bosch</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/sanitaire-meubles.jpg" alt="Meubles & Miroirs de Salle de Bain" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Espace Bain & Décoration</div>
                <div class="about-gallery-badge-desc">Mobilier design, vasques à poser & miroirs rétro-éclairés</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/showroom-securite.jpg" alt="Rayon EPI & Sécurité Chantier" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">EPI & Sécurité Chantier</div>
                <div class="about-gallery-badge-desc">Balisage routier, casques, tenues haute visibilité & EPI certifiés</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/robinetterie-eviers.jpg" alt="Mitigeurs & Éviers Q-Sink" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Robinetterie & Éviers Inox</div>
                <div class="about-gallery-badge-desc">Mitigeurs de cuisine design, éviers multifonctions Q-Sink</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/pneu-huile.jpg" alt="Pneus Industriels & Huile Moteur" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Pneus & Lubrifiants Moteur</div>
                <div class="about-gallery-badge-desc">Pneumatiques toutes dimensions, compresseurs & huiles pro</div>
              </div>
            </div>

            <div class="about-gallery-card">
              <img src="/images/company/showroom-logistique.jpg" alt="Accueil & Conseil Pro" loading="lazy" />
              <div class="about-gallery-badge">
                <div class="about-gallery-badge-title">Accueil & Comptoir Pro</div>
                <div class="about-gallery-badge-desc">Traitement rapide des devis, conseils & logistique de livraison</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. MISSION & VISION SECTION WITH TABS -->
      <div class="about-section">
        <div class="about-mission-grid">
          <!-- Left: Tabs & Content -->
          <div>
            <div class="about-tag">NOTRE ENGAGEMENT</div>
            <h2 class="about-title">Notre objectif principal : satisfaire nos <em>clients locaux & industriels</em></h2>
            <div class="about-tabs-pills">
              <button class="about-tab-btn active" onclick="Pages.switchAboutTab('mission', this)">NOTRE MISSION</button>
              <button class="about-tab-btn" onclick="Pages.switchAboutTab('vision', this)">NOTRE VISION</button>
              <button class="about-tab-btn" onclick="Pages.switchAboutTab('goals', this)">NOS OBJECTIFS</button>
            </div>

            <!-- Tab Panels -->
            <div id="aboutTabMission" class="about-tab-panel active">
              <h4>La Mission de SONECOMX PRO</h4>
              <p>
                Fournir aux professionnels du bâtiment, aux artisans et aux industries du Cameroun et d'Afrique Centrale le matériel le plus fiable et robuste du marché. Nous garantissons la disponibilité immédiate des références majeures pour supprimer les temps d'arrêt.
              </p>
              <p>
                De l'outillage électroportatif de grande marque à la visserie haute résistance et aux équipements de protection individuelle (EPI), chaque article répond aux normes internationales de qualité et de sécurité.
              </p>
            </div>

            <div id="aboutTabVision" class="about-tab-panel">
              <h4>Notre Vision Stratégique</h4>
              <p>
                Devenir le partenaire de référence absolue pour l'approvisionnement des chantiers et des industries en Afrique, réputé pour son intégrité, sa rapidité de distribution et sa capacité d'innovation.
              </p>
              <p>
                Faciliter l'accès aux meilleures technologies et outillages professionnels grâce à une plateforme moderne et un accompagnement technique de proximité.
              </p>
            </div>

            <div id="aboutTabGoals" class="about-tab-panel">
              <h4>Nos Objectifs & Valeurs Clés</h4>
              <p>
                Garantir une cotation transparente sous 24 heures pour chaque demande de devis, assurer un stock permanent sur les fournitures critiques et bâtir une relation de confiance durable avec chaque partenaire.
              </p>
              <p>
                L'écoute active et l'exigence de conformité sont au cœur de chacun de nos engagements professionnels.
              </p>
            </div>
          </div>

          <!-- Right: Photo -->
          <div>
            <img src="/images/company/chantier-construction.jpg" alt="Chantier de construction BTP SONECOMX PRO" class="about-mission-img" />
          </div>
        </div>
      </div>

      <!-- 6. TESTIMONIALS SECTION -->
      <div class="about-testimonials-wrapper">
        <div class="about-test-header">
          <div class="about-tag">NOS RETOURS D'EXPÉRIENCE</div>
          <h2 class="about-title" style="margin-bottom: 0;">Reconnu par nos <em>clients & partenaires</em></h2>
        </div>

        <div class="about-test-grid-cards">
          <!-- Card 1 -->
          <div class="about-test-item-card">
            <div class="about-test-quote-text">
              "SONECOMX PRO est notre fournisseur privilégié pour les consommables de chantier et l'outillage lourd. La rapidité d'envoi des devis et la ponctualité de livraison nous font gagner un temps précieux sur nos plannings."
            </div>
            <div class="about-test-author-row">
              <div class="about-test-author-info">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" alt="Manaf Hasan" class="about-test-author-avatar" />
                <div>
                  <div class="about-test-author-name">Manaf Hasan</div>
                  <div class="about-test-author-role">Chef de Projet BTP / Bâtiment</div>
                </div>
              </div>
              <div class="about-test-stars-gold">★★★★★</div>
            </div>
          </div>

          <!-- Card 2 -->
          <div class="about-test-item-card">
            <div class="about-test-quote-text">
              "Des équipements de sécurité et de quincaillerie de premier ordre avec toutes les certifications requises. Un service client toujours attentif et disponible pour nous orienter vers le bon matériel."
            </div>
            <div class="about-test-author-row">
              <div class="about-test-author-info">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" alt="Alain Fogue" class="about-test-author-avatar" />
                <div>
                  <div class="about-test-author-name">Alain Fogue</div>
                  <div class="about-test-author-role">Responsable des Achats Industriels</div>
                </div>
              </div>
              <div class="about-test-stars-gold">★★★★★</div>
            </div>
          </div>
        </div>
      </div>

      ${Pages.footer()}`;
    window.scrollTo(0, 0);
  }
};

/* ══════════════════════════════════════════════════════════
   ROUTER
══════════════════════════════════════════════════════════ */
const Router = {
  go(page, params = '') {
    window.location.hash = params ? `#${page}?${params}` : `#${page}`;
  },
  parse() {
    const hash = window.location.hash.slice(1) || 'home';
    const [page, params = ''] = hash.split('?');
    return { page, params };
  },
  async render() {
    const { page, params } = Router.parse();
    window.scrollTo(0, 0);
    App.closeMobileDrawer();
    App.updateMobileNavActive(page);
    if (page === 'home') await Pages.home();
    else if (page === 'catalogue') await Pages.catalogue(params);
    else if (page === 'product') await Pages.product(params);
    else if (page === 'promotions') await Pages.promotions(params);
    else if (page === 'auth') Pages.auth(params || 'login');
    else if (page === 'profile') await Pages.profile(params);
    else if (page === 'quote') Pages.quote();
    else if (page === 'checkout') Pages.checkout();
    else if (page === 'admin') { window.location.href = '/admin.html'; return; }
    else if (page === 'about') Pages.about();
    else await Pages.home();
    Auth.updateUI();
  }
};

/* ══════════════════════════════════════════════════════════
   APP — Main controller
══════════════════════════════════════════════════════════ */
const App = {
  async init() {
    await Auth.fetchMe();
    await App.fetchCategories();
    Cart.updateBadge();
    App.renderNav();
    App.renderMobileTabBar();
    App.renderMobileDrawer();
    App.initLang();
    window.addEventListener('hashchange', Router.render);
    document.addEventListener('click', e => {
      if (!document.getElementById('langSel')?.contains(e.target)) document.getElementById('langDrop')?.classList.remove('open');
      if (!document.getElementById('megaToggle')?.contains(e.target) && !document.getElementById('megaDrop')?.contains(e.target)) App.closeMega();
    });
    Router.render();
  },

  async fetchCategories() {
    try {
      const res = await Http.get('/categories');
      if (res.success && res.data) {
        State.categories = res.data;
      }
    } catch (err) {
      console.error('Erreur chargement categories:', err);
    }
  },

  initPromo3D() {
    setTimeout(() => {
      const container = document.getElementById('promo3dContainer');
      if (!container) return;
      if (typeof THREE === 'undefined') {
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;"><i class="ti ti-3d-cube-sphere" style="font-size:64px;color:#FFCA28;"></i></div>`;
        return;
      }

      container.innerHTML = '';
      const width = container.clientWidth || 300;
      const height = container.clientHeight || 220;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 1.2, 4.2);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffca28, 1.5);
      dirLight1.position.set(5, 8, 5);
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 1.2);
      dirLight2.position.set(-5, -2, -3);
      scene.add(dirLight2);

      const pointLight = new THREE.PointLight(0xffffff, 1.0, 10);
      pointLight.position.set(0, 2, 3);
      scene.add(pointLight);

      const productGroup = new THREE.Group();

      const bodyGeo = new THREE.BoxGeometry(1.6, 1.0, 1.0);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.2 });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      productGroup.add(bodyMesh);

      const stripeGeo = new THREE.BoxGeometry(1.64, 0.22, 1.04);
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffca28, metalness: 0.5, roughness: 0.3 });
      const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
      stripeMesh.position.y = 0.1;
      productGroup.add(stripeMesh);

      const handleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 16);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
      const handleMesh = new THREE.Mesh(handleGeo, handleMat);
      handleMesh.rotation.z = Math.PI / 2;
      handleMesh.position.set(0, 0.65, 0);
      productGroup.add(handleMesh);

      const mountGeo = new THREE.BoxGeometry(0.15, 0.25, 0.15);
      const mount1 = new THREE.Mesh(mountGeo, handleMat);
      mount1.position.set(-0.45, 0.55, 0);
      const mount2 = new THREE.Mesh(mountGeo, handleMat);
      mount2.position.set(0.45, 0.55, 0);
      productGroup.add(mount1);
      productGroup.add(mount2);

      const latchGeo = new THREE.BoxGeometry(0.2, 0.3, 0.08);
      const latchMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
      const latch1 = new THREE.Mesh(latchGeo, latchMat);
      latch1.position.set(-0.4, 0, 0.52);
      const latch2 = new THREE.Mesh(latchGeo, latchMat);
      latch2.position.set(0.4, 0, 0.52);
      productGroup.add(latch1);
      productGroup.add(latch2);

      const ledGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.set(0, 0.25, 0.53);
      productGroup.add(ledMesh);

      const gearGroup = new THREE.Group();
      const ringGeo = new THREE.TorusGeometry(1.3, 0.04, 16, 60);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.7 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 3;
      gearGroup.add(ringMesh);
      scene.add(gearGroup);

      const particleGeo = new THREE.BufferGeometry();
      const particleCount = 45;
      const posArray = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 6;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particleMat = new THREE.PointsMaterial({ size: 0.05, color: 0xffca28, transparent: true, opacity: 0.8 });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      scene.add(productGroup);

      let mouseX = 0;
      let mouseY = 0;
      const promoCard = document.getElementById('promo3dCard');
      if (promoCard) {
        promoCard.addEventListener('mousemove', (e) => {
          const rect = promoCard.getBoundingClientRect();
          mouseX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
          mouseY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        });
        promoCard.addEventListener('mouseleave', () => {
          mouseX = 0;
          mouseY = 0;
        });
      }

      let clock = new THREE.Clock();
      const animate = () => {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        productGroup.rotation.y = elapsedTime * 0.6 + mouseX * 0.5;
        productGroup.rotation.x = Math.sin(elapsedTime * 0.8) * 0.15 + mouseY * 0.3;
        productGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.08;

        gearGroup.rotation.z = -elapsedTime * 0.4;
        gearGroup.rotation.y = elapsedTime * 0.2;
        particles.rotation.y = elapsedTime * 0.1;

        renderer.render(scene, camera);
      };
      animate();
    }, 100);
  },

  renderNav() {
    const navHtml = `
      <nav class="navbar">
        <div class="logo" onclick="Router.go('home')">
          <img src="/images/logo.png?v=2" alt="SONECOMX PRO SARL" style="max-height: 45px; object-fit: contain;">
        </div>
        <div class="nav-search">
          <i class="ti ti-search" style="color:var(--blue);font-size:15px;"></i>
          <input type="text" id="searchInput" placeholder="${t('search')}" onkeydown="if(event.key==='Enter') App.doSearch()">
          <button onclick="App.doSearch()"><i class="ti ti-search"></i></button>
        </div>
        <div class="lang-selector" id="langSel">
          <div class="lang-btn" onclick="App.toggleLangDrop()">
            <span id="activeFlag">🇫🇷</span>
            <span id="activeLangCode">FR</span>
            <i class="ti ti-chevron-down" style="font-size:12px;" id="langChev"></i>
          </div>
          <div class="lang-dropdown" id="langDrop">
            ${LANGS.map(l => `<div class="lang-item ${l.code === State.lang ? 'active' : ''}" onclick="App.setLang('${l.code}')">
              <span style="font-size:16px;">${l.flag}</span>
              <span style="flex:1;">${l.name}</span>
              <span style="font-size:10px;color:var(--text-muted);">${l.code}</span>
            </div>`).join('')}
          </div>
        </div>
        <div class="nav-actions">
          <button class="nav-btn auth-show-logged" style="display:none" onclick="Router.go('profile')"><i class="ti ti-user"></i></button>
          <button class="nav-btn auth-show-guest" onclick="Router.go('auth')"><i class="ti ti-user"></i></button>
          <button class="nav-btn" onclick="Router.go('profile','tab=wishlist')"><i class="ti ti-heart"></i></button>
          <button class="nav-btn" onclick="Cart.open()">
            <i class="ti ti-shopping-cart"></i>
            <span class="badge cart-count" style="display:none">0</span>
          </button>
        </div>
      </nav>
      <div class="megabar">
        <button class="mega-toggle" id="megaToggle" onclick="App.toggleMega()">
          <i class="ti ti-menu-2"></i>
          <span id="allDeptsLabel">${t('allDepts')}</span>
          <i class="ti ti-chevron-down" id="megaChev" style="font-size:12px;"></i>
        </button>
        <div class="mega-links">
          ${[['deptBoulonnerie', 'ti-bolt', 'Boulonnerie & Sécurité'], ['deptChantier', 'ti-crane', 'Matériel de chantier'], ['deptElectricite', 'ti-plug', 'Électricité & Solaire'], ['deptPlomberie', 'ti-droplet', 'Plomberie'], ['deptPeinture', 'ti-paint', 'Peinture & Étanchéité'], ['deptEPI', 'ti-shield-check', 'EPI & Signalisation'], ['deptIndustriel', 'ti-settings', 'Équipement industriel'], ['deptAgricole', 'ti-plant', 'Matériel agricole']].map(([key, icon, fullName]) =>
      `<span class="mega-link" onclick="Router.go('catalogue','cat=${encodeURIComponent(fullName)}')"><i class="ti ${icon}"></i>${t(key)}</span>`).join('')}
        </div>
        <div class="mega-right">
          <span class="btn-animated" style="background:var(--blue-dark); color:#fff; padding:4px 10px; border-radius:4px;" onclick="Router.go('about')"><i class="ti ti-info-circle"></i> ${t('aboutUs')}</span>
          <span onclick="Router.go('promotions')"><i class="ti ti-tag"></i> ${t('promotions')}</span>
          <span onclick="Router.go('quote')"><i class="ti ti-file-invoice"></i> ${t('proQuote')}</span>
          <span><i class="ti ti-truck"></i> ${t('delivery')}</span>
        </div>
        <div class="megadrop" id="megaDrop">
          <div class="megadrop-title"><i class="ti ti-layout-grid"></i> ${t('allDeptsTitle')} — ${(State.categories.length ? State.categories : CATEGORIES).length} ${t('categoriesLabel')}</div>
          <div class="megadrop-grid">
            ${(State.categories.length ? State.categories : CATEGORIES).map(c => `
              <div class="megadrop-item" onclick="Router.go('catalogue','cat=${encodeURIComponent(c.name)}');App.closeMega()">
                <div style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0;">
                  ${catIcon(c.icon, c.icon && (c.icon.includes('.') || c.icon.includes('/')) ? '28px' : '18px')}
                </div>
                <div><div class="megadrop-item-name">${c.name}</div><div class="megadrop-item-count">${typeof c.productCount !== 'undefined' ? c.productCount : c.count} réf.</div></div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
    document.getElementById('nav').innerHTML = navHtml;

    /* Cart sidebar */
    document.getElementById('cartSidebar').innerHTML = `
      <div class="cart-header">
        <div class="cart-title"><i class="ti ti-clipboard-list" style="color:var(--blue);"></i> <span id="cartTitleLabel">${t('cart')}</span></div>
        <button class="cart-close" onclick="Cart.close()"><i class="ti ti-x"></i></button>
      </div>
      <div class="cart-items" id="cartItems"><div class="cart-empty"><i class="ti ti-file-search"></i><p>${t('cartEmpty')}</p></div></div>
      <div class="cart-footer">
        <div class="cart-summary-row"><span>${t('subtotal')}</span><span id="cartSubtotal">0 F</span></div>
        <div class="cart-summary-row"><span>${t('delivery')}</span><span id="cartShipping">—</span></div>
        <div class="cart-summary-row"><span>${t('vat')}</span><span id="cartTax">0 F</span></div>
        <div class="cart-summary-row total"><span>Estimation indicative</span><span id="cartTotal">0 F</span></div>
        <button class="btn-primary" style="width:100%;justify-content:center;margin-top:12px;padding:12px;" onclick="Router.go('checkout')">
          <i class="ti ti-send"></i> ${t('checkoutBtn')}
        </button>
      </div>`;

    Cart.updateBadge();
  },

  renderMobileTabBar() {
    const tabEl = document.getElementById('mobileTabBar');
    if (!tabEl) return;
    const total = State.cart.reduce((s, i) => s + i.qty, 0);
    const { page } = Router.parse();
    tabEl.innerHTML = `
      <button class="mobile-tab-btn ${page === 'home' || !page ? 'active' : ''}" onclick="Router.go('home')" data-tab="home">
        <i class="ti ti-home"></i>
        <span>${t('home')}</span>
      </button>
      <button class="mobile-tab-btn ${page === 'catalogue' ? 'active' : ''}" onclick="Router.go('catalogue')" data-tab="catalogue">
        <i class="ti ti-layout-grid"></i>
        <span>${t('catalogueTitle')}</span>
      </button>
      <button class="mobile-tab-btn" onclick="App.toggleMobileDrawer()" data-tab="drawer" id="mobileDrawerTabBtn">
        <div class="mobile-tab-highlight-icon"><i class="ti ti-category"></i></div>
        <span>Rayons</span>
      </button>
      <button class="mobile-tab-btn ${page === 'quote' ? 'active' : ''}" onclick="Router.go('quote')" data-tab="quote">
        <i class="ti ti-file-invoice"></i>
        <span>${t('proQuote')}</span>
      </button>
      <button class="mobile-tab-btn ${page === 'checkout' ? 'active' : ''}" onclick="Cart.open()" data-tab="cart">
        <div style="position:relative;display:inline-flex;">
          <i class="ti ti-clipboard-list"></i>
          <span class="mobile-cart-badge" id="mobileCartBadge" style="${total ? '' : 'display:none;'}">${total}</span>
        </div>
        <span>Sélection</span>
      </button>
    `;
  },

  renderMobileDrawer() {
    const drawerEl = document.getElementById('mobileDrawer');
    if (!drawerEl) return;
    const cats = State.categories.length ? State.categories : CATEGORIES;
    drawerEl.innerHTML = `
      <div class="mobile-drawer-header">
        <div class="mobile-drawer-brand">
          <img src="/images/logo.png?v=2" alt="SONECOMX PRO" style="max-height:36px;object-fit:contain;">
        </div>
        <button class="mobile-drawer-close" onclick="App.closeMobileDrawer()"><i class="ti ti-x"></i></button>
      </div>
      <div class="mobile-drawer-search">
        <i class="ti ti-search"></i>
        <input type="text" placeholder="${t('search')}" onkeydown="if(event.key==='Enter'){App.doMobileSearch(this.value);App.closeMobileDrawer();}">
      </div>
      <div class="mobile-drawer-section-title">
        <i class="ti ti-layout-grid"></i> ${t('allDeptsTitle')}
      </div>
      <div class="mobile-drawer-cats">
        ${cats.map(c => `
          <div class="mobile-drawer-cat-item" onclick="Router.go('catalogue','cat=${encodeURIComponent(c.name)}');App.closeMobileDrawer();">
            <div class="mobile-drawer-cat-icon">${catIcon(c.icon, '24px')}</div>
            <div class="mobile-drawer-cat-info">
              <div class="mobile-drawer-cat-name">${c.name}</div>
              <div class="mobile-drawer-cat-count">${typeof c.productCount !== 'undefined' ? c.productCount : c.count} références</div>
            </div>
            <i class="ti ti-chevron-right" style="color:var(--text-light);font-size:14px;"></i>
          </div>
        `).join('')}
      </div>
      <div class="mobile-drawer-footer">
        <div class="mobile-drawer-links">
          <a onclick="Router.go('promotions');App.closeMobileDrawer();"><i class="ti ti-tag"></i> ${t('promotions')}</a>
          <a onclick="Router.go('quote');App.closeMobileDrawer();"><i class="ti ti-file-invoice"></i> ${t('proQuote')}</a>
          <a onclick="Router.go('about');App.closeMobileDrawer();"><i class="ti ti-info-circle"></i> ${t('aboutUs')}</a>
        </div>
        <div class="mobile-drawer-contact">
          <a href="tel:+237699000000" class="mobile-contact-btn"><i class="ti ti-phone"></i> Appeler SONECOMX</a>
          <a href="https://wa.me/237699000000" target="_blank" class="mobile-contact-btn whatsapp"><i class="ti ti-brand-whatsapp"></i> WhatsApp Direct</a>
        </div>
      </div>
    `;
  },

  toggleMobileDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('mobileDrawerOverlay');
    if (drawer && overlay) {
      const isOpen = drawer.classList.toggle('open');
      overlay.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }
  },

  openMobileDrawer() {
    document.getElementById('mobileDrawer')?.classList.add('open');
    document.getElementById('mobileDrawerOverlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeMobileDrawer() {
    document.getElementById('mobileDrawer')?.classList.remove('open');
    document.getElementById('mobileDrawerOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  },

  doMobileSearch(val) {
    if (val && val.trim()) Router.go('catalogue', `search=${encodeURIComponent(val.trim())}`);
  },

  updateMobileNavActive(page) {
    document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      if (tab === 'drawer') return;
      btn.classList.toggle('active', tab === page || (!page && tab === 'home'));
    });
  },

  initLang() {
    const l = LANGS.find(x => x.code === State.lang) || LANGS[0];
    const f = document.getElementById('activeFlag');
    const c = document.getElementById('activeLangCode');
    if (f) f.textContent = l.flag;
    if (c) c.textContent = l.code;
    const tl = document.getElementById('logoTagline');
    if (tl) tl.textContent = t('tagline');
    const si = document.getElementById('searchInput');
    if (si) si.placeholder = t('search');
    const al = document.getElementById('allDeptsLabel');
    if (al) al.textContent = t('allDepts');
    document.querySelectorAll('.lang-item').forEach(el => {
      const code = el.querySelector('span:last-child')?.textContent;
      el.classList.toggle('active', code === State.lang);
    });
    document.documentElement.dir = State.lang === 'AR' ? 'rtl' : 'ltr';
  },

  setLang(code) {
    State.lang = code;
    localStorage.setItem('snx_lang', code);
    document.getElementById('langDrop')?.classList.remove('open');
    App.renderNav();
    App.initLang();
    Router.render();
  },

  toggleLangDrop() {
    const d = document.getElementById('langDrop');
    const c = document.getElementById('langChev');
    const open = d.classList.toggle('open');
    if (c) c.style.transform = open ? 'rotate(180deg)' : '';
  },

  toggleMega() {
    const d = document.getElementById('megaDrop');
    const c = document.getElementById('megaChev');
    const open = d.classList.toggle('open');
    if (c) c.style.transform = open ? 'rotate(180deg)' : '';
  },

  closeMega() {
    document.getElementById('megaDrop')?.classList.remove('open');
    const c = document.getElementById('megaChev');
    if (c) c.style.transform = '';
  },

  doSearch() {
    const val = document.getElementById('searchInput')?.value?.trim();
    if (val) Router.go('catalogue', `search=${encodeURIComponent(val)}`);
  },

  filterCat(el, cat) {
    document.querySelectorAll('.filter-chip').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    Router.go('catalogue', cat ? `cat=${cat}` : '');
  },

  filterSort(sort) {
    const current = new URLSearchParams(Router.parse().params);
    if (sort) current.set('sort', sort); else current.delete('sort');
    Router.go('catalogue', current.toString());
  },

  filterPromoCat(el, cat) {
    document.querySelectorAll('.fam-cat-circle-card').forEach(e => e.classList.remove('active'));
    if (el) el.classList.add('active');
    Router.go('promotions', cat ? `cat=${cat}` : '');
  },

  filterPromoSort(sort) {
    const current = new URLSearchParams(Router.parse().params);
    if (sort) current.set('sort', sort); else current.delete('sort');
    Router.go('promotions', current.toString());
  },

  scrollPromoToProducts() {
    const el = document.getElementById('promotionsGridContainer');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  scrollPromoCat(direction) {
    const grid = document.getElementById('famCatCircles');
    if (grid) {
      grid.scrollBy({ left: direction * 220, behavior: 'smooth' });
    }
  },

  famNewsletter() {
    const email = document.getElementById('famNlEmail')?.value?.trim();
    if (!email || !email.includes('@')) {
      Toast.show('Veuillez entrer une adresse e-mail valide', 'warning');
      return;
    }
    Toast.show('Merci pour votre inscription à la newsletter SONECOMX PRO ! 🎉', 'success');
    const input = document.getElementById('famNlEmail');
    if (input) input.value = '';
  },

  async login() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!email || !password) { Toast.show('Remplissez tous les champs', 'warning'); return; }
    const result = await Auth.login(email, password);
    if (result === true) {
      Toast.show('Connexion administrateur réussie ! 👋 Redirection...', 'success');
      setTimeout(() => {
        window.location.href = '/admin.html';
      }, 400);
    }
    else Toast.show(result, 'error');
  },

  async updateProfile() {
    const data = {
      firstName: document.getElementById('editFirst')?.value,
      lastName: document.getElementById('editLast')?.value,
      phone: document.getElementById('editPhone')?.value,
      company: document.getElementById('editCompany')?.value,
    };
    const res = await Http.put('/auth/profile', data);
    if (res.success) { State.user = { ...State.user, ...data }; Toast.show('Profil mis à jour', 'success'); }
    else Toast.show(res.message, 'error');
  },

  async changePassword() {
    const cur = document.getElementById('curPwd')?.value;
    const nw = document.getElementById('newPwd')?.value;
    const cf = document.getElementById('confPwd')?.value;
    if (!cur || !nw || !cf) { Toast.show('Remplissez tous les champs', 'warning'); return; }
    if (nw !== cf) { Toast.show('Les mots de passe ne correspondent pas', 'error'); return; }
    const res = await Http.put('/auth/password', { currentPassword: cur, newPassword: nw });
    if (res.success) Toast.show('Mot de passe modifié', 'success');
    else Toast.show(res.message, 'error');
  },

  async toggleWishlist(productId, btn) {
    const isIn = State.wishlist.includes(productId);
    if (isIn) {
      State.wishlist = State.wishlist.filter(id => id !== productId);
    } else {
      State.wishlist.push(productId);
    }
    localStorage.setItem('snx_wishlist', JSON.stringify(State.wishlist));
    if (btn) { btn.classList.toggle('active', !isIn); btn.innerHTML = `<i class="ti ${!isIn ? 'ti-heart-filled' : 'ti-heart'}"></i>`; }
    Toast.show(!isIn ? 'Ajouté aux favoris' : 'Retiré des favoris', !isIn ? 'success' : 'info');
  },

  changeQty(delta) {
    const input = document.getElementById('qtyInput');
    if (!input) return;
    const maxVal = parseInt(input.getAttribute('max')) || 999;
    const val = Math.min(maxVal, Math.max(1, parseInt(input.value) + delta));
    input.value = val;
  },

  changeProductTab(btn, tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.style.color = 'var(--text-muted)';
      b.style.borderBottomColor = 'transparent';
    });
    btn.classList.add('active');
    btn.style.color = 'var(--red)';
    btn.style.borderBottomColor = 'var(--red)';
    
    document.querySelectorAll('.tab-content').forEach(c => {
      c.style.display = 'none';
    });
    const activeContent = document.getElementById('tab-' + tabId);
    if (activeContent) activeContent.style.display = 'block';
  },

  setProductImage(imgUrl, el) {
    const mainImg = document.getElementById('mainProductImage');
    if (mainImg) mainImg.src = imgUrl;
    document.querySelectorAll('.gallery-thumb').forEach(t => {
      t.classList.remove('active');
      t.style.borderColor = 'var(--border)';
    });
    el.classList.add('active');
    el.style.borderColor = 'var(--blue)';
  },

  selectPayment(el, value) {
    document.querySelectorAll('.payment-option').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('selectedPayment').value = value;
  },

  async placeOrder() {
    const items = State.cart.map(i => ({ product: i._id, quantity: i.qty }));
    const shippingAddress = {
      fullName: document.getElementById('shFullName')?.value?.trim() || '',
      phone: document.getElementById('shPhone')?.value?.trim() || '',
      street: document.getElementById('shStreet')?.value?.trim() || '',
      city: document.getElementById('shCity')?.value || 'Yaoundé',
      region: document.getElementById('shRegion')?.value?.trim() || '',
    };
    const paymentMethod = 'cod';
    const notes = document.getElementById('orderNotes')?.value?.trim() || '';
    if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.street) {
      Toast.show('Veuillez remplir vos coordonnées et l\'adresse', 'warning'); return;
    }
    const res = await Http.post('/orders', { items, shippingAddress, paymentMethod, notes });
    if (res.success) {
      State.cart = []; Cart.save();
      Toast.show(`Votre demande de devis N° ${res.data.orderNumber} a été transmise avec succès ! 📋 Notre équipe vous répondra sous 24h.`, 'success', 6000);
      Router.go('home');
    } else Toast.show(res.message || 'Erreur lors de la transmission de la demande', 'error');
  },

  quoteItemCount: 1,
  addQuoteItem() {
    const i = App.quoteItemCount++;
    const list = document.getElementById('quoteItemsList');
    const row = document.createElement('div');
    row.className = 'form-row';
    row.style.marginBottom = '8px';
    row.innerHTML = `<input class="form-input" placeholder="Description article" id="qi_desc_${i}"><input class="form-input" type="number" placeholder="Qté" id="qi_qty_${i}" min="1" value="1" style="max-width:80px">`;
    list.appendChild(row);
  },

  async submitQuote() {
    const contactName = document.getElementById('qName')?.value?.trim() || (State.user ? `${State.user.firstName} ${State.user.lastName}` : '');
    const contactEmail = document.getElementById('qEmail')?.value?.trim() || State.user?.email || '';
    const contactPhone = document.getElementById('qPhone')?.value?.trim() || State.user?.phone || '';
    const company = document.getElementById('qCompany')?.value?.trim() || State.user?.company || '';
    const message = document.getElementById('qMessage')?.value?.trim();

    if (!contactName || !contactEmail || !contactPhone) {
      Toast.show('Veuillez renseigner votre nom, votre e-mail et votre téléphone', 'warning');
      return;
    }
    if (!message) { Toast.show('Décrivez vos besoins', 'warning'); return; }

    const items = [];
    for (let i = 0; i < App.quoteItemCount; i++) {
      const desc = document.getElementById(`qi_desc_${i}`)?.value;
      const qty = parseInt(document.getElementById(`qi_qty_${i}`)?.value) || 1;
      if (desc) items.push({ description: desc, quantity: qty });
    }
    const res = await Http.post('/quotes', {
      contactName,
      contactEmail,
      contactPhone,
      company,
      message,
      items
    });
    if (res.success) {
      Toast.show(`Demande de devis N° ${res.data.quoteNumber} envoyée ! Notre équipe vous répondra sous 24h. 📋`, 'success', 6000);
      Router.go('home');
    } else Toast.show(res.message || 'Erreur lors de l\'envoi du devis', 'error');
  },

  newsletter() {
    const email = document.getElementById('nlEmail')?.value;
    if (!email || !email.includes('@')) { Toast.show('Email invalide', 'warning'); return; }
    Toast.show('Inscription réussie ! Bienvenue dans la communauté SONECOMX PRO 🎉', 'success');
    const input = document.getElementById('nlEmail');
    if (input) input.value = '';
  },

  openAuthModal() { Router.go('auth'); }
};

/* ── Boot ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', App.init);
