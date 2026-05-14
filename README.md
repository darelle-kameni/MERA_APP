# MERA — Application de diagnostic ophtalmologique

Application full-stack pour le dépistage et diagnostic en centre de santé. Frontend React + backend Express/Prisma/SQLite. Plus aucune dépendance Base44.

## Architecture

```
MERA_APP/
├── src/                    # Frontend React (Vite)
│   ├── api/base44Client.js # Client local (mime l'ex-API Base44 → backend Express)
│   ├── pages/              # 11 pages (incluant Login/Register)
│   ├── components/         # Layout, diagnostic, dashboard, epidemiology, ui (shadcn)
│   └── lib/                # AuthContext, query-client, utils
├── server/                 # Backend Node.js
│   ├── src/
│   │   ├── index.js        # Entrée Express
│   │   ├── routes/         # auth, entities (CRUD générique), upload, llm
│   │   ├── middleware/     # auth JWT, gestion d'erreurs
│   │   └── lib/            # prisma, jwt
│   ├── prisma/
│   │   ├── schema.prisma   # 12 entités + User
│   │   └── seed.js         # Données de démo
│   └── uploads/            # Photos (servies via /uploads)
└── Entities/               # Schémas JSON historiques (Base44, conservés en doc)
```

## Démarrage rapide

### 1. Backend

```bash
cd server
cp .env.example .env
# Éditer .env : ajouter ANTHROPIC_API_KEY si vous voulez le simulateur IA
npm install
npx prisma migrate dev
npm run seed     # Crée un user démo + données de référence
npm run dev      # http://localhost:4000
```

**User de démo** créé par `npm run seed` : `demo@mera.app` / `demo1234`

### 2. Frontend

```bash
# À la racine du projet
npm install
npm run dev      # http://localhost:5173
```

Le frontend proxifie automatiquement `/api/*` vers `http://localhost:4000`.

## Variables d'environnement

### Frontend (`.env`)
- `VITE_API_URL` — Préfixe API (défaut `/api`, proxifié par Vite)
- `VITE_API_TARGET` — Cible du proxy en dev (défaut `http://localhost:4000`)

### Backend (`server/.env`)
- `DATABASE_URL` — Connexion SQLite (défaut `file:./dev.db`)
- `PORT` — Port HTTP (défaut `4000`)
- `JWT_SECRET` — **À changer en production**
- `CORS_ORIGIN` — Origin autorisée (défaut `http://localhost:5173`)
- `UPLOAD_DIR` — Dossier de stockage des fichiers (défaut `./uploads`)

#### Providers IA (multi-provider avec auto-fallback)

Ordre de priorité : **Groq → Gemini → Anthropic → Mock** (chaque provider est utilisé si la clé est présente).

| Variable | Description | Free tier |
|---|---|---|
| `LLM_PROVIDER` | Force un provider (`groq`/`gemini`/`anthropic`/`mock`). Vide = auto-fallback | — |
| `GROQ_API_KEY` | **Recommandé** — clé sur [console.groq.com/keys](https://console.groq.com/keys) | ~14400 req/jour, ~200ms latence |
| `GEMINI_API_KEY` | Fallback — clé sur [aistudio.google.com](https://aistudio.google.com/app/apikey) | 1500 req/jour |
| `ANTHROPIC_API_KEY` | Optionnel (payant) | — |

**Sans aucune clé → mode mock** : l'app fonctionne quand même, le LLM renvoie des réponses scénarisées (utile pour démo offline).

**Obtenir une clé Groq gratuite (2 min, sans CB)** : aller sur https://console.groq.com/keys, se connecter (Google/GitHub), créer une clé `gsk_...`, la coller dans `GROQ_API_KEY=` puis redémarrer le serveur.

## Endpoints backend

```
POST  /auth/register              — Inscription
POST  /auth/login                 — Connexion (cookie JWT httpOnly)
POST  /auth/logout                — Déconnexion
GET   /auth/me                    — Utilisateur courant

GET   /entities/:Entity           — Liste (?order=-created_date&limit=50&filter={...})
GET   /entities/:Entity/:id       — Récupération
POST  /entities/:Entity           — Création
PATCH /entities/:Entity/:id       — Mise à jour
DELETE /entities/:Entity/:id      — Suppression

POST  /upload                     — Upload image (multipart/form-data, champ `file`)
POST  /llm/invoke                 — Invocation Claude (body: {prompt, system?, max_tokens?})

GET   /uploads/:filename          — Fichier statique
GET   /health                     — Healthcheck
```

Entités disponibles : `Patient`, `HealthCenter`, `MeraDevice`, `DiagnosticSession`, `VitalSigns`, `EyePhoto`, `ContagiousEyeResult`, `NonContagiousEyeResult`, `SystemicPrediction`, `TraditionalTreatment`, `VocalExchange`, `MedicalReview`.

## Production

- Migrer SQLite → PostgreSQL : changer `provider = "postgresql"` dans `prisma/schema.prisma` et `DATABASE_URL`, puis `npx prisma migrate deploy`.
- Servir le frontend buildé (`npm run build`) derrière un reverse proxy (nginx) qui route `/api` vers le backend Node.
- Régler `NODE_ENV=production`, un `JWT_SECRET` fort, `CORS_ORIGIN` sur le domaine réel, et activer les cookies `secure`.
