# MERA — Application de diagnostic ophtalmologique

Application full-stack pour le dépistage et diagnostic en centre de santé. Frontend React (Vite) + backend Express/Prisma (SQLite en dev, PostgreSQL en prod). Plus aucune dépendance Base44.

## Architecture

```
MERA_APP/
├── frontend/                # Frontend React (Vite)
│   ├── src/
│   │   ├── api/base44Client.js   # Client local (mime l'ancienne API → backend Express)
│   │   ├── pages/                # Pages staff + admin + patient (Login/Register inclus)
│   │   ├── components/           # Layout, diagnostic, dashboard, epidemiology, ui (shadcn)
│   │   ├── lib/                  # AuthContext, useTranslation, lang/, thresholds.js
│   │   └── App.jsx               # Routage staff/admin/patient
│   └── vite.config.js            # Proxy /api → :4000 en dev
├── backend/                  # Backend Node.js
│   ├── src/
│   │   ├── index.js              # Entrée Express
│   │   ├── routes/               # auth, entities, robot, treatments, admin, llm, …
│   │   ├── middleware/           # auth JWT, device token, erreurs
│   │   └── lib/                  # prisma, jwt, llm, scope, thresholds, notifications
│   ├── prisma/
│   │   ├── schema.prisma         # Schéma PostgreSQL (prod, Neon)
│   │   ├── schema.local.prisma   # Variante SQLite (dev local)
│   │   ├── migrations/           # Migrations PostgreSQL
│   │   └── seed.js               # Données de démo + pharmacopée
│   └── uploads/                  # Photos (servies via /uploads)
├── datasets/                 # Pharmacopée (traditional_treatments.json/.csv) + scripts
├── Entities/                 # Schémas JSON historiques (Base44, conservés en doc)
└── Vrai_code_esp32.ino        # Firmware robot (voir aussi variantes .ino)
```

## Démarrage rapide

### 1. Backend

```bash
cd backend
cp .env.example .env
# Éditer .env : DATABASE_URL, JWT_SECRET, et GROQ_API_KEY si vous voulez l'IA
npm install
npx prisma generate --schema prisma/schema.local.prisma   # client SQLite pour le dev local
npx prisma db push --schema prisma/schema.local.prisma
node prisma/seed.js       # Crée un user démo + données de référence
npm run dev               # http://localhost:4000
```

**User de démo** créé par le seed : `demo@mera.app` / `demo1234`

> ⚠️ Un seul client Prisma compilé à la fois (postgres OU sqlite). Bascule :
> `npx prisma generate` (postgres) ou `npx prisma generate --schema prisma/schema.local.prisma` (sqlite).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Le frontend proxifie automatiquement `/api/*` vers `http://localhost:4000`.

### 3. Vérifications

```bash
npm run lint        # ESLint frontend (doit être à 0 erreur)
cd frontend && npm run typecheck
npm run build       # build frontend + prisma generate + db push
```

Les seuils cliniques (FC, T°, SpO2) ont une source de vérité unique :
`backend/src/lib/thresholds.js` et `frontend/src/lib/thresholds.js` (garder alignés).

## Variables d'environnement

### Frontend (`.env`)
- `VITE_API_URL` — Préfixe API (défaut `/api`, proxifié par Vite)
- `VITE_API_TARGET` — Cible du proxy en dev (défaut `http://localhost:4000`)

### Backend (`backend/.env`)
- `DATABASE_URL` — Connexion base (`file:./dev.db` en local, PostgreSQL en prod)
- `PORT` — Port HTTP (défaut 4000)
- `JWT_SECRET` — **À changer en production**
- `CORS_ORIGIN` — Origin autorisée (défaut `http://localhost:5173`)
- `UPLOAD_DIR` — Dossier de stockage des fichiers (défaut `./uploads`)

> Tous les fichiers `.env*` sont ignorés par git (`.env`, `.env.prod`, `.env.bak`, …) ;
> seul `.env.example` est suivi. **Ne jamais committer de secret.**

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

POST  /robot/measurements         — Mesures ESP32 (Bearer token appareil)
POST  /robot/heartbeat             — Supervision robot (30 s)
POST  /upload                     — Upload image (multipart/form-data, champ `file`)
POST  /llm/invoke                 — Invocation IA (body: {prompt, system?, max_tokens?})
POST  /llm/predict-diagnosis      — Prédiction système à partir d'une session

GET   /uploads/:filename          — Fichier statique
GET   /health                     — Healthcheck
```

Entités disponibles : `Patient`, `HealthCenter`, `MeraDevice`, `DiagnosticSession`, `VitalSigns`, `EyePhoto`, `ContagiousEyeResult`, `NonContagiousEyeResult`, `SystemicPrediction`, `TraditionalTreatment`, `VocalExchange`, `MedicalReview`.

Écriture pharmacopée : **uniquement** via `/admin/pharmacopee` (la route générique `/entities/TraditionalTreatment` renvoie 403).

## Production

- Base : PostgreSQL managé (Neon), `sslmode=require` ; migrations : `npx prisma migrate deploy`.
- Servir le frontend buildé (`npm run build`) derrière un reverse proxy (nginx) qui route `/api` vers le backend Node.
- Régler `NODE_ENV=production`, un `JWT_SECRET` fort, `CORS_ORIGIN` sur le domaine réel, et activer les cookies `secure`.
