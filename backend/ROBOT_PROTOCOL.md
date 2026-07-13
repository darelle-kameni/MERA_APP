# Protocole de communication MERA ↔ ESP32

Ce document décrit le protocole HTTP entre l'application MERA (backend Node/Express)
et le robot embarqué (ESP32). Inspiré du pattern de l'ancienne `robot-medical/backend/api_arduino.php`,
adapté à l'architecture MERA v2.0 (RBAC + scoping + notifications).

## Vue d'ensemble

```
                       Bearer api_token
   ┌─────────┐  ───────────────────────►  ┌──────────┐
   │ ESP32   │   POST /robot/measurements  │ Backend  │
   │ (robot) │   POST /robot/heartbeat     │  MERA    │
   │         │                             │ :4000    │
   └─────────┘                              └──────────┘
        ▲                                        │
        │   GET /health                           │
        └────────────────────────────────────────┘
              (initié par le backend depuis
                  POST /devices/:id/ping)
```

Deux directions :
1. **ESP32 → Backend** : envoyer des mesures avec patient_id déjà connu (Bearer token requis).
2. **Backend → ESP32** : pinger l'ESP32 pour vérifier qu'il est en ligne et récupérer son état (battery, firmware).

## 1. Authentification

Chaque `MeraDevice` a un `api_token` unique généré côté backend. Il est :
- Affiché à l'admin via le bouton « Voir le token » dans `/devices` (Appareils MERA).
- À flasher dans le firmware ESP32 lors de la configuration.
- Régénérable par l'admin (révoque l'ancien).

L'ESP32 envoie ce token dans chaque requête :

```http
Authorization: Bearer dev_uNPrjFjuHAafSdQhFEMszTkUMukd85GS
```

Code échec : `401 invalid_token` ou `401 missing_token`.

## 2. Authentification patient avec RFID

L'ESP32 est équipé d'un lecteur RFID. Lorsqu'un badge RFID est détecté :
1. L'ESP32 récupère l'UID du badge RFID
2. L'UID est utilisé pour interroger le backend et récupérer le `patient_id` associé (optionnel, sinon directement utiliser l'UID comme identifiant)
3. Une fois le patient identifié, l'acquisition des mesures peut commencer

**Note** : Le `/robot/scan` ne scanne plus les QR codes mais les badges RFID.

## 3. Envoyer les mesures (POST /robot/measurements)

Une fois le patient identifié, l'ESP32 envoie en un seul POST :
- Les vitales (T°, SpO2, pouls, poids, IMC)
- Les résultats oculaires (contagieux + non-contagieux)
- Optionnel : urgence calculée ou laissée au backend
- Optionnel : transcript vocal et recommandations IA embarquée

Le backend crée atomiquement (transaction Prisma) :
- 1× `DiagnosticSession` (status `en_attente_revue`)
- 1× `VitalSigns` (si au moins une vitale)
- 1× `ContagiousEyeResult` (si bloc `contagious` présent)
- 1× `NonContagiousEyeResult` (si bloc `non_contagious` présent)

**Calcul automatique de l'urgence** si non fournie :
- `CRITIQUE` : T° > 40, SpO2 < 90, pouls > 120
- `ELEVE` : `contagion_alert` = true, T° ≥ 38, SpO2 < 95
- `MODERE` : un diagnostic oculaire > 50%
- `NORMAL` sinon

**Requête**
```http
POST /robot/measurements
Authorization: Bearer <api_token>
Content-Type: application/json

{
  "patient_id": "cmp2qaqno0000ijbjzwiird6f",
  "temperature": 38.5,
  "spo2": 96,
  "heart_rate": 92,
  "weight": 24.5,
  "bmi": 17.2,
  "contagious": {
    "conjunctivitis_bacterial": 72.3,
    "conjunctivitis_viral": 12.1,
    "trachoma": 4.2,
    "blepharitis_infectious": 8.0,
    "contagion_alert": true
  },
  "non_contagious": {
    "cataract": 2.1,
    "myopia": 35.0
  },
  "recommendations": "Consultation ophtalmologique recommandée sous 48h",
  "vocal_transcript": "L'enfant signale une douleur oculaire depuis 3 jours"
}
```

**Réponse `201`**
```json
{
  "success": true,
  "session_id": "cmp2okvo10001ijdst72jqk4b",
  "urgency_level": "ELEVE",
  "timestamp": "2026-05-12T16:42:18.123Z"
}
```

**Effets de bord automatiques**
- `MeraDevice.last_sync` mis à jour, `status` → `en_ligne`
- Notification `urgent_case` envoyée à l'encadreur + médecins assignés si urgence ≥ `ELEVE`
- La session apparaît immédiatement dans la file `Revue médicale` du médecin

## 4. Heartbeat (POST /robot/heartbeat) — OBLIGATOIRE pour maintenir en ligne

L'ESP32 doit envoyer un heartbeat périodiquement (toutes les 30 secondes recommandé) pour signaler qu'il est actif.
Cela met à jour `MeraDevice.last_sync` et `status` → `en_ligne`.

Sans heartbeat régulier, l'appareil sera marqué comme `hors_ligne` après 2-3 minutes d'inactivité.

**Requête**
```http
POST /robot/heartbeat
Authorization: Bearer <api_token>
Content-Type: application/json

{
  "battery_pct": 87,
  "firmware": "1.2.0",
  "free_memory_kb": 256
}
```

**Réponse `200`**
```json
{
  "success": true,
  "timestamp": "2026-05-12T16:42:18.123Z"
}
```

## 5. Health check (GET /health côté ESP32)

## 5. Health check (GET /health côté ESP32)

C'est l'ESP32 qui doit exposer cet endpoint. Le backend l'appelle lors du ping.

**Endpoint à implémenter sur l'ESP32**
```http
GET /health
```

**Réponse attendue**
```json
{
  "ok": true,
  "serial_number": "MERA-DEMO-001",
  "battery_pct": 87,
  "firmware": "1.2.0",
  "uptime_sec": 12345
}
```

**Comportement côté backend** (`POST /devices/:id/ping`) :
1. Lit `device.ip_address` + `device.port` (défaut 80)
2. `fetch http://<ip>:<port>/health` avec timeout 3 secondes
3. Si succès → `status=en_ligne`, met à jour `battery_level` et `firmware_version` depuis la réponse
4. Si timeout/erreur → `status=hors_ligne`
5. Met à jour `last_sync` dans tous les cas
6. Renvoie le résultat au frontend

## 6. Exemple de firmware ESP32 (Arduino IDE / PlatformIO)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <MFRC522.h>  // Lecteur RFID (module RC522)
#include <SPI.h>

const char* WIFI_SSID  = "VotreSSID";
const char* WIFI_PASS  = "MotDePasse";
const char* API_BASE   = "http://192.168.1.10:4000";  // IP du backend MERA
const char* API_TOKEN  = "dev_uNPrjFjuHAafSdQhFEMszTkUMukd85GS";
const char* SERIAL_NUM = "MERA-DEMO-001";

WebServer server(80);

// ─── Configuration RFID ────────────────────────────────────
#define SS_PIN 5      // CS/SS pin
#define RST_PIN 17    // Reset pin
MFRC522 rfid(SS_PIN, RST_PIN);

// ─── Variables globales ────────────────────────────────────
unsigned long lastHeartbeat = 0;
const long HEARTBEAT_INTERVAL = 30000;  // 30 secondes
unsigned long bootTime = 0;

// ─── Endpoint /health exposé par l'ESP32 ──────────────────
void handleHealth() {
  StaticJsonDocument<256> doc;
  doc["ok"] = true;
  doc["serial_number"] = SERIAL_NUM;
  doc["battery_pct"] = 87;                    // remplacer par lecture ADC réelle
  doc["firmware"] = "1.2.0";
  doc["uptime_sec"] = (millis() - bootTime) / 1000;
  String body;
  serializeJson(doc, body);
  server.send(200, "application/json", body);
}

// ─── Helper POST authentifié vers le backend ──────────────
String apiPost(const String& path, const String& jsonBody) {
  HTTPClient http;
  http.begin(String(API_BASE) + path);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + API_TOKEN);
  int code = http.POST(jsonBody);
  String response = http.getString();
  Serial.printf("POST %s → HTTP %d\n", path.c_str(), code);
  http.end();
  return response;
}

// ─── Lire badge RFID et retourner l'UID ────────────────────
String readRFIDCard() {
  if (!rfid.PICC_IsNewCardPresent()) return "";
  if (!rfid.PICC_ReadCardSerial()) return "";
  
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  return uid;
}

// ─── Envoyer un heartbeat ──────────────────────────────────
void sendHeartbeat() {
  StaticJsonDocument<128> req;
  req["battery_pct"] = 87;              // lecture ADC réelle
  req["firmware"] = "1.2.0";
  req["free_memory_kb"] = ESP.getFreeHeap() / 1024;
  String body;
  serializeJson(req, body);
  apiPost("/robot/heartbeat", body);
}

// ─── Envoyer les mesures après acquisition ────────────────
void sendMeasurements(const String& patientId, float temp, int hr, int spo2, float weight, float bmi) {
  StaticJsonDocument<512> req;
  req["patient_id"] = patientId;
  req["temperature"] = temp;
  req["heart_rate"] = hr;
  req["spo2"] = spo2;
  req["weight"] = weight;
  req["bmi"] = bmi;
  
  // Exemple de résultats oculaires (à adapter selon votre pipeline IA)
  JsonObject contagious = req.createNestedObject("contagious");
  contagious["conjunctivitis_bacterial"] = 0;
  contagious["conjunctivitis_viral"] = 0;
  contagious["trachoma"] = 0;
  contagious["blepharitis_infectious"] = 0;
  contagious["contagion_alert"] = false;
  
  JsonObject nonContagious = req.createNestedObject("non_contagious");
  nonContagious["cataract"] = 0;
  nonContagious["pterygion"] = 0;
  nonContagious["uveitis"] = 0;
  nonContagious["jaundice"] = 0;
  nonContagious["myopia"] = 0;
  nonContagious["glaucoma"] = 0;
  nonContagious["diabetic_retinopathy"] = 0;
  
  String body;
  serializeJson(req, body);
  apiPost("/robot/measurements", body);
}

void setup() {
  Serial.begin(115200);
  bootTime = millis();
  
  // ─── WiFi ─────────────────────────────────────────────
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print("."); 
  }
  Serial.printf("\n✓ WiFi connecté → %s\n", WiFi.localIP().toString().c_str());

  // ─── RFID ─────────────────────────────────────────────
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("✓ Lecteur RFID initialisé");

  // ─── Web Server ────────────────────────────────────────
  server.on("/health", handleHealth);
  server.begin();
  Serial.println("✓ Web server démarré sur port 80");

  // ─── Premier heartbeat ─────────────────────────────────
  sendHeartbeat();
  lastHeartbeat = millis();
}

void loop() {
  server.handleClient();
  
  // ─── Heartbeat automatique toutes les 30 secondes ──────
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    Serial.println("→ Envoi heartbeat...");
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  // ─── Lecture badge RFID ────────────────────────────────
  String rfidUID = readRFIDCard();
  if (rfidUID.length() > 0) {
    Serial.printf("✓ Badge RFID lu : %s\n", rfidUID.c_str());
    
    // ─── Ici : acquisition des mesures (vitales + images) ──
    // Exemple simplifié :
    float temp = 37.5;
    int hr = 85;
    int spo2 = 98;
    float weight = 25.0;
    float bmi = 22.5;
    
    // ─── Envoyer au backend ────────────────────────────
    Serial.printf("→ Envoi mesures pour patient %s...\n", rfidUID.c_str());
    sendMeasurements(rfidUID, temp, hr, spo2, weight, bmi);
  }
  
  delay(100);  // Boucle non-bloquante
}
```

## 7. Résumé des endpoints (Synchronisation)

| Endpoint | Direction | Intervalle | But |
|----------|-----------|-----------|-----|
| `POST /robot/heartbeat` | ESP32 → Backend | 30s | Signaler que le robot est actif |
| `GET /health` | Backend → ESP32 | ~5min | Vérifier la santé du robot |
| `POST /robot/measurements` | ESP32 → Backend | À la demande | Envoyer les données d'une session |

**Endpoints du code Arduino synchronisés avec le Backend :**
- `POST /robot/heartbeat` → L'ESP32 l'appelle, le backend met à jour `last_sync` et `status`
- `GET /health` → L'ESP32 l'expose, le backend le requête via `POST /devices/:id/ping`
- `POST /robot/measurements` → L'ESP32 l'appelle, le backend crée une session

## 8. Erreurs courantes

| Code | Cause | Action ESP32 |
|---|---|---|
| `401 missing_token` / `invalid_token` | Bearer absent ou révoqué | Régénérer token côté admin + reflasher |
| `404 patient_not_found` | patient_id invalide | Vérifier l'UID du badge RFID saisi |
| `400 validation` | Body JSON mal formé | Vérifier la structure du payload |
| `400 no_address` (ping) | `device.ip_address` non configurée | Admin doit éditer l'appareil depuis l'UI |
| Timeout sur GET /health | ESP32 éteint ou autre réseau | Statut passe à `hors_ligne` automatiquement |

## 9. Limites et hypothèses

- **Même réseau** : le backend doit pouvoir joindre l'ESP32 sur le LAN (ou via NAT loopback). Pour un déploiement WAN, exposer l'ESP32 via VPN ou utiliser le pattern heartbeat.
- **Pas de TLS** sur l'ESP32 pour l'instant — `http://` only. À considérer si déploiement hors LAN.
- **Un appareil = un token** : pour gérer plusieurs robots, créer plusieurs `MeraDevice` dans `/admin` (chaque token est unique).
- **Authentification RFID** : l'ESP32 scanne des badges RFID et utilise directement l'UID comme `patient_id` ou le remet au backend pour récupérer le `patient_id` associé.
- **Heartbeat OBLIGATOIRE** : sans heartbeat régulier (30s), l'appareil sera marqué comme `hors_ligne` après 2-3 minutes.