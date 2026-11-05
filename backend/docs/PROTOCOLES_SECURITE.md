# 📘 MANUEL TECHNIQUE DES PROTOCOLES DE SÉCURITÉ SONECOMX PRO

Ce document constitue la référence d'ingénierie logicielle pour l'implémentation et la maintenance des protocoles de sécurité dans le backend Node.js / Express / MongoDB de SONECOMX PRO.

---

## Architecture des Protocoles

L'architecture de sécurité est articulée en 4 couches concentriques :

```
                          [ UTILISATEURS / INTERNET ]
                                      │
               ┌──────────────────────▼──────────────────────┐
               │    COUCHE 1 : RÉSEAU & EN-TÊTES HTTP        │
               │  - Helmet (CSP, HSTS, No-Sniff, Frameguard) │
               │  - CORS Strict (Origines autorisées)        │
               │  - Masquage empreinte Express               │
               └──────────────────────┬──────────────────────┘
                                      │
               ┌──────────────────────▼──────────────────────┐
               │    COUCHE 2 : ANTI-DDoS & RATE LIMITING      │
               │  - apiLimiter (300 req / 15 min)            │
               │  - authLimiter (5 échecs / 15 min)          │
               │  - submissionLimiter (20 forms / 15 min)    │
               └──────────────────────┬──────────────────────┘
                                      │
               ┌──────────────────────▼──────────────────────┐
               │    COUCHE 3 : ASSAINISSEMENT & VALIDATION   │
               │  - NoSQL Sanitize (Anti-$ / .)              │
               │  - XSS Clean (Filtre injection HTML/JS)     │
               │  - HPP (Protection pollution de paramètres) │
               │  - Express-Validator (Schémas typés)        │
               └──────────────────────┬──────────────────────┘
                                      │
               ┌──────────────────────▼──────────────────────┐
               │    COUCHE 4 : CONTRÔLE D'ACCÈS & SESSIONS   │
               │  - Middleware protect (Vérification JWT)    │
               │  - Middleware authorize (Vérification RBAC) │
               │  - Cookies HttpOnly / Secure / SameSite     │
               │  - Hachage Bcrypt factor 12                 │
               └─────────────────────────────────────────────┘
```

---

## 1. Fichiers et Composants Clés

| Fichier | Rôle dans le protocole de sécurité |
| :--- | :--- |
| `backend/middleware/security.js` | Centralise les limiteurs de débit, la configuration Helmet, les options CORS, la sanitization NoSQL/XSS/HPP et le gestionnaire d'erreurs sécurisé. |
| `backend/middleware/validators.js` | Définit les schémas de validation stricts des entrées (`login`, `updatePassword`, `quote`, `order`, `objectId`). |
| `backend/middleware/auth.js` | Gère la vérification des tokens JWT, le contrôle d'accès par rôle (RBAC) et l'authentification optionnelle. |
| `backend/server.js` | Point d'entrée appliquant les protocoles dans l'ordre de priorité recommandé. |
| `SECURITY.md` | Référentiel de gouvernance et politique de divulgation des vulnérabilités. |

---

## 2. Guide d'Utilisation des Middlewares

### 2.1 Protéger une nouvelle route contre la force brute
```javascript
const { authLimiter } = require('../middleware/security');
const { validateLogin } = require('../middleware/validators');

router.post('/login', authLimiter, validateLogin, monControleur.login);
```

### 2.2 Restreindre une route aux administrateurs
```javascript
const { protect, authorize } = require('../middleware/auth');

// protect vérifie le JWT, authorize vérifie req.user.role === 'admin'
router.delete('/users/:id', protect, authorize('admin'), monControleur.supprimerUtilisateur);
```

### 2.3 Valider un identifiant MongoDB dans l'URL
```javascript
const { validateObjectId } = require('../middleware/validators');

router.get('/products/:id', validateObjectId('id'), monControleur.getProduct);
```

---

## 3. Gestionnaire d'Erreurs et Protection contre la Fuite d'Informations

En environnement de production (`NODE_ENV=production`) :
- Aucune pile d'exécution (`stack trace`) n'est envoyée dans la réponse JSON.
- Les erreurs de connexion de base de données (adresses IP, ports, identifiants MongoDB) sont interceptées et remplacées par un message générique :  
  `"Une erreur interne sécurisée est survenue. L'administrateur a été notifié."`
- Les détails des erreurs critiques restent enregistrés côté serveur dans les logs sécurisés de l'infrastructure.

---

## 4. Checklist d'Audit Avant Mise en Production

- [x] L'option `oapp.use` (erreur de frappe) est résolue et testée.
- [x] Aucune chaîne de connexion MongoDB avec mot de passe en dur n'existe dans le code source.
- [x] Le secret JWT de production provient obligatoirement de la variable d'environnement `JWT_SECRET`.
- [x] Les cookies de session comportent `httpOnly: true`, `secure: true` et `sameSite: 'strict'` / `'lax'`.
- [x] Les routes d'authentification sont bridées par `authLimiter` (anti-bruteforce).
- [x] Le module NoSQL injection `express-mongo-sanitize` est activé sur toutes les requêtes.
- [x] Les en-têtes Helmet et la politique CSP sont configurés.
- [x] Les téléversements de fichiers passent par un contrôle MIME strict et sont hébergés sur Cloudinary.

