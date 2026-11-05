# 🛡️ Politique & Protocoles de Sécurité — SONECOMX PRO

> **Dernière révision :** Novembre 2026  
> **Classification :** Confidentiel Entreprise / DevSecOps  
> **Application :** Plateforme Web, API REST, Base de Données, Services Cloud

Bienvenue dans la politique de sécurité officielle de **SONECOMX PRO**.  
Ce document détaille l'ensemble des protocoles de sécurité mis en œuvre pour garantir la confidentialité, l'intégrité, la disponibilité et la conformité des données de la plateforme.

---

## 📋 Table des Protocoles

| Réf. | Protocole | Domaine | Statut |
| :--- | :--- | :--- | :--- |
| **SEC-01** | [Protocole d'Authentification & Mots de Passe](#sec-01--authentification--gestion-des-identifiants) | IAM / Session | **Actif** |
| **SEC-02** | [Protocole de Contrôle d'Accès Basé sur les Rôles (RBAC)](#sec-02--contrôle-daccès-rbac--autorisations) | Autorisations | **Actif** |
| **SEC-03** | [Protocole En-têtes HTTP, Réseau & CSP](#sec-03--en-têtes-http-réseau--csp-helmet) | Réseau & Client | **Actif** |
| **SEC-04** | [Protocole Anti-Bruteforce & Limitation de Débit](#sec-04--anti-bruteforce--limitation-de-débit-rate-limiting) | Anti-Abus / DDoS | **Actif** |
| **SEC-05** | [Protocole d'Assainissement & Anti-Injection](#sec-05--assainissement-des-données--anti-injection) | Données & API | **Actif** |
| **SEC-06** | [Protocole de Sécurité des Fichiers & Téléversements](#sec-06--sécurité-des-fichiers--téléversements) | Médias & Stockage | **Actif** |
| **SEC-07** | [Protocole de Gestion des Secrets & Variables d'Environnement](#sec-07--gestion-des-secrets--chiffrement) | Infrastructure | **Actif** |
| **SEC-08** | [Protocole de Réponse à Incident & Journalisation (PSSI)](#sec-08--réponse-aux-incidents--audit-pssi) | Exploitation / Audit | **Actif** |

---

## SEC-01 : Authentification & Gestion des Identifiants

1. **Hachage cryptographique des mots de passe :**
   - Utilisation de **Bcrypt** avec un facteur de coût (salt rounds) fixé à **12**.
   - Le mot de passe en clair n'est jamais stocké ni transmis dans les réponses d'API (`select: false` dans Mongoose).
2. **Politique de complexité :**
   - Longueur minimale de **8 caractères**.
   - Au minimum **1 lettre majuscule** et **1 chiffre**.
3. **Jetons de session (JWT) :**
   - Signature asymétrique/HMAC-SHA256 via une clé privée `JWT_SECRET` robuste.
   - Durée de vie définie par `JWT_EXPIRE` (par défaut 30 jours pour l'administration).
   - Transmission via en-tête `Authorization: Bearer <token>` et via Cookie sécurisé.
4. **Sécurisation des Cookies :**
   - `httpOnly: true` (inaccessible au JavaScript, immunité contre le vol par faille XSS).
   - `secure: true` en production (exclusivement transmis sur canal HTTPS chiffré).
   - `sameSite: 'strict'` (ou `'lax'`), immunité contre les attaques CSRF (Cross-Site Request Forgery).

---

## SEC-02 : Contrôle d'Accès (RBAC) & Autorisations

1. **Modèle de privilèges :**
   - `user` : Consultation catalogue, panier, historique de ses propres commandes/devis.
   - `pro` : Avantages tarifaires professionnels (B2B).
   - `admin` : Gestion complète du catalogue, gestion des utilisateurs, validation des devis, suivi des commandes, tableau de bord.
2. **Cloisonnement horizontal (Anti-IDOR) :**
   - Un utilisateur ne peut consulter ou manipuler que ses propres devis (`q.user === req.user.id`).
   - Seul l'administrateur dispose du droit d'accès transverse (`req.user.role === 'admin'`).
3. **Blocage des comptes suspendus :**
   - À chaque requête protégée, le statut `isActive` est vérifié en temps réel. Un compte révoqué est instantanément invalidé sans attendre l'expiration du jeton.

---

## SEC-03 : En-têtes HTTP, Réseau & CSP (Helmet)

1. **Masquage d'empreinte logicielle :**
   - `app.disable('x-powered-by')` et `helmet.hidePoweredBy()` actifs pour dissimuler l'utilisation d'Express/Node.js.
2. **Protection Anti-Clickjacking :**
   - `X-Frame-Options: DENY` (interdiction d'encapsuler la plateforme dans des iframes externes).
3. **MIME Sniffing Prevention :**
   - `X-Content-Type-Options: nosniff` (le navigateur exécute uniquement le type déclaré).
4. **HSTS (HTTP Strict Transport Security) :**
   - Forçage automatique de HTTPS en production (`max-age: 31536000; includeSubDomains; preload`).
5. **Content Security Policy (CSP) durcie :**
   - Restrictions sur l'origine des scripts, feuilles de styles, polices et images pour neutraliser toute injection de script malveillant.
6. **Politique CORS stricte :**
   - Validation dynamique de l'origine (`CLIENT_URL`).
   - Refus strict des requêtes non autorisées en production avec `credentials: true`.

---

## SEC-04 : Anti-Bruteforce & Limitation de Débit (Rate Limiting)

1. **Limiteur Global (`apiLimiter`) :**
   - Plafond de **300 requêtes / 15 minutes** par adresse IP sur l'ensemble de `/api/`.
2. **Limiteur d'Authentification (`authLimiter`) :**
   - Plafond strict de **5 tentatives échouées / 15 minutes** sur `/api/auth/login`.
   - Les tentatives réussies ne décrémentent pas le quota (`skipSuccessfulRequests: true`).
   - En cas de dépassement : code HTTP `429 Too Many Requests` avec en-têtes RFC `RateLimit-Reset` et `Retry-After`.
3. **Limiteur Anti-Spam (`submissionLimiter`) :**
   - Plafond de **20 créations de devis / commandes / 15 minutes** par IP pour prévenir le saturation automatisée de la base de données.

---

## SEC-05 : Assainissement des Données & Anti-Injection

1. **Protection Anti-Injection NoSQL :**
   - `express-mongo-sanitize` remplace automatiquement les opérateurs réservés (`$`, `.`) présents dans `req.body`, `req.query` ou `req.params`.
2. **Protection Anti-XSS :**
   - `xss-clean` stérilise les balises HTML et scripts suspects sur toutes les routes publiques, tout en préservant le traitement des images base64 sur les routes dédiées.
3. **Protection contre la Pollution de Paramètres (HPP) :**
   - `hpp` bloque les attaques exploitant des paramètres de requête dupliqués (ex: `?role=user&role=admin`).
4. **Validation et Typage Stricts des Entrées :**
   - Modules `express-validator` sur `/login`, `/quotes`, `/orders` et validation stricte des formats `ObjectId` MongoDB.

---

## SEC-06 : Sécurité des Fichiers & Téléversements

1. **Stockage volatile en mémoire vive :**
   - Utilisation de `multer.memoryStorage()`. Les fichiers ne transitent pas par le disque serveur sous forme de fichiers temporaires exécutables.
2. **Validation des types MIME :**
   - Seuls les types MIME d'images vérifiés (`image/jpeg`, `image/png`, `image/webp`, `image/avif`) sont acceptés.
3. **Plafond de taille des requêtes :**
   - Taille maximale fixée à **10 Mo** par fichier et par payload JSON.
4. **Déportation sur CDN Cloud (Cloudinary) :**
   - Les médias sont téléversés via flux sécurisé chiffré TLS vers Cloudinary et servis via HTTPS avec nom de fichier généré aléatoirement (impossibilité de deviner ou forcer les chemins d'accès).

---

## SEC-07 : Gestion des Secrets & Chiffrement

1. **Zéro Credentials dans le Code Source :**
   - Aucune clé d'API, mot de passe de base de données ou secret JWT ne doit être consigné dans le code Git.
   - Les secrets sont injectés exclusivement via les variables d'environnement (`.env` ou panneau de déploiement Render/Vercel).
2. **Fichiers ignorés par Git :**
   - Le fichier `.env` est exclu du contrôle de version dans `.gitignore`.
   - Seul `.env.example` (dénué de valeurs sensibles) est partagé comme gabarit.
3. **Rotation des secrets :**
   - Procédure de renouvellement semestrielle pour `JWT_SECRET`, identifiants MongoDB Atlas et API Keys Cloudinary.

---

## SEC-08 : Réponse aux Incidents & Audit (PSSI)

En cas de détection d'activité suspecte ou de violation de sécurité :

```
[1. DÉTECTION] ──> [2. CONFINEMENT] ──> [3. ANALYSE] ──> [4. ÉRADICATION] ──> [5. RÉTABLISSEMENT]
```

1. **Détection :** Alertes de dépassement de débit, erreurs de signature JWT répétées, logs Morgan d'adresses IP suspectes.
2. **Confinement :**
   - Blocage temporaire de l'IP au niveau pare-feu / reverse proxy.
   - Révocation immédiate de la session compromise en basculant `isActive: false` sur le compte concerné.
3. **Analyse :** Examen des journaux d'accès HTTP et d'erreurs serveur pour identifier le vecteur d'attaque.
4. **Éradication :** Application des correctifs de sécurité et rotation immédiate des secrets compromis (`JWT_SECRET`, mots de passe administrateurs).
5. **Rétablissement & Audit :** Redémarrage des services, vérification de l'intégrité de la base MongoDB Atlas, notification des parties prenantes le cas échéant.

---

## 📞 Signalement de Vulnérabilités

Pour toute déclaration de vulnérabilité ou question de sécurité :
- **Contact Sécurité :** `securite@sonecomxpro.cm`
- **Politique de divulgation responsable :** Merci de nous accorder un délai de 48 heures pour investiguer et corriger tout signalement avant toute divulgation publique.

