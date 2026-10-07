# Cahier des charges — MERA (Medical Evaluation Robotic Assistant)

| | |
|---|---|
| **Projet** | MERA v2.0 — Robot médical d'évaluation et application de diagnostic en centre de santé |
| **Version** | 1.0 |
| **Date** | 28 septembre 2026 |
| **Statut** | Validé — socle v2 existant (code livré) |
| **Portée** | Application web full-stack + firmware ESP32 + PCB + référentiel pharmacopée |
| **Classification** | Document interne de spécification (ne constitue pas une promesse réglementaire) |

---

## 1. Contexte et objectifs

### 1.1 Problème à résoudre

Dans les centres de santé intégrés (CSI) et les zones faiblement conectées, l'évaluation médicale des enfants repose sur des supports manuels, fragmentés et souvent indisponibles :

- recueil des signes vitaux sans traçabilité ni protocole ;
- absence d'aide à la décision pour orienter (traitement traditionnel vs référence) ;
- suivi des dossiers dans des cahiers physiques ;
- notion de continuité médecin ↦ encadreur faible.

**MERA** (Medical Evaluation Robotic Assistant) vise à équiper un centre de santé d'un **robot autonome** capable de mesurer les constantes d'un enfant (température, SpO₂, fréquence cardiaque, poids), de lire un badge RFID, de produire une **session de diagnostic** persistée, de proposer un **traitement traditionnel documenté** et d'orienter vers un médecin référent, le tout synchronisé avec une application web multi-rôles.

### 1.2 Objectifs généraux (`OG`)

| Réf | Objectif |
|---|---|
| OG-1 | Automatiser le recueil des signes vitaux et la création d'une session de diagnostic tracée (horodatée, rattachée à un patient et un appareil). |
| OG-2 | Fournir une aide à la décision thérapeutique : **base pharmacopée d'abord**, complément IA seulement en secours et jamais pour un patient sans anomalie. |
| OG-3 | Assurer un circuit de revue médicale : l'encadreur collecte, le médecin valide ou réfère, le gardien est notifié. |
| OG-4 | Authentifier tous les acteurs avec traçabilité (staff RBAC, patient par QR+PIN, appareil par jeton). |
| OG-5 | Tenir la promesse **hors ligne** du robot : file d'attente des mesures quand le réseau est absent. |
| OG-6 | Maintenir la souveraineté des données : échelle de données à coût maîtrisé, déploiement minimal (une VM/tier + PostgreSQL managé). |

### 1.3 Bénéficiaires

- **Encadreurs** : enregistrement des enfants, conduite des sessions, pointage.
- **Médecins** : revue et validation des sessions, référencement.
- **Administrateurs** : gestion des utilisateurs, des appareils, de la pharmacopée.
- **Patients/gardiens** : consultation de leur dossier (QR + PIN).
- **MERA DevOps** : supervision des appareils, télémétrie.

---

## 2. Périmètre

### 2.1 Inclus dans le socle v2 (livré)

- Application web **frontend React (Vite)** — espaces staff, admin, patient.
- **Backend Express / Node.js / Prisma / PostgreSQL** (Neon, `sslmode=require`), port 4000, proxifié par Vite (`/api` → `:4000`).
- **Firmware ESP32** « ROBOT MEDICAL SCOLAIRE v5.4 » + PCB 2 couches « MERA PCB v2 ».
- **Protocole HTTP robot ↔ backend** (`backend/ROBOT_PROTOCOL.md`).
- **Referentiel pharmacopée** : 165 traitements / 90 plantes documentés (JSON + CSV).
- Modules IA multi-fournisseurs (Groq → Gemini → Anthropic → Mock).
- Vocalisation (STT Whisper / TTS) et prédiction systémique.

### 2.2 Hors périmètre du socle (évolutions ou externalisé)

- Fabrication industrielle et certification des PCBs (hors recettes locales).
- Certification / homologation dispositif médical (CFR/MDR vaudq pour déploiement clinique réel).
- Interopérabilité HL7/FHIR (non requise au socle).
- Cartographie épidémiologique (composants présents mais **orphelins** — non routés dans `App.jsx`).
- Migrations de l'ancien client « Base44 » (remplacé par le backend Express local).

### 2.3 Rappel — périmètre de la session courant

Le présent document couvre l'état **v2 livré localement**, incluant les renforcements validés ce jour :

1. Recherche pharmacopée robuste (accent/pluriel/préfixe/insensible à la casse).
2. Flux **base → IA** : IA uniquement si anomalie détectée **et** tableau non couvert par la base, ou en complément des seules pathologies déjà couvertes.
3. Affichage des **contre-indications** avec mise en exergue du risque élevé (pédiatrique / grossesse / allergie).
4. Correction du timeout Neon (`connect_timeout=30`, `pool_timeout=30`, `connection_limit=5`).
5. **Sources tracées** : `source_url` = article PubMed identifié (PMID) lorsque la plante est retrouvée dans le titre/résumé ; sinon lien de recherche affiché comme tel (jamais « vérifié »).
6. **`pending` exclu des vues cliniques** (`/treatments/search`, `/patient/treatments`, entités hors admin) — DQ-05 appliqué.
7. **Âge du patient branché sur la pharmacopée** : bannière pédiatrique, alertes de contre-indication enfant, posologie « Non établi » bloquée, âge/poids injectés dans le contexte LLM.
8. **Contributions verrouillées** (DQ-06) : création en `pending`, champs source/CI obligatoires, niveau d'évidence borné, anti-doublon, route générique bloquée.

---

## 3. Description de l'existant (état des lieux)

### 3.1 Architecture cible

```
            ┌──────────────────────────────┐
   Robot    │      MERA backend (Express)  │         Frontend React/Vite (:5173)
  ESP32 ───▶│ :4000  Prisma/PostgreSQL     │◀──proxy /api── localhost
  (RFID,     │ routes: auth, robot, llm,    │         espaces Staff/Admin/Patient
   vitaux)   │       treatments, attendance,│
   BLE dim.  │       admin, devices, voice… │         PostgreSQL managé (Neon)
            └──────────────────────────────┘                │ 18 modèles
               ▲ toutes les 30 s              ▲
   heartbeat  └────────────────────────────┘  lookup badge
```

- **Robot** : Wi-Fi STA, IP statique `192.168.1.109`, HTTP JSON (`ArduinoJson`), Bearer token par appareil (`api_token`).
- **Raspberry Pi** : analyse oculaire (`/api/capture`, `/api/results/<session>`) ; **PC Fedora** : `/play_audio` (voix).
- **Backend** : hébergement actuel cible `https://mera-app.onrender.com` (adresse référencée dans le firmware).

### 3.2 Données (18 modèles Prisma)

| Domaine | Modèles |
|---|---|
| Identité & accès | `User`, `RegistrationRequest`, `DoctorAssignment`, `Notification` |
| Territoire | `HealthCenter` |
| Patients | `Patient` (badge `card_id`, PIN hash, `is_pediatric`) |
| Robot | `MeraDevice` (statut, batterie, firmware, `api_token`) |
| Diagnostic | `DiagnosticSession`, `VitalSigns`, `EyePhoto`, `ContagiousEyeResult`, `NonContagiousEyeResult`, `SystemicPrediction` |
| Pharmacopée | `TraditionalTreatment`, `TreatmentIndication` |
| Dialogue | `VocalExchange` |
| Suivi | `MedicalReview`, `Attendance` |

Statuts clés : `User.role` = `admin | encadreur | medecin` ; `status` = `pending | active | suspended` ; `TraditionalTreatment.status` = `pending | approved | rejected`.

### 3.3 Rôles et accès (résumé)

| Fonction | admin | medecin | encadreur | patient |
|---|---|---|---|---|
| Session diagnostic (`/diagnostic`) | — | par URL | ✅ menu | — |
| Dossiers enfants (`/patients`) | — | ✅ | ✅ | — |
| Pointage (`/attendance`) | ✅ | ✅ | ✅ | — |
| Revue médicale (`/reviews`) | — | ✅ | — | — |
| Simulateur IA (`/simulator`) | — | ✅ | ✅ | — |
| Appareils (`/devices`), Administration | ✅ | — | — | — |
| Espace patient (QR+PIN) | — | — | — | ✅ |

> Détail : `Sidebar.jsx:15-21` gouverne la visibilité des menus. Le médecin n'a **pas** de lien menu vers `/diagnostic` (conception validée), la route reste accessible (`RequireStaff`).

### 3.4 Vues d'état des mots-clés de référence

- Cartes d'identité de staff : format `AD|MD|EN-XXXX-XXXX`.
- Badge patient RFID (UID) = `card_id`.
- Barème d'urgence embarqué (backend, `routes/robot.js` — urgences) : CRITIQUE si T°>40, SpO2<90, FC>120 ; ELEVE si alertes contagion / T°≥38 / SpO2<95.
- Barème IA (`routes/llm-predict.js:57-61`) : CRITIQUE T°>40, SpO2<90, FC>130 ; ELEVE T°38.5-40, SpO2 90-94, alerte contagion — **incohérence FC 120 vs 130 à arbitrer** (voir §12).
- Seuil de détection oculaire : probabilité ≥ `0.5`.
- Dépendances front : paquets `lucide-react`, `shadcn/ui`, `@tanstack/react-chart` etc.

---

## 4. Exigences fonctionnelles

MoSCoW : **Doit** (MUST) / **Devrait** (SHOULD) / **Pouvait** (COULD). Chaque exigence a un identifiant `FR-nn`.

### 4.1 Authentification et gestion des rôles

| Réf | Priorité | Exigence | Critère d'acceptation |
|---|---|---|---|
| FR-01 | MUST | Connexion staff par **email ou carte** (`/auth/login`) + mot de passe, session cookie (`SameSite=Lax`, `httpOnly`). | Login `medecin@mera.app`/`medecin1234` OK ; mauvais mot de passe → `401 invalid_credentials`. |
| FR-02 | MUST | Demande d'inscription (`/auth/request-registration`) avec signature obligatoire pour les médecins ; file de validation admin. | Une demande `pending` génère une notification admin ; approve → user `active` + ID card générée. |
| FR-03 | MUST | RBAC stricte : routes protégées `requireStaff`/`requireAdmin`, scoping des données par `DoctorAssignment`. | Un médecin ne voit que les enfants des encadreurs assignés. |
| FR-04 | MUST | Login patient **QR (card_id) + PIN**, PIN téléversé **une seule fois** à l'enregistrement ; regénération tracée côté staff admin. | Un patient logué ne voit que son propre historique. |
| FR-05 | MUST | Réinitialisation de mot de passe et regénération de carte via `/admin/users/:id/reset-password`, `/regenerate-id-card`. | Comportement vérifié fonctionnel (tests admin). |

### 4.2 Robot et protocole ESP32

| Réf | Priorité | Exigence | Critère d'acceptation |
|---|---|---|---|
| FR-10 | MUST | **Heartbeat** du robot toutes les 30 s → dernière activité < 60 s = `en_ligne`, sinon `hors_ligne`. | `DeviceManagement` reflète l'état sous 60 s. |
| FR-11 | MUST | **Ingestion d'une session** : un seul `POST /robot/measurements` crée atomiquement `DiagnosticSession` + `VitalSigns` + résultats oculaires (transaction). | Toute mesure valide persiste ; double POST ne duplique pas (idempotence à confirmer — cf. §12). |
| FR-12 | MUST | **Lookup badge** : `POST /robot/lookup` résout l'UID en `patient_id` ; carte inconnue → refus. | Test : UID `RFID-DEMO-001` résolu, UID inconnu refusé. |
| FR-13 | MUST | **File d'attente hors-ligne** firmware : 20 entrées, 3 tentatives max, renvoi au retour du Wi-Fi. | Mesures hors-ligne réapparaissent à la reconnexion (test d'intégration). |
| FR-14 | MUST | Calcul automatique du niveau d'urgence à la réception (CRITIQUE/ELEVE/MODEREE/FAIBLE). | Seuils du §3.4 appliqués, notification des cas urgents. |
| FR-15 | SHOULD | Pointage RFID (`/robot/attendance`) avec rôle, horodatage. | Ligne `Attendance` créée ; export du jour OK. |

### 4.3 Session de diagnostic (interface)

| Réf | Priorité | Exigence | Critère d'acceptation |
|---|---|---|---|
| FR-20 | MUST | Session consultable côté encadreur avec 5 onglets : Signes vitaux / Analyse oculaire / Prédictions / **Traitements** / Dialogue. | Tous les onglets rendus, données persistées chargées. |
| FR-21 | MUST | Saisie manuelle des constantes (température, SpO₂, poids, fréquence cardiaque, IMC) avec seuils d'alerte cohérents sur les panneaux. | `VitalSignsPanel`, `SystemicPredictionPanel`, pharmacopée s'accordent sur les seuils (arbitrage recommandé — §12). |
| FR-22 | MUST | Analyse oculaire : résultats contagieux (bac., virale, trachome, blépharite) et non-contagieux (cataracte, ptérygion, uvéite, ictère, myopie, glaucome, rétinopathie) avec `confidence`. | Alerte de contagion affichée ; seuil ≥0.5. |

### 4.4 Prédiction systémique IA

| Réf | Priorité | Exigence | Critère d'acceptation |
|---|---|---|---|
| FR-30 | MUST | `POST /llm/predict-diagnosis` : avec `session_id` → persiste `SystemicPrediction` + maj `urgency_level`/`recommendations` en transaction ; sans → preview éphémère. | Deux prédictions successives remplacent (et non doublent) les précédentes. |
| FR-31 | MUST | Sortie strictement JSON, validée, normalisée ; refus d'urgence mal étiquetée. | Réponse non-JSON → erreur propre, pas de crash. |
| FR-32 | SHOULD | Réponse IA au plus tard en N secondes (cible 30 s incl. timeout fournisseur). | Chronométré en recette. |

### 4.5 Pharmacopée traditionnelle (module cœur)

| Réf | Priorité | Exigence | Critère d'acceptation |
|---|---|---|---|
| FR-40 | MUST | **Recherche en base d'abord** (`POST /treatments/search`) sur 135 maladies distinctes (donnée : 165 traitements / 90 plantes). | Mot-clé nominal, pluriel (`Cataractes`), sans accent (`Desaturation`), multi-jets (`Retinopathie diabetique`) → mêmes lignes. |
| FR-41 | MUST | Exclure les traitements `rejected` ; présenter/administrer uniquement les `approved` (arbitrage `pending` — §12). | Requête retourne uniquement `status != rejected`. |
| FR-42 | SHOULD | Tri par `max_severity` puis `evidence_level` (OMS → clinique → avéré → rapporté), regroupé par condition. | Ordre stable en recette. |
| FR-43 | MUST | **Aucun appel IA si aucune anomalie détectée** (température, SpO₂, FC, IMC, œil sous les seuils). | 0 requête `/treatments/search`, 0 `/llm/invoke`, carte verte. |
| FR-44 | MUST | **Repli IA uniquement si anomalie et base vide** ; en mode complément, l'IA est **restreinte** aux pathologies déjà couvertes (liste blanche). | Scénarios §5 testés : hors-liste éliminé, prompt contient la liste blanche en complément et pas en secours. |
| FR-45 | MUST | **Règles de sécurité IA** (prompt) : pas de dose enfant inventée (`Non établi`), pas de diagnostic hors tableau, pas de référence/URL fabriquée. | Assertions de prompt + extraction en recette. |
| FR-46 | MUST | Affichage **des contre-indications** de chaque plante, avec mise en exergue rouge des contre-indications pédiatriques/grossesse/allergie. | Ligne « Contre-indications » visible ; style `destructive` sur les cas à risque (§ check DOM 39/39). |
| FR-47 | MUST | Bloc IA **discret** : bordure pointillée, avertissement « propositions non vérifiées », aucune URL cliquable. | Vérifié en rendu réel (tests DOM). |
| FR-48 | MUST | Résilience aux erreurs LLM : échec/JSON invalide/liste vide → carte neutre sans crash ni `undefined`. | Tests S4-S6 du harness. |
| FR-49 | MUST | Administration pharmacopée : CRUD + modération (`/admin/pharmacopee`), listes de cultures. | Admin peut créer/remplacer/modérer un traitement ; **toute création part en `pending`** (`status` du body ignoré) et n'est approuvable qu'avec source + URL. |
| FR-50 | SHOULD | **Ne jamais afficher un traitement IA comme vérifié** ; mention source DB séparée des propositions IA. | Libellés distincts (« pharmacopée traditionnelle » vs « Propositions IA non vérifiées »). |

### 4.6 Revue médicale et suivi

| Réf | Priorité | Exigence | Critère d'acceptation |
|---|---|---|---|
| FR-60 | MUST | Liste des sessions en attente pour le médecin (`/reviews`) : validation, note, référencement, PDF. | Un `MedicalReview` est créé, statut à jour. |
| FR-61 | SHOULD | Notification du gardien à la validation/référence. | Notification créée côté gardien. |

### 4.7 Pointage et export

| Réf | Priorité | Exigence | Critère d'acceptation |
|---|---|---|---|
| FR-70 | MUST | Pointage du jour (`/attendance/today`), stats, **export Excel** (fuseau Cameroun). | Export téléchargeable, fuseau correct. |

### 4.8 Notifications

| Réf | Priorité | Exigence | Critère d'acceptation |
|---|---|---|---|
| FR-80 | MUST | Bell + listes (`/me/notifications`), lecture/lues-toutes. | Marquage à jour ; cas urgent notifié à l'encadreur/administrateur. |

### 4.9 Espace patient

| Réf | Priorité | Exigence | Critère d'acceptation |
|---|---|---|---|
| FR-90 | MUST | Login QR (card_id) + PIN, historique de sessions, PDF de session (jsPDF). | PDF généré sur `/patient/sessions/:id`. |
| FR-91 | COULD | Chat avec l'agent MERA (InvokeLLM + vocal). | Réponse encadrée par le disclaimer patient. |

### 4.10 Simulateur IA et vocal

| Réf | Priorité | Exigence | Critère d'acceptation |
|---|---|---|---|
| FR-100 | SHOULD | Chat IA simulé (encadreur/medecin) sans interaction robot. | Réponses mock si aucune clé (voir FR-110). |
| FR-101 | SHOULD | STT (`/llm/transcribe`, Whisper) et TTS (`/llm/speak`), statut (`/llm/voice/status`). | Bouteille vocale de test rendue. |

---

## 5. Exigences fonctionnelles sur le module IA (détail — comportement validé)

### 5.1 Diagramme de flux as-exécuté

```
1 cas détecté
  ├─ 0 anomalie (temp.≤37.5, SpO2≥94, 55≤FC≤100, IMC≥16, œil OK)
  │    → carte verte « Aucune anomalie détectée ». Ni base, ni IA.
  ├─ anomalies détectées
  │    → recherche base (traitements != rejected)
  │         ├─ base trouve N lignes
  │         │    → affiche les N vérifiés
  │         │    → IA en COMPLÉMENT, liste blanche = pathologies couvertes uniquement
  │         └─ base ne trouve rien
  │              → IA en SECOURS (tableau clinique, pas de liste blanche)
  │              → si échec IA → carte neutre « aucun remède vérifié ne correspond »
```

### 5.2 Seuils → mots-clés (constantes du composant)

| Mesure | Seuil | Mots-clés générés |
|---|---|---|
| température | > 37,5 | Fièvre |
| température | > 38,5 | Fièvre, Paludisme |
| température | > 40 | Fièvre, Paludisme (critique) |
| SpO₂ | < 94 | Désaturation |
| SpO₂ | < 90 | Désaturation, dyspnée (critique) |
| FC | > 120 | Tachycardie, palpitations |
| FC | > 100 | Palpitations |
| FC | < 55 | Bradycardie |
| IMC | < 16 | Malnutrition |
| œil | prob ≥ 0,5 | conditions oculaires correspondantes |

### 5.3 Cas de recette IA (acceptation)

| Cas | Données | Résultat attendu |
|---|---|---|
| R-A | 36.8 / 98 / 72 | 0 appel réseau ; carte verte |
| R-B | 39.2 / 91 / 72 | recherche base + complément IA sur les pathologies couvertes |
| R-C | 36.8 / 91 / 72 | 1 mot-clé, IA limitée à ce diagnostic |
| R-D | 36.8 / 98 / 48 | `Bradycardie` → base vide → repli IA |
| R-E | SpO2 50 | plus de mots-clés oculaires → carte verte (anti sur-détection) |
| R-F | LLM en échec | carte neutre, pas de crash |
| R-G | IA hors-liste | proposition éliminée |

**Preuve en rendu réel** : harness jsdom `39/39` (S1-S7) + API HTTP publié §14.

---

## 6. Exigences non fonctionnelles

| Réf | Priorité | Exigence | Cible |
|---|---|---|---|
| NFR-01 | MUST | Temps de réponse du frontend temps réel côté soignant. | < 500 ms hors IA ; IA < 30 s. |
| NFR-02 | MUST | **Robustesse réseau** : réveil froid de la base managée supporté. | `connect_timeout=30`, `pool_timeout=30`, `connection_limit=5` (configuré). |
| NFR-03 | MUST | Confidentialité des secrets (clés API, JWT, DB). | Aucune clé en clair dans le repo (fichiers `.env*` exclus) ; rotation des clés documentée. |
| NFR-04 | MUST | Sécurité transport : HTTPS en prod, cookies `httpOnly` + `SameSite=Lax` ; `sslmode=require` en base. | Audit de configuration. |
| NFR-05 | SHOULD | Résilience IA : aucun crash utilisateur si fournisseur KO. | Tests d'injection d'erreur (§5.3 R-F). |
| NFR-06 | SHOULD | Journalisation d'audit des actions admin (inscription, validations, pharmacopée). | Propose `/admin/logs` (COULD). |
| NFR-07 | SHOULD | Internationalisation minimale (FR livré, EN COULD) via `useTranslation`. | Changement de langue dans Paramètres. |
| NFR-08 | MUST | Testabilité : cohérence entre tests constructeur, assertions de prompt, rendu DOM headless. | `npm run build` OK, ESLint sans erreur sur le module, harness 39/39. |
| NFR-09 | SHOULD | Accessible en zone rurale : faible bande passante, cache des assets Vite, TTFB raisonnable. | Lighthouse score cible > 80 mobile. |

---

## 7. Exigences matérielles (embarqué)

| Réf | Exigence | Détail |
|---|---|---|
| HW-01 | Carte unique embarquée | **PCB MERA v2** : ESP32 (CP2102), MAX30102 (SpO₂/BPM), MLX90614 (temp IR), MFRC522 (RFID 13,56 MHz), ILI9341 2,4″ SPI tactile, CN3791 (charge MPPT solaire), TP4056 (Li-ion), LD1117V33 (3,3 V), buzzer. |
| HW-02 | Firmware principal | `Vrai_code_esp32.ino` (v5.4) : MAX30100 (ou MAX30102/05 selon variante), MLX90614, balance BLE (Famkit 12), RFID via ESP32 esclave (UART2 115200), TFT ILI9488 480×320, FreeRTOS (tâche capteurs Core 0, mutex). |
| HW-03 | Connectivité | Wi-Fi STA (SSID « MERA », IP 192.168.1.109), HTTP JSON, Bearer token par appareil. |
| HW-04 | Hors-ligne | File d'attente EEPROM/RAM : 20 mesures, 3 tentatives, renvoi au retour réseau. |
| HW-05 | Supervision | Heartbeat 30 s (`battery_pct`, firmware, RAM libre) ; endpoint `/health` interrogé par le backend. |
| HW-06 | Étanchéité/usage | Design 3D pour impression (≈60 STL), 2 couches 1,6 mm, alimentation solaire + batterie. |
| HW-07 | Variantes courantes | `max30100.ino`/`code.ino` (MAX30102-S3), `vrai_code.ino` (MAX30105 + SpO₂ maison), `test.ino` (attendance enrichie), `code_eps32_calibration.ino` (calibration) — maintenus séparément. |
| HW-08 | **Arbitrage nécessaire** | Le PCB porte un **MAX30102**, le firmware compile contre un **MAX30100**, variantes en MAX30105 : choisir le composant de référence unique (§12). |

---

## 8. Données et référentiel pharmacopée

### 8.1 Données de référence

- **165 traitements**, **90 plantes**, **135 maladies**, 14 catégories ; tous avec dosage (adulte/enfant), précautions, contre-indications, sévérité, niveau de preuve et **URL source**.
- **Qualité des sources** : **144/165** `source_url` pointent un **article PubMed identifié (PMID)** — plante retrouvée dans le titre ou le résumé ; les **21** restantes sont des liens de recherche (`?term=`), affichés comme tels (« recherche PubMed — non vérifié ») et jamais comme source vérifiée. Régénérer : `python3 datasets/resolve_pubmed_urls.py` (idempotent, `--force` pour tout refaire).
- Base synchronisée (06/10/2026, `node backend/prisma/sync-urls.js`) : **144** `source_url` = PMID, **21** = liens `?term=`, **4** lignes sans URL (§12 #12) — 169 lignes au total.
- Niveaux de preuve : `OMS` (9) > `clinique` (70) > `traditionnel_avéré` (40) > `traditionnel_rapporté` (46).
- Sévérité : `modere` 108, `faible` 31, `eleve` 25, `critique` 1.
- Fichiers : `datasets/traditional_treatments.json` (+ `.csv`).
- Base Neon constatée : **169 traitements**, tous `approved`, 169 avec contre-indications (écart 165↔169 à documenter — §12).

### 8.2 Règles qualité

| Réf | Règle |
|---|---|
| DQ-01 | Toute entrée doit avoir une source et une URL ; interdiction de synthese IA sans contre-indications. Une URL n'est « vérifiée » que si elle pointe un **article PubMed identifié (PMID)** — sinon c'est un lien de recherche, à présenter comme tel. |
| DQ-02 | Normalisation de recherche : minuscules, suppression accents (NFD), singularisation, préfixe → `token_contains`. |
| DQ-03 | « Posologie enfant » affichée systématiquement, valeur `Non établi` plutôt qu'inventée. |
| DQ-04 | Les contre-indications mentionnant enfants/nourrissons/grossesse/allergie sont **marquées à risque élevé** et affichées en zone destructive. |
| DQ-05 | Modération : `approved` visible cliniquement, `rejected` exclu, `pending` **exclu des vues cliniques** — ✅ appliqué (routes `/treatments/search`, `/patient/treatments` et `scopedWhere` hors admin). |
| DQ-06 | Écriture pharmacopée **uniquement** via `/admin/pharmacopee` (route générique `/entities/TraditionalTreatment` → 403). Création : `status: pending` forcé, `contre_indications` + `source` + `source_url` (URL http(s)) obligatoires, `evidence_level` borné à `traditionnel_rapporté|traditionnel_avéré` (les niveaux `clinique`/`OMS` passent par la modération), anti-doublon `(disease, plant_name_fr)` → 409 — ✅ appliqué + testé (7 tests smoke). |

---

## 9. Sécurité et conformité

| Réf | Exigence |
|---|---|
| SEC-01 | **Hash des mots de passe** (bcrypt, coût ≥ 10) ; PIN patient hashé, remis une seule fois. |
| SEC-02 | JWT signé (`JWT_SECRET` hors repo), expiration 7 j, cookie `httpOnly`. |
| SEC-03 | Tokens appareils (`api_token`) uniques par `MeraDevice`, regénéralité admin. |
| SEC-04 | Scoping RBAC systématique (`lib/scope.js`) : médecin limité aux encadreurs assignés. |
| SEC-05 | Validation Zod sur tous les corps entrants (tests 400 en recette). |
| SEC-06 | Upload limité (≤ 10 Mo), stockage disque isolé, servi uniquement authentifié. |
| SEC-07 | Seuils d'abuse IA : protection contre génération hors liste (listes blanches côté composant, §5.1). |
| SEC-08 | Conformité : le projet manipule des **données de santé** ; dossier d'information patient, consentement gardien requis avant exploitation réelle (hors portée technique). |
| SEC-09 | **Secrets** : jamais de clé dans un fichier suivi. Attention aux sauvegardes type `.env.bak` (non ignorées par défaut selon git check-ignore). |

---

## 10. Déploiement et exploitation

- **Local** : `cd backend && npm run dev` (port 4000) ; `cd frontend && npm run dev` (port 5173, proxy `/api`).
- **Base** : PostgreSQL managé (Neon), `sslmode=require` ; migrations Prisma sous `backend/prisma/migrations/` ; socle **sqlite local** (`schema.local.prisma`, `prisma/dev.db`) pour dev — **un seul client Prisma compilé à la fois** (postgres ou sqlite) : bascule = `npx prisma generate [--schema prisma/schema.local.prisma]`.
- **Prod cible** : rendez la base managée + VM/tier Node + reverse proxy nginx (HTTPS). URL courante dans le firmware : `https://mera-app.onrender.com`.
- **Erreur courante à éviter** : lancer le backend sans client re-généré pour le provider actif provoque `URL must start with file:` (refus de démarrage).

### Exploitation

- Sauvegardes base (managées) + export DataFrame `attendance`.
- Rotation des clés IA ; surveillance `GET /api/llm/providers`.
- Supervision des robots via `DeviceManagement` (< 60 s de différence = on-line).

---

## 11. Jalons et planning indicatif

| Jalon | Livrable | Statut |
|---|---|---|
| M0 | Socle v2 installable (backend+front+robot+PCB) | 🟢 Livré |
| M1 | Réseau sécurisé + config prod (Render/VM, HTTPS, base managée) | 🟡 Partiel (URL firmware prod référencée) |
| M2 | Module pharmacopée renforcé (base→IA, CI, contre-indications) | 🟢 Livré et testé |
| M3 | Arbitrages convergences (§12) et passerelles BDD 165↔169 | ⚪ À faire |
| M4 | Certification/validation médicale (si déploiement clinique) | ⚪ Hors socle |
| M5 | Pilotage : épidémiologie, logs admin, multilingue | ⚪ Backlog |

---

## 12. Points durs et arbitrages à trancher

| # | Point | Risk | Action recommandée |
|---|---|---|---|
| 1 | **Âge du patient non utilisé** dans la pharmacopée (contre-indications pédiatriques non confrontées à l'âge réel). | Élevé | ✅ **Corrigé** : `patientAge` passé au panneau, bannière pédiatrique, alerte CI enfant, posologie « Non établi » bloquée, âge/poids dans le contexte LLM. Reste : filtrer les CI « enfants < N » selon l'âge exact. |
| 2 | **`pending` visible cliniquement** : toute entrée non `rejected` est retournée. | Moyen | ✅ **Corrigé** : `status: 'approved'` sur `/treatments/search`, `/patient/treatments` et `scopedWhere` hors admin. |
| 3 | **Incohérence de seuils FC** : robot 120 (critique) vs LLM 130. | Moyen | ✅ **Corrigé** : source de vérité unique `backend/src/lib/thresholds.js` (FC critique = 120) répliquée dans `frontend/src/lib/thresholds.js` ; `robot.js`, `llm-predict.js` (prompt LLM) et les panneaux `VitalSigns`/`TraditionalTreatment`/`SystemicPrediction` l'utilisent. |
| 4 | **Écart de volumétrie** : 165 (JSON) vs 169 (Neon). | Faible | Re-seed commun + checklist. |
| 5 | **Mock LLM silence** : sans clé, `LLM_PROVIDER=""` → mock ; les réponses conversationnelles mockées échouent au JSON.parse et sont avalées, le `503 llm_unavailable` est inatteignable. | Moyen | Si pas de clé : retourner « IA indisponible » explicitement (éviter un faux silence). |
| 6 | **Double schéma Prisma** (postgres vs sqlite) : le client compilé ne vise qu'un moteur à la fois ; `DB_PROVIDER` peut mentir. | Moyen | Script de bascule unique `npm run db:local|db:cloud` (generate + env). |
| 7 | **README obsolète** (arborescences `src/`/`server/`). | Faible | ✅ **Corrigé** : README réécrit (arborescence `frontend/` + `backend/`, bascule Prisma sqlite/postgres, endpoints `/robot` et `/llm/predict-diagnosis`, note secrets). |
| 8 | **Épidémiologie non routée** (`Epidemiology.jsx`, cartes). | Faible | ✅ **Corrigé** : route `/epidemiology` dans `App.jsx` (staff) + entrée Sidebar (admin/médecin) + clé `nav.epidemiology` dans les 4 langues. |
| 9 | **Idempotence `/robot/measurements`** à confirmer (double POST). | Moyen | Clé d'idempotence ou contrôles robots. |
| 10 | **Sauvegardes `.env.bak`** non ignorées. | Moyen | ✅ **Corrigé** : `.gitignore` racine passe à `.env*` (couvre `.env`, `.env.prod`, `.env.bak`, `.env.production`, toutes les profondeurs) avec exception `!.env.example` ; historique git vérifié — aucun secret jamais tracké. |
| 11 | ~~**Index unique non déployé**~~ — ✅ **Corrigé** : migration `20261006_unique_treatment_disease_plant` appliquée à Neon (`TraditionalTreatment_disease_plant_name_fr_key`, rejet `P2002` vérifié) + contrôle applicatif 409. | — | — |
| 12 | **4 lignes sans `source_url`** (hors dataset 165 : « Infection respiratoire (toux) » ×3 et « Douleur / inflammation » — Harpagophytum) : référence bibliographique présente mais URL absente → **impossible à (ré)approuver** tant que l'URL n'est pas saisie (DQ-01/DQ-06). | Moyen | Admin : compléter l'URL via `/admin/pharmacopee`. |

---

## 13. Critères généraux de recette (checklist finale)

- [x] Serveurs locaux : backend :4000 et frontend :5173 répondants, proxifié (`/api`). *(✅ 07/10/2026 : front 200, backend 200, proxy `/api/health` → 200)*
- [x] Login 3 comptes seed OK (admin/encadreur/médecin) + mauvais mot de passe en 401. *(✅ 07/10/2026 : 3×200 avec bons rôles, mdp faux → 401)*
- [ ] Pharmacopée : 5 cas §5.3 passés, notamment 0 appel pour un patient sain. *(_Partiel 07/10/2026 — API : R-A 0 appel (code), R-B `tachycardie`→2 approved, R-D `bradycardie`→0 (repli IA), R-F provider KO → fallback mock 200, `predict-diagnosis` → 200/3 prédictions ; restent rendus UI R-C/R-E à confirmer en navigateur)_
- [ ] Contre-indications pédiatriques/grossesse/allergie apparaissent en zone destructive. *(données OK côté API : 165/165 `approved` avec `contre_indications` ; rendu UI à vérifier)*
- [x] Robot : heartbeat 30 s → on-line ; `POST /robot/measurements` crée une session complète. *(✅ 07/10/2026 : heartbeat → 200, measurements → 201, session créée, `urgency_level=NORMAL` sur 36.8/98/72)*
- [x] Pointage du jour + export Excel. *(✅ 07/10/2026 : `/attendance/today` → 200, `/attendance/export` → 200, mime `spreadsheetml.sheet`, 6,7 Ko)*
- [ ] Revue médecin : validation + PDF. *(non testé — UI)*
- [ ] Espace patient QR+PIN : historique + PDF session. *(_Partiel 07/10/2026 — API : login PIN `1234` → 200, PIN faux → 401, `GET /patient/sessions` → 200 (1 session créée par le robot visible) ; restent QR + PDF UI)_
- [x] Linter/build sans nouvelle erreur sur les modules modifiés. *(ESLint 0 erreur, typecheck OK, build OK le 07/10/2026)*
- [x] Aucune clé ni secret dans les fichiers suivis. *(`.env*` ignorés, `git ls-files` ne contient que `.env.example`)*

**Recette automatisée le 07/10/2026** (backend local sqlite `dev.db` re-seedé, aucun impact Neon) — 6/10 cases cochées, 2 partielles (API ✔ / UI), 2 UI restantes.

---

## 14. Références techniques

- Protocole robot ↔ backend : `backend/ROBOT_PROTOCOL.md`.
- Schéma DB : `backend/prisma/schema.prisma` (+ variante locale `schema.local.prisma`).
- Données : `datasets/traditional_treatments.json` & `.csv` ; seed `backend/prisma/seed.js`, `backend/seed-local.mjs` ; résolution des sources PubMed `datasets/resolve_pubmed_urls.py` ; synchro DB `backend/prisma/sync-urls.js` ; migration anti-doublon `backend/prisma/migrations/20261006_unique_treatment_disease_plant/`.
- Client API : `frontend/src/api/base44Client.js` ; routage : `frontend/src/App.jsx`.
- Firmware : `Vrai_code_esp32.ino` (v5.4) et variantes ; PCB : `PCB_MERA_2.kicad_*`, `fabrication/gerbers/`.
- Module pharmacopée : `frontend/src/components/diagnostic/TraditionalTreatmentPanel.jsx`, `backend/src/routes/treatments.js`, écriture admin `backend/src/routes/admin.js` (`/admin/pharmacopee`) + `frontend/src/pages/admin/Pharmacopee.jsx` (la route générique `/entities/TraditionalTreatment` est bloquée).
- Wrapper IA : `backend/src/lib/llm.js` ; routage IA : `backend/src/routes/llm.js`, `routes/llm-predict.js`.
- Harness de validation : tests jsdom 39/39 (S1-S7) + tests HTTP associés (session).

---

*Document généré à partir de l'état réel du dépôt `MERA_APP` (backend, frontend, firmware, PCB, datasets). Toute modification de code impactfule le présent cahier des charges doit être suivie d'une mise à jour de la section correspondante.*