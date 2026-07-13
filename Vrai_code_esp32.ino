// ============================================================
// ⚠️ CONFIGURATION TFT COMPLÈTE - AVANT TOUS LES INCLUDES !
// ============================================================
#define USER_SETUP_LOADED
#define ILI9488_DRIVER
// Broches TFT selon votre branchement
#define TFT_MISO 19
#define TFT_MOSI 23
#define TFT_SCLK 18
#define TFT_CS 5
#define TFT_DC 17
#define TFT_RST -1  // Connecté à EN (broche reset ESP32)
#define TOUCH_CS 16
// Configuration SPI optimisée
#define SPI_FREQUENCY 40000000
#define SPI_READ_FREQUENCY 16000000
#define SPI_TOUCH_FREQUENCY 2500000
// Rétroéclairage - BROCHE CRITIQUE
#define TFT_BL 14
#define TFT_BL_ON HIGH
// Polices
#define LOAD_GLCD
#define LOAD_FONT2
#define LOAD_FONT4
#define LOAD_FONT6
#define LOAD_FONT7
#define LOAD_FONT8
#define LOAD_GFXFF
#define SMOOTH_FONT
// ============================================================
// INCLUDES
// ============================================================
#include <TB_TFT_eSPI.h>
#include <MAX30105.h>
#include <heartRate.h>
#include <Adafruit_MLX90614.h>
// ✅ BALANCE BLE — écoute des annonces Bluetooth de la balance connectée
#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <Wire.h>
#include <SPI.h>
// ============================================================
// CONFIGURATION MATÉRIELLE - CORRIGÉE ✅
// ============================================================
// ✅ BALANCE BLE — on écoute les annonces BLE diffusées par la balance
#define BALANCE_BLE_MAC "98:f6:7a:66:58:4e"  // MAC de la balance (en minuscules)
// ✅ COMMUNICATION UART AVEC ESP32 ESCLAVE RFID
#define UART_RFID_RX 16   // Reception depuis ESP32 esclave
#define UART_RFID_TX 17   // Transmission vers ESP32 esclave
#define BUZZER_PIN 32
// ============================================================
// CONFIGURATION WiFi & SERVEUR - MODIFIÉE ✅
// ============================================================
char WIFI_SSID[32] = "MERA";
char WIFI_PASS[64] = "695DD4FB";
// === URLs DES APIs - UTILISATION DE L'API ARDUINO DÉDIÉE ===
// URLs MERA backend (anciennes API PHP supprimées)
// ⭐⭐ NOUVELLE API MERA v2.0 - HEARTBEAT ⭐⭐
const String API_MERA_BASE = "https://mera-app.onrender.com";  // Backend MERA Render (production)
const String API_MERA_HEARTBEAT = API_MERA_BASE + "/api/robot/heartbeat";
const String API_MERA_TOKEN = "REMPLACER_PAR_LE_TOKEN_DU_DEVICE";  // Token ESP32 - À obtenir depuis l'admin
const String API_MERA_MEASUREMENTS = API_MERA_BASE + "/api/robot/measurements";
const String API_MERA_LOOKUP = API_MERA_BASE + "/api/robot/lookup";
const String API_MERA_ATTENDANCE = API_MERA_BASE + "/api/robot/attendance";
// ⭐⭐ PC LOCAL - IP À MODIFIER
const char* PC_AUDIO_IP = "192.168.1.110";  // ⚠️ À CHANGER : IP de votre PC sur le réseau
const int PC_AUDIO_PORT = 5000;
// RASPBERRY PI (pour capture oculaire)
const char* RASPBERRY_IP = "192.168.1.110";  // À CONFIGURER: IP de la Raspberry sur votre réseau
const int RASPBERRY_PORT = 5000;
bool WIFI_ENABLED = true;
// ============================================================
// CODES AUDIO - COMMUNICATION ESP32 ↔ PC FEDORA
// ============================================================
enum AudioCode {
AUDIO_BADGE = 1,           // 001.mp3 - "Bienvenue. Scanner votre carte..."
AUDIO_YEUX = 2,            // 002.mp3 - "Analyse oculaire..."
AUDIO_RYTHME = 3,          // 003.mp3 - "Posez votre doigt sur capteur..."
AUDIO_TEMPERATURE = 4,     // 004.mp3 - "Capteur de température..."
AUDIO_POIDS = 5,           // 005.mp3 - "Montez sur la balance..."
AUDIO_FIN = 6              // 006.mp3 - "Merci. Bilan terminé..."
};
// ============================================================
// NOTES MUSICALES (Hz)
// ============================================================
#define NOTE_C4 262
#define NOTE_D4 294
#define NOTE_E4 330
#define NOTE_F4 349
#define NOTE_G4 392
#define NOTE_A4 440
#define NOTE_B4 494
#define NOTE_C5 523
#define NOTE_D5 587
#define NOTE_E5 659
#define NOTE_F5 698
#define NOTE_G5 784
#define NOTE_REST 0
// ============================================================
// CONSTANTES SYSTÈME - OPTIMISÉES POUR STABILITÉ ✅
// ============================================================
const unsigned long TIMEOUT_ETAT = 60000;
const unsigned long DELAI_AFFICHAGE = 15000;
const unsigned long DELAI_ANTI_REBOND_RFID = 2000;
const unsigned long WIFI_TIMEOUT = 10000;
const unsigned long SERVER_TIMEOUT = 5000;
const int MAX_RETRY_SEND = 3;
const int MAX_QUEUE_SIZE = 20;
// ✅ PARAMÈTRES OPTIMISÉS POUR STABILITÉ
const unsigned long DELAI_MESURE_POIDS = 5000;
const unsigned long DELAI_AFFICHAGE_RESULTATS = 8000;
const float SEUIL_POIDS_DETECTION = 5.0;  // 2 kg au lieu de 2000 g
const float CONVERSION_KG = 1000.0;
const int SEUIL_BPM_MIN = 40;
const int SEUIL_BPM_MAX = 200;
const int SEUIL_IR_DOIGT = 15000;
// Paramètres BPM/SpO2 - JUSTE MILIEU (ni trop rapide, ni trop lent)
const int NOMBRE_MESURES_STABLES_REQUIS = 2;     // 2 mesures stables (équilibré)
const int TOLERANCE_BPM = 8;                     // ±8 BPM
const unsigned long TEMPS_MIN_MESURE_BPM = 3000; // 3.0s minimum (équilibré)
const unsigned long TEMPS_MAX_MESURE_BPM = 12000;// 12s timeout
// Paramètres de stabilisation du poids
const float VARIATION_MAX_STABILITE = 0.15;      // ±150 g
const unsigned long TEMPS_STABILITE_REQUIS = 1200; // 1.2 s de stabilité réelle
const int NOMBRE_LECTURES_STABILITE = 5;
// Paramètres température
const float TEMPERATURE_NORMALE_MIN = 36.1;
const float TEMPERATURE_NORMALE_MAX = 37.2;
const float TEMPERATURE_FIEVRE_LEGERE = 37.5;
const float TEMPERATURE_FIEVRE = 38.0;
const float SPO2_ALPHA = 0.95;
// 🩸 ALGORITHME PULSEOX MAX30102 - CONSTANTES ÉQUILIBRÉES
// Buffer de 6 échantillons : assez court pour rester réactif, assez long pour lisser
// les artefacts (mouvement du doigt, variations d'amplitude) et rester en SpO2 réel.
const int SPO2_BUFFER_SIZE = 6;
// Formule polynomiale : SpO2 = A + B*Ratio² (calibration empirique MAX30102)
// A=110, B=-18 donne une plage 90-100 % pour un doigt bien posé (R≈0.4-0.7)
const float SPO2_COEFF_A = 110.0;
const float SPO2_COEFF_B = -18.0;
const float SPO2_DC_ALPHA = 0.95;  // Baseline IR/RED lente (50-100 ms d'inertie)
const float SPO2_AC_ALPHA = 0.30;  // Composante AC = pulsations
const int   SPO2_MIN_PHYSIO = 90;  // Borne basse réaliste pour un sujet sain
const int   SPO2_MAX_PHYSIO = 100; // Borne haute physiologique
const int   SPO2_MIN_BEATS_BEFORE_VALID = 6; // ≥6 battements pour valider SpO2
// 🫀 ALGORITHME BEAT FINDER PRO - CONSTANTES
const int BPM_BUFFER_SIZE = 6;     // Historique pour moyenne pondérée
const float KALMAN_PROCESS_NOISE = 1.0;  // Q (processus)
const float KALMAN_MEASUREMENT_NOISE = 2.0;  // R (mesure)
const int BEAT_PATTERN_MIN = 200;   // Temps min entre 2 beats (ms)
const int BEAT_PATTERN_MAX = 1800;  // Temps max entre 2 beats (ms)
const float TOLERANCE_ADAPTATIVE_FACTOR = 0.15;  // 15% de variabilité
// 🏋️ CONSTANTES BALANCE BLE (réception du poids par annonces Bluetooth)
const float BLE_WEIGHT_MIN = 10.0;                 // Poids min valide (scanner Python)
const float BLE_WEIGHT_MAX = 300.0;                // Poids max valide
const float BLE_WEIGHT_STABLE_TOL = 0.3;           // ±300 g pour considérer stable
const int   BLE_WEIGHT_STABLE_COUNT = 5;           // 5 lectures stables consécutives
const unsigned long WEIGHT_TIMEOUT_DETECTION = 30000; // 30 s pour monter sur la balance
const unsigned long WEIGHT_TIMEOUT_TOTAL = 45000;     // 45 s timeout absolu
const float WEIGHT_MIN_PHYSIO = 5.0;               // Poids minimal physiologique (kg)
const float WEIGHT_MAX_PHYSIO = 250.0;             // Poids maximal physiologique (kg)
const int MAX_ETUD = 50;
const int EEPROM_SIZE = 4096;
const int EEPROM_MAGIC = 0xCAFE;
// ✅ NOUVELLE RÉSOLUTION 480x320
const int SCREEN_W = 480;
const int SCREEN_H = 320;
// ============================================================
// COULEURS
// ============================================================
#define BACKGROUND_COLOR 0x18E0
#define PRIMARY_COLOR 0x07FF
#define SECONDARY_COLOR 0xFD20
#define SUCCESS_COLOR 0x3666
#define WARNING_COLOR 0xFD20
#define ERROR_COLOR 0xF9A6
#define TEXT_COLOR 0xFFFF
#define HIGHLIGHT_COLOR 0xFD20
#define TEMP_NORMAL_COLOR 0x3666
#define TEMP_WARNING_COLOR 0xFD20
#define TEMP_HIGH_COLOR 0xF9A6
// ============================================================
// OBJETS GLOBAUX
// ============================================================
TFT_eSPI tft = TFT_eSPI();
MAX30105 particleSensor;
// (Balance : plus de HX711 — le poids arrive par BLE, cf. section « BALANCE BLE »)
Adafruit_MLX90614 mlx = Adafruit_MLX90614();
// ✅ COMMUNICATION UART AVEC ESP32 ESCLAVE RFID
HardwareSerial RFIDSerial(2); // UART2
// ============================================================
// STRUCTURES DE DONNÉES AMÉLIORÉES ✅
// ============================================================
struct Etudiant {
int id;
char uid[20];
char nom[30];
char prenom[30];
char classe[15];
char role[15];
bool actif;
};
struct DonneesBiometriques {
int bpm = 0;
int bpmStable = 0;
int spo2 = 0;
int spo2Stable = 0;
float poids = 0;
float temperature = 0;
float temperatureStable = 0;
float temperatureAmbiante = 0;  // 🌡️ Température ambiante pour logs
bool donneesValides = false;
unsigned long timestamp;
};
struct EtatCapteurs {
bool doigtPresent = false;
bool poidsStable = false;
bool temperatureStable = false;
bool balanceActif = false;
bool max30102Actif = false;
bool mlx90614Actif = false;
bool nouvelleLecturePoids = false;
byte ledBright;
long lastIR;
};
struct Configuration {
float calFactor = 22.60f;
float seuilPoidsDetection = 5.0;
int seuilBpmMin = 40;
int seuilBpmMax = 200;
int seuilIrDoigt = 15000;
unsigned long delaiMesurePoids = 5000;
unsigned long delaiAffichageResultats = 8000;
};
struct WiFiStatus {
bool connected = false;
bool enabled = false;
int signalStrength = 0;
unsigned long lastCheck = 0;
};
struct MesureEnAttente {
char uid[20];
char nom[30];
char prenom[30];
char classe[15];
int bpm, spo2;
float temp, poids;
unsigned long timestamp;
int tentatives;
bool actif;
};
// ============================================================
// RÉSULTATS OCULAIRES - STRUCTURE ✅
// ============================================================
struct ResultatsOculaires {
char oeil_gauche[30] = "";        // Ex: "Sain", "Cataracte", etc.
float oeil_gauche_conf = 0.0;    // Confiance 0-1
char oeil_droit[30] = "";         // Ex: "Sain", "Cataracte", etc.
float oeil_droit_conf = 0.0;     // Confiance 0-1
int alerte = 0;                   // 1 si anomalie détectée
bool disponibles = false;         // Résultats reçus du serveur
unsigned long timestamp = 0;
};
// ============================================================
// VARIABLES GLOBALES OPTIMISÉES ✅
// ============================================================
enum Etat {
BADGE,
BIENVENUE,
RYTHME_CARDIAQUE,
TEMPERATURE,
POIDS,
AFFICHAGE
};
Etat etatActuel = BADGE;
// ⭐⭐ SUPPRIMER le cache EEPROM
Etudiant etudActuel;  // Un seul étudiant à la fois
// Variables inchangées...
DonneesBiometriques donnees;
EtatCapteurs etatCapteurs;
Configuration config;
WiFiStatus wifiStat;
MesureEnAttente queue[MAX_QUEUE_SIZE];
int queueSize = 0;
// ⭐⭐ SESSION RASPBERRY API - EYE DISEASE DETECTION
char sessionRaspberryId[50] = "";      // ID session retourné par Raspberry
unsigned long debutCaptureyeux = 0;    // Timestamp début capture
bool captureOeuxEnCours = false;       // Flag capture en cours
ResultatsOculaires resultatOeux;       // Résultats finaux oculaires
// Time management
unsigned long tempsDebutEtat = 0;
unsigned long dernierUpdateAffichage = 0;
// Pulse sensor variables - AMÉLIORÉ
const byte RATE_SIZE = 12;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
unsigned long dernierAffichageIR = 0;
// 🫀 VARIABLES POUR ALGORITHME PULSEOX OPTIMISÉ
float spo2Buffer[SPO2_BUFFER_SIZE];  // Historique SpO2 (8 dernières mesures)
int spo2BufferIndex = 0;            // Index du buffer
float irDC = 0, irAC = 0;           // Composantes DC/AC du signal IR
float redDC = 0, redAC = 0;         // Composantes DC/AC du signal RED
float dernierIRValue = 0, dernierRedValue = 0;  // Dernières valeurs pour delta
int spo2Counter = 0;                // Compteur pour décimation
// Variables améliorées pour stabilité BPM
int compteurMesuresStables = 0;
int dernierBPMValide = 0;
// 🫀 VARIABLES POUR ALGORITHME BEAT FINDER PRO
float bpmBuffer[BPM_BUFFER_SIZE] = {0};  // Historique 6 valeurs BPM (dernière 10s)
int bpmBufferIndex = 0;                  // Index circulaire du buffer
float kalmanState = 0;                   // État estimé du filtre Kalman (BPM filtré)
float kalmanCovariance = 1.0;            // Incertitude du Kalman (covariance)
long lastBeatTime = 0;                   // Timestamp du dernier beat détecté (ms)
float bpmVariance = 0;                   // Variance des BPM récentes (pour adaptatif)
int beatPatternCount = 0;                // Nombre de beats valides consécutifs
float adaptativeTolerance = 10.0;        // TOLERANCE_BPM adaptatif (initialisation)
long detectionStartTime = 0;             // Timestamp début détection rapide (0.5-1s)
unsigned long debutMesureStable = 0;
bool mesureEnCours = false;
// 🏋️ VARIABLES BALANCE BLE (réception du poids par annonces Bluetooth)
BLEScan* pBLEScan = nullptr;                 // Objet scan BLE
volatile float bleWeightValue = 0;           // Dernier poids reçu (kg)
volatile bool  bleWeightNew = false;         // Nouveau poids disponible ?
volatile unsigned long bleLastRx = 0;        // Timestamp dernière réception BLE
bool  balanceScanActive = false;             // Scan BLE en cours ?
float bleStableRef = 0;                      // Référence pour le test de stabilité
int   bleStableCount = 0;                    // Lectures stables consécutives
unsigned long debutMesurePoids = 0;          // Timer global de l'étape POIDS
bool  utilisateurDetecte = false;            // Présence détectée sur la balance

// ⭐⭐⭐ HEARTBEAT VERS BACKEND MERA - NOUVELLES ✅
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000;  // Envoyer heartbeat toutes les 30 secondes

// Variables pour température
unsigned long derniereLectureTemperature = 0;
const unsigned long INTERVALLE_LECTURE_TEMP = 300;
float historiqueTemperature[5];
int indexHistoriqueTemperature = 0;
unsigned long debutStabilisationTemp = 0;
bool stabilisationTempEnCours = false;
// RFID et communication
unsigned long tRFID = 0;
String inBuf = "";
bool modeAdd = false, modeWiFiConfig = false;
int etapeAdd = 0, etapeWiFi = 0;
char newUID[20], newNom[30], newPrenom[30], newClasse[15];
char tempSSID[32], tempPass[64], tempURL[128];
// ============================================================
// FORWARD DECLARATIONS - BEAT FINDER PRO
void reinitialiserBufferSpO2();
float filtreKalmanBPM(float bpmMesu);
bool estBeatValide(long timeSinceLast);
float calculerToleranceAdaptative();
void reinitialiserBPMAlgorithme();
// FORWARD DECLARATIONS - BALANCE BLE
void demarrerScanBalance();
void arreterScanBalance();
void reinitialiserPoids();
// FONCTIONS JSON - MERA BACKEND (plus d'ancienne API PHP)
// ============================================================
// DÉCLARATIONS FONCTIONS
// ============================================================
void beep(int freq, int duration);
void beepOK();
void reinitialiserBufferSpO2();  // Forward declaration for SpO2 algorithm
// ============================================================
// COMMUNICATION UART AVEC ESP32 ESCLAVE RFID
// ============================================================
void initRFIDSerial() {
RFIDSerial.begin(115200, SERIAL_8N1, UART_RFID_RX, UART_RFID_TX);
Serial.println("[UART] ✅ Communication RFID initialisée (RX=" + String(UART_RFID_RX) + ", TX=" + String(UART_RFID_TX) + ")");
}
String readRFIDSerial() {
if (RFIDSerial.available()) {
String message = RFIDSerial.readStringUntil('\n');
message.trim();
if (message.startsWith("UID:")) {
String uid = message.substring(4);
Serial.println("[RFID] 📨 UID reçu: " + uid);
return uid;
}
else if (message == "ESCLAVE_READY") {
Serial.println("[RFID] ✅ ESP32 esclave prêt");
}
else if (message.startsWith("RFID_VERSION:")) {
Serial.println("[RFID] " + message);
}
else if (message.startsWith("ERREUR:")) {
Serial.println("[RFID] ❌ " + message);
}
else if (message == "SANTE:OK") {
static unsigned long lastHealth = 0;
if (millis() - lastHealth > 25000) {
Serial.println("[RFID] 💚 ESP32 esclave en bonne santé");
lastHealth = millis();
}
}
}
return "";
}
bool sendCommand(const String& command, unsigned long timeout = 2000) {
Serial.println("[UART] 📤 Envoi commande: " + command);
RFIDSerial.println(command);
unsigned long start = millis();
while (millis() - start < timeout) {
if (RFIDSerial.available()) {
String response = RFIDSerial.readStringUntil('\n');
response.trim();
Serial.println("[UART] 📥 Réponse: " + response);
return true;
}
delay(10);
}
Serial.println("[UART] ❌ Timeout - Pas de réponse");
return false;
}
// ============================================================
// RFID - VERSION UART AVEC ESP32 ESCLAVE
// ============================================================
bool readBadge(char* buf) {
if (millis() - tRFID < DELAI_ANTI_REBOND_RFID) return false;
String uid = readRFIDSerial();
if (uid.length() > 0) {
strncpy(buf, uid.c_str(), 19);
buf[19] = 0;
tRFID = millis();
beepBadgeDetected();
return true;
}
return false;
}
void initRFID() {
Serial.println("\n[RFID] === INITIALISATION COMMUNICATION ESP32 ESCLAVE ===");
initRFIDSerial();
delay(1000);
Serial.println("[RFID] ⏳ Attente de l'ESP32 esclave...");
unsigned long start = millis();
bool esclavePret = false;
while (millis() - start < 10000) {
String message = readRFIDSerial();
if (message == "ESCLAVE_READY") {
esclavePret = true;
break;
}
delay(100);
}
if (esclavePret) {
Serial.println("[RFID] ✅ ESP32 esclave connecté et opérationnel");
beepOK();
} else {
Serial.println("[RFID] ⚠️ ESP32 esclave non détecté - Mode offline");
beepWarning();
}
Serial.println();
}
// ============================================================
// FONCTIONS D'INITIALISATION AVEC DEBUG
// ============================================================
void initTFT() {
Serial.println("\n[TFT] === INITIALISATION ÉCRAN 480x320 ===");
if (TFT_BL >= 0) {
pinMode(TFT_BL, OUTPUT);
digitalWrite(TFT_BL, TFT_BL_ON);
Serial.println("[TFT] ✅ Rétroéclairage activé sur GPIO " + String(TFT_BL));
} else {
Serial.println("[TFT] ⚠️ LED connecté directement à 3.3V (toujours allumé)");
}
delay(200);
tft.init();
Serial.println("[TFT] ✅ Init TFT OK");
delay(100);
tft.setRotation(3);
Serial.println("[TFT] ✅ Rotation 3 (paysage 480x320)");
delay(100);
pinMode(TOUCH_CS, OUTPUT);
digitalWrite(TOUCH_CS, HIGH);
tft.fillScreen(BACKGROUND_COLOR);
Serial.println("[TFT] ✅ Initialization terminée - Résolution 480x320\n");
}
void initI2C() {
Serial.println("[I2C] Initialization bus I2C (SDA=21, SCL=22)...");
Wire.begin(21, 22);
Wire.setClock(400000);
Serial.println("[I2C] ✅ Bus I2C OK (400kHz)");
}
void initBuzzer() {
Serial.println("[BUZZER] Initialization buzzer...");
pinMode(BUZZER_PIN, OUTPUT);
digitalWrite(BUZZER_PIN, LOW);
Serial.println("[BUZZER] ✅ Buzzer OK sur GPIO " + String(BUZZER_PIN));
}
void initConfig() {
Serial.println("[CONFIG] Configuration système...");
// ✅ Utilisez directement le calFactor en kg (PAS de multiplication par 1000)
config.calFactor = 22.60f;  // Valeur directe pour kg
config.seuilPoidsDetection = 5.0;  // ✅ Réduit à 2 kg pour meilleure détection
config.seuilBpmMin = 40;
config.seuilBpmMax = 200;
config.seuilIrDoigt = 15000;
config.delaiMesurePoids = 5000;
config.delaiAffichageResultats = 8000;
Serial.println("[CONFIG] ✅ Configuration par défaut chargée");
Serial.println("[CONFIG] CalFactor: " + String(config.calFactor));
}
// ============================================================
// BUZZER - MÉLODIES ET SONS
// ============================================================
void beep(int freq, int duration) {
if (freq > 0) {
tone(BUZZER_PIN, freq, duration);
}
delay(duration);
noTone(BUZZER_PIN);
}
void beepOK() {
beep(NOTE_C5, 100);
delay(50);
beep(NOTE_E5, 100);
}
void beepError() {
beep(NOTE_E4, 150);
delay(50);
beep(NOTE_C4, 150);
}
void beepWarning() {
beep(NOTE_G4, 100);
delay(50);
beep(NOTE_G4, 100);
}
void beepBadgeDetected() {
beep(NOTE_G5, 80);
delay(30);
beep(NOTE_C5, 80);
}
void beepMesureComplete() {
beep(NOTE_C5, 100);
delay(30);
beep(NOTE_E5, 100);
delay(30);
beep(NOTE_G5, 150);
}
void melodieStartup() {
int melody[] = { NOTE_C4, NOTE_E4, NOTE_G4, NOTE_C5 };
int durations[] = { 150, 150, 150, 300 };
for (int i = 0; i < 4; i++) {
beep(melody[i], durations[i]);
delay(50);
}
}
void melodieSuccess() {
int melody[] = { NOTE_C5, NOTE_D5, NOTE_E5, NOTE_F5, NOTE_G5 };
int durations[] = { 100, 100, 100, 100, 200 };
for (int i = 0; i < 5; i++) {
beep(melody[i], durations[i]);
delay(30);
}
}
void melodieAlert() {
for (int i = 0; i < 3; i++) {
beep(NOTE_A4, 100);
delay(100);
}
}
// ============================================================
// UTILITAIRES
// ============================================================
String tronc(const String& s, int max) {
return (s.length() <= max) ? s : s.substring(0, max - 3) + "...";
}
void clear(int x, int y, int w, int h) {
tft.fillRect(x, y, w, h, BACKGROUND_COLOR);
}
bool timeout() {
return (millis() - tempsDebutEtat > TIMEOUT_ETAT);
}
// ============================================================
// WIFI
// ============================================================
bool initWiFi() {
if (!WIFI_ENABLED) {
Serial.println("[WIFI] WiFi désactivé");
return false;
}
Serial.println("[WIFI] Connexion à: " + String(WIFI_SSID));
WiFi.mode(WIFI_STA);
// Configuration IP statique
IPAddress local_IP(192, 168, 1, 109);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress primaryDNS(8, 8, 8, 8);   // DNS Google
IPAddress secondaryDNS(8, 8, 4, 4); // DNS Google secondaire
if (!WiFi.config(local_IP, gateway, subnet, primaryDNS, secondaryDNS)) {
Serial.println("[WIFI] ⚠️ Échec configuration IP statique");
}
WiFi.begin(WIFI_SSID, WIFI_PASS);
unsigned long start = millis();
int dots = 0;
while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT) {
delay(200);  // ✅ Réduit de 500 à 200ms
yield();     // ✅ CRUCIAL: Laisser le watchdog respirer
Serial.print(".");
dots++;
if (dots > 20) {
Serial.println();
dots = 0;
}
}
Serial.println();
if (WiFi.status() == WL_CONNECTED) {
wifiStat.connected = true;
wifiStat.enabled = true;
wifiStat.signalStrength = WiFi.RSSI();
Serial.println("[WIFI] ✅ Connecté - IP: " + WiFi.localIP().toString());
beepOK();
delay(500);  // Petit délai avant audio
envoyerSignalAudio(AUDIO_BADGE);  // 📢 001.mp3 après WiFi
return true;
} else {
wifiStat.connected = false;
Serial.println("[WIFI] ⚠️ Échec connexion - Mode offline");
beepWarning();
return false;
}
}
// ============================================================
// FONCTION : ENVOYER SIGNAL AUDIO AU PC FEDORA
// ============================================================
bool envoyerSignalAudio(AudioCode code) {
if (!wifiStat.connected) {
Serial.println("[AUDIO] ⚠️ WiFi non connecté - audio ignoré");
return false;
}
HTTPClient http;
String url = "http://" + String(PC_AUDIO_IP) + ":" + String(PC_AUDIO_PORT) + "/play_audio";
Serial.println("[AUDIO] 📢 Envoi signal audio " + String(code) + " au PC Fedora");
http.begin(url);
http.setTimeout(2000);  // Timeout 2 secondes
http.addHeader("Content-Type", "application/json");
String jsonPayload = "{\"audio_code\":" + String(code) + "}";
int httpCode = http.POST(jsonPayload);
if (httpCode == 200) {
Serial.println("[AUDIO] ✅ Signal reçu par le PC");
http.end();
return true;
} else {
Serial.println("[AUDIO] ❌ Échec (code: " + String(httpCode) + ")");
http.end();
return false;
}
}
// ============================================================
// FONCTION : ENVOYER HEARTBEAT AU BACKEND MERA ⭐⭐⭐
// ============================================================
bool sendHeartbeat() {
if (!wifiStat.connected) {
Serial.println("[HEARTBEAT] ⚠️ WiFi non connecté - heartbeat ignoré");
return false;
}
HTTPClient http;
Serial.println("[HEARTBEAT] 💓 Envoi heartbeat au backend MERA...");
http.begin(API_MERA_HEARTBEAT);
http.setTimeout(3000);  // Timeout 3 secondes
http.addHeader("Content-Type", "application/json");
http.addHeader("Authorization", "Bearer " + API_MERA_TOKEN);

// Préparer le JSON
StaticJsonDocument<256> doc;
doc["battery_pct"] = 87;  // TODO: Lire ADC réel pour batterie
doc["firmware"] = "5.3";
doc["free_memory_kb"] = ESP.getFreeHeap() / 1024;

String jsonPayload;
serializeJson(doc, jsonPayload);

int httpCode = http.POST(jsonPayload);
Serial.println("[HEARTBEAT] Réponse: HTTP " + String(httpCode));

if (httpCode == 200) {
Serial.println("[HEARTBEAT] ✅ Heartbeat accepté par MERA");
http.end();
return true;
} else {
Serial.println("[HEARTBEAT] ❌ Heartbeat échoué (code: " + String(httpCode) + ")");
String response = http.getString();
Serial.println("[HEARTBEAT] Réponse serveur: " + response);
http.end();
return false;
}
}

void checkWiFi() {
if (!wifiStat.enabled) return;
if (millis() - wifiStat.lastCheck > 30000) {
if (WiFi.status() == WL_CONNECTED) {
wifiStat.connected = true;
wifiStat.signalStrength = WiFi.RSSI();
} else {
wifiStat.connected = false;
Serial.println("[WIFI] ⚠️ WiFi perdu - Reconnexion...");
initWiFi();
}
wifiStat.lastCheck = millis();
}
}
// ============================================================
// SERVEUR - FONCTIONS MODIFIÉES ✅
// ============================================================
bool rechercherPatientMERA(const char* card_id, Etudiant* res) {
if (!wifiStat.connected) return false;
HTTPClient http;
String url = API_MERA_LOOKUP;
http.begin(url);
http.addHeader("Content-Type", "application/json");
http.addHeader("Authorization", "Bearer " + API_MERA_TOKEN);
http.setTimeout(SERVER_TIMEOUT);

StaticJsonDocument<128> doc;
doc["card_id"] = card_id;
String jsonData;
serializeJson(doc, jsonData);

Serial.println("[MERA] 🔍 Recherche carte card_id=" + String(card_id));
int code = http.POST(jsonData);
Serial.println("[MERA] 📥 Code HTTP: " + String(code));

if (code == 200) {
String payload = http.getString();
DynamicJsonDocument resp(1024);
DeserializationError err = deserializeJson(resp, payload);
if (!err && resp["success"] == true) {
JsonObject p = resp["patient"];
res->id = 1;  // ID interne pour Raspberry (non utilisé par MERA)

// Stocker le rôle (patient, encadreur, medecin, admin)
String role = resp["role"].as<String>();
role.toCharArray(res->role, 14);

// Séparer prénom/nom à partir du full_name
String full = p["full_name"].as<String>();
int space = full.indexOf(' ');
if (space > 0) {
full.substring(0, space).toCharArray(res->prenom, 29);
full.substring(space + 1).toCharArray(res->nom, 29);
} else {
full.toCharArray(res->prenom, 29);
res->nom[0] = 0;
}

if (role == "patient") {
strncpy(res->classe, "Patient", 14);
} else {
strncpy(res->classe, "Staff", 14);
}
res->actif = true;
Serial.println("[MERA] ✅ Carte reconnue: " + String(res->prenom) + " " + String(res->nom) + " (" + role + ")");
http.end();
return true;
}
}
String response = http.getString();
Serial.println("[MERA] ❌ Carte non enregistrée: " + response);
http.end();
return false;
}
// ============================================================
// RASPBERRY PI API - DÉTECTION MALADIES DES YEUX ✅
// ============================================================
// Fonction 1: POST /api/capture - Lance la capture + analyse
bool lancerCaptureOeuxRaspberry(int patient_id) {
if (!wifiStat.connected) {
Serial.println("[RASPBERRY] ❌ WiFi déconnecté");
return false;
}
HTTPClient http;
String url = String("http://") + String(RASPBERRY_IP) + ":" + String(RASPBERRY_PORT) + "/api/capture";
http.begin(url);
http.addHeader("Content-Type", "application/json");
http.setTimeout(SERVER_TIMEOUT);
// Créer JSON: {"patient_id": 123}
DynamicJsonDocument doc(128);
doc["patient_id"] = patient_id;
String jsonData;
serializeJson(doc, jsonData);
Serial.println("[RASPBERRY] 📤 POST /api/capture");
Serial.println("[RASPBERRY] Données: " + jsonData);
int code = http.POST(jsonData);
Serial.println("[RASPBERRY] 📥 Code HTTP: " + String(code));
if (code == 202 || code == 200) {
String response = http.getString();
response.trim();
Serial.println("[RASPBERRY] 📄 Réponse: " + response);
DynamicJsonDocument respDoc(256);
DeserializationError err = deserializeJson(respDoc, response);
if (!err && respDoc["status"] == "processing") {
// Récupérer la session_id
String sessionId = respDoc["session_id"].as<String>();
sessionId.toCharArray(sessionRaspberryId, sizeof(sessionRaspberryId));
captureOeuxEnCours = true;
debutCaptureyeux = millis();
Serial.println("[RASPBERRY] ✅ Capture lancée - Session ID: " + String(sessionRaspberryId));
beepOK();
http.end();
return true;
} else {
Serial.println("[RASPBERRY] ❌ Réponse inattendue");
}
} else {
Serial.println("[RASPBERRY] ❌ Erreur HTTP: " + String(code));
}
http.end();
beepError();
return false;
}
// Fonction 2: GET /api/results/<session_id> - Récupère les résultats
bool obtenirResultatsOeuxRaspberry(char* sessionId) {
if (!wifiStat.connected) {
return false;
}
HTTPClient http;
String url = String("http://") + String(RASPBERRY_IP) + ":" + String(RASPBERRY_PORT) + "/api/results/" + String(sessionId);
http.begin(url);
http.setTimeout(SERVER_TIMEOUT);
Serial.println("[RASPBERRY] 🔄 GET /api/results/" + String(sessionId));
int code = http.GET();
Serial.println("[RASPBERRY] 📥 Code HTTP: " + String(code));
if (code == 200) {
String response = http.getString();
response.trim();
DynamicJsonDocument respDoc(512);
DeserializationError err = deserializeJson(respDoc, response);
if (!err) {
String status = respDoc["status"].as<String>();
// [NEW] Signal de capture terminee - faire un bip pour signaler a l'utilisateur
if (respDoc.containsKey("capture_done") && respDoc["capture_done"].as<bool>() == true) {
Serial.println("[RASPBERRY] [CAPTURE DONE] Bip! L'utilisateur peut retirer ses yeux");
beepOK();  // Bip sonore pour indiquer fin de capture
}
if (status == "completed") {
// Résultats disponibles!
if (respDoc.containsKey("oeil_1")) {
respDoc["oeil_1"]["classe"].as<String>().toCharArray(resultatOeux.oeil_gauche, sizeof(resultatOeux.oeil_gauche));
// Parser le pourcentage: "94.83%" -> 94.83
String confStr = respDoc["oeil_1"]["confiance"].as<String>();
confStr.replace("%", ""); // Enlever le %
resultatOeux.oeil_gauche_conf = confStr.toFloat() / 100.0;  // Convertir en 0-1
}
if (respDoc.containsKey("oeil_2")) {
respDoc["oeil_2"]["classe"].as<String>().toCharArray(resultatOeux.oeil_droit, sizeof(resultatOeux.oeil_droit));
// Parser le pourcentage: "89.40%" -> 89.40
String confStr = respDoc["oeil_2"]["confiance"].as<String>();
confStr.replace("%", ""); // Enlever le %
resultatOeux.oeil_droit_conf = confStr.toFloat() / 100.0;  // Convertir en 0-1
}
resultatOeux.alerte = respDoc["alerte"] ? 1 : 0;
resultatOeux.disponibles = true;
resultatOeux.timestamp = millis();
Serial.println("[RASPBERRY] [OK] Resultats recus!");
Serial.println("[RASPBERRY] OD: " + String(resultatOeux.oeil_droit) + " (" + String(resultatOeux.oeil_droit_conf, 2) + ")");
Serial.println("[RASPBERRY] OG: " + String(resultatOeux.oeil_gauche) + " (" + String(resultatOeux.oeil_gauche_conf, 2) + ")");
http.end();
return true;
} else if (status == "processing") {
Serial.println("[RASPBERRY] [INFO] Analyse en cours...");
// Continuer à attendre
} else if (status == "error") {
Serial.println("[RASPBERRY] [ERROR] Erreur lors de l'analyse");
captureOeuxEnCours = false;
}
}
} else if (code == 404) {
Serial.println("[RASPBERRY] ❌ Session non trouvée");
captureOeuxEnCours = false;
}
http.end();
return false;
}
bool envoyerMesuresServeur(const char* card_id,
int bpm, int spo2, float temp, float poids,
const char* oeil_gauche = "", float oeil_gauche_conf = 0.0,
const char* oeil_droit = "", float oeil_droit_conf = 0.0, int alerte = 0) {
if (!wifiStat.connected) return false;
HTTPClient http;
Serial.println("[MERA] 📤 Envoi mesures vers /robot/measurements...");
http.begin(API_MERA_MEASUREMENTS);
http.setTimeout(SERVER_TIMEOUT);
http.addHeader("Content-Type", "application/json");
http.addHeader("Authorization", "Bearer " + API_MERA_TOKEN);

StaticJsonDocument<512> doc;
doc["card_id"] = card_id;
if (temp > 0) doc["temperature"] = temp;
if (bpm > 0) doc["heart_rate"] = bpm;
if (spo2 > 0) doc["spo2"] = spo2;
if (poids > 0) doc["weight"] = poids;

if (strlen(oeil_gauche) > 0) {
JsonObject left = doc.createNestedObject("eye_left");
left["diagnosis"] = oeil_gauche;
left["confidence"] = oeil_gauche_conf;
}
if (strlen(oeil_droit) > 0) {
JsonObject right = doc.createNestedObject("eye_right");
right["diagnosis"] = oeil_droit;
right["confidence"] = oeil_droit_conf;
}
doc["alerte"] = alerte > 0;

String jsonPayload;
serializeJson(doc, jsonPayload);
Serial.println("[MERA] JSON: " + jsonPayload);

int code = http.POST(jsonPayload);
Serial.println("[MERA] 📥 Code HTTP: " + String(code));

if (code == 201) {
String response = http.getString();
Serial.println("[MERA] ✅ Mesures enregistrées: " + response);
beepOK();
http.end();
return true;
} else {
String response = http.getString();
Serial.println("[MERA] ❌ Échec: " + response);
http.end();
beepError();
return false;
}
}
// ============================================================
// FONCTION : ENVOYER POINTAGE (ATTENDANCE) AU BACKEND MERA
// ============================================================
bool sendAttendance(const char* card_id, const char* patient_name, const char* role) {
  if (!wifiStat.connected) {
    Serial.println("[ATTENDANCE] ⚠️ WiFi non connecté - pointage ignoré");
    return false;
  }
  HTTPClient http;
  http.begin(API_MERA_ATTENDANCE);
  http.setTimeout(3000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + API_MERA_TOKEN);

  StaticJsonDocument<128> doc;
  doc["card_id"] = card_id;
  if (patient_name && strlen(patient_name) > 0) doc["patient_name"] = patient_name;
  if (role && strlen(role) > 0) doc["role"] = role;

  String jsonPayload;
  serializeJson(doc, jsonPayload);
  Serial.println("[ATTENDANCE] 📤 Envoi pointage: " + jsonPayload);

  int httpCode = http.POST(jsonPayload);

  if (httpCode == 201) {
    String response = http.getString();
    // Extraire badged_at de la réponse JSON
    StaticJsonDocument<256> respDoc;
    DeserializationError err = deserializeJson(respDoc, response);
    if (!err && respDoc.containsKey("badged_at")) {
      String badgeTime = respDoc["badged_at"].as<String>();
      Serial.println("[ATTENDANCE] ✅ Pointage enregistré à " + badgeTime);
    } else {
      Serial.println("[ATTENDANCE] ✅ Pointage enregistré: " + response);
    }
    http.end();
    return true;
  } else {
    String response = http.getString();
    Serial.println("[ATTENDANCE] ❌ Échec (code: " + String(httpCode) + "): " + response);
    http.end();
    return false;
  }
}

// ============================================================
// FONCTION DE RECHERCHE ÉTUDIANT - UNIQUEMENT SERVEUR
// ============================================================
bool findEtud(const char* uid, Etudiant* res) {
// Étape 1 : stocker l'UID RFID (card_id)
strncpy(res->uid, uid, 19);
res->uid[19] = 0;
res->actif = false;

// Étape 2 : chercher la carte sur le backend MERA (Patient ou User)
if (wifiStat.connected) {
if (rechercherPatientMERA(uid, res)) {
Serial.println("[RFID] ✅ Carte reconnue: " + String(res->prenom) + " " + String(res->nom));
return true;
}
Serial.println("[RFID] ⛔ Carte non enregistrée sur le serveur");
} else {
Serial.println("[RFID] ⚠️ WiFi hors ligne, badge impossible");
}
return false;  // Rejeter les cartes inconnues
}
// ============================================================
// QUEUE
// ============================================================
void ajouterQueue(const char* uid, int bpm, int spo2, float temp, float poids) {
if (queueSize >= MAX_QUEUE_SIZE) {
for (int i = 0; i < queueSize - 1; i++) queue[i] = queue[i + 1];
queueSize--;
}
strncpy(queue[queueSize].uid, uid, 19);
queue[queueSize].uid[19] = 0;
queue[queueSize].bpm = bpm;
queue[queueSize].spo2 = spo2;
queue[queueSize].temp = temp;
queue[queueSize].poids = poids;
queue[queueSize].timestamp = millis();
queue[queueSize].tentatives = 0;
queue[queueSize].actif = true;
queueSize++;
Serial.println("[QUEUE] Ajout (" + String(queueSize) + ")");
}
void traiterQueue() {
if (!wifiStat.connected || queueSize == 0) return;
// ✅ AMÉLIORATION: Traiter UNE SEULE mesure par appel (non-bloquant)
static int indexQueue = 0;
if (indexQueue >= queueSize) {
indexQueue = 0;
return;
}
if (!queue[indexQueue].actif) {
indexQueue++;
return;
}
bool success = envoyerMesuresServeur(
queue[indexQueue].uid,
queue[indexQueue].bpm, queue[indexQueue].spo2, queue[indexQueue].temp, queue[indexQueue].poids);
if (success) {
queue[indexQueue].actif = false;
for (int j = indexQueue; j < queueSize - 1; j++) queue[j] = queue[j + 1];
queueSize--;
indexQueue = 0;  // Recommencer depuis le début
Serial.println("[QUEUE] ✅ Une mesure envoyée - Queue: " + String(queueSize) + " restantes");
} else {
queue[indexQueue].tentatives++;
if (queue[indexQueue].tentatives >= MAX_RETRY_SEND) {
queue[indexQueue].actif = false;
for (int j = indexQueue; j < queueSize - 1; j++) queue[j] = queue[j + 1];
queueSize--;
indexQueue = 0;
Serial.println("[QUEUE] ❌ Mesure abandonnée après " + String(MAX_RETRY_SEND) + " tentatives");
} else {
indexQueue++;
Serial.println("[QUEUE] ⚠️ Tentative " + String(queue[indexQueue].tentatives) + " échouée");
}
}
yield();  // ✅ Laisser respirer le watchdog
}
// ============================================================
// GESTION ÉNERGÉTIQUE DES CAPTEURS - VERSION AMÉLIORÉE ✅
// ============================================================
void activerCapteurCardiaque() {
if (!etatCapteurs.max30102Actif) {
Serial.println("Activation capteur cardiaque...");
Wire.begin();
Wire.setClock(400000);
if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
// Configuration optimisée pour stabilité
particleSensor.setup(0x5F, 4, 2, 400, 411, 4096);
particleSensor.setPulseAmplitudeRed(0x1F);
particleSensor.setPulseAmplitudeIR(0x1F);
etatCapteurs.max30102Actif = true;
etatCapteurs.ledBright = 0x1F;
// 🎯 Réinitialiser les buffers SpO2 pour nouvelles mesures
reinitialiserBufferSpO2();
Serial.println("Capteur cardiaque active - Mode stable");
} else {
Serial.println("ERREUR: Capteur cardiaque non detecte!");
}
}
}
void desactiverCapteurCardiaque() {
if (etatCapteurs.max30102Actif) {
particleSensor.shutDown();
etatCapteurs.max30102Actif = false;
etatCapteurs.doigtPresent = false;
}
}
void activerCapteurTemperature() {
if (!etatCapteurs.mlx90614Actif) {
Serial.println("Activation capteur temperature...");
Wire.begin();
Wire.setClock(100000);
if (mlx.begin()) {
etatCapteurs.mlx90614Actif = true;
Serial.println("Capteur temperature active");
} else {
Serial.println("ERREUR: Capteur temperature non detecte!");
}
}
}
void desactiverCapteurTemperature() {
if (etatCapteurs.mlx90614Actif) {
etatCapteurs.mlx90614Actif = false;
}
}

// ============================================================
// 🏋️ BALANCE BLE (réception du poids par annonces Bluetooth)
// ============================================================
// La balance diffuse le poids dans les « manufacturer data » de ses annonces
// BLE. Pendant l'étape POIDS, on scanne en continu, on filtre sur la MAC de la
// balance, puis on décode 2 octets de charge utile : poids = raw / 100 (kg).
// (Reproduction directe de la logique du scanner Python okok_ble_scanner.py.)
class BalanceBLECallbacks : public BLEAdvertisedDeviceCallbacks {
    void onResult(BLEAdvertisedDevice dev) {
        // 1) Filtrer sur la MAC de la balance
        if (dev.getAddress().toString() != std::string(BALANCE_BLE_MAC)) return;
        // 2) Doit contenir des manufacturer data
        if (!dev.haveManufacturerData()) return;
        std::string mdata = dev.getManufacturerData(); // inclut 2 octets d'ID fabricant
        if (mdata.length() < 4) return;
        // 3) Octets 0-1 = ID fabricant, 2-3 = charge utile (poids), big-endian
        uint8_t b0 = (uint8_t)mdata[2];
        uint8_t b1 = (uint8_t)mdata[3];
        uint16_t raw = ((uint16_t)b0 << 8) | b1;
        float val = raw / 100.0f;
        // 4) Filtrer les valeurs hors plage
        if (val < BLE_WEIGHT_MIN || val > BLE_WEIGHT_MAX) return;
        // 5) Publier le poids pour la boucle principale (contexte tâche BLE)
        bleWeightValue = val;
        bleWeightNew = true;
        bleLastRx = millis();
    }
};

// Démarre le scan BLE (init du stack Bluedroid). Appelé à l'entrée de l'étape POIDS.
void demarrerScanBalance() {
    if (balanceScanActive) return;
    Serial.println("\n[BLE] === DÉMARRAGE SCAN BALANCE ===");
    BLEDevice::init("MERA-Balance");
    pBLEScan = BLEDevice::getScan();
    pBLEScan->setAdvertisedDeviceCallbacks(new BalanceBLECallbacks(), true); // garder les doublons
    pBLEScan->setActiveScan(true);
    pBLEScan->setInterval(100);
    pBLEScan->setWindow(99);
    bleWeightNew = false;
    bleWeightValue = 0;
    bleLastRx = 0;
    // Scan continu, NON bloquant (duration=0) : les poids arrivent par callback
    pBLEScan->start(0, nullptr, false);
    balanceScanActive = true;
    etatCapteurs.balanceActif = true;
    Serial.println("[BLE] ✅ Scan démarré (MAC=" + String(BALANCE_BLE_MAC) + ")");
}

// Arrête le scan BLE et libère la RAM du stack (meilleure coexistence avec le WiFi).
void arreterScanBalance() {
    if (!balanceScanActive) return;
    if (pBLEScan) {
        pBLEScan->stop();
        pBLEScan->clearResults();
    }
    BLEDevice::deinit(true); // libère la mémoire Bluedroid
    pBLEScan = nullptr;
    balanceScanActive = false;
    etatCapteurs.balanceActif = false;
    Serial.println("[BLE] 💤 Scan arrêté (RAM libérée)");
}

// Wrappers conservés pour ne pas modifier le reste du code (changerEtat, setupPoids…).
void activerCapteurPoids() { demarrerScanBalance(); }
void desactiverCapteurPoids() { arreterScanBalance(); }

void desactiverTousCapteurs() {
desactiverCapteurCardiaque();
desactiverCapteurTemperature();
desactiverCapteurPoids();
}
// ============================================================
// FONCTIONS D'AFFICHAGE OPTIMISÉES POUR 480x320 ✅
// ============================================================
void dessinerHeader(const String& titre) {
tft.fillRect(0, 0, SCREEN_W, 60, PRIMARY_COLOR);
tft.setTextColor(BACKGROUND_COLOR, PRIMARY_COLOR);
tft.drawCentreString(tronc(titre, 25), SCREEN_W / 2, 15, 4);
if (wifiStat.enabled) {
int x = SCREEN_W - 40, y = 10;
if (wifiStat.connected) {
tft.fillCircle(x, y + 20, 4, SUCCESS_COLOR);
tft.fillCircle(x, y + 15, 3, SUCCESS_COLOR);
} else {
tft.drawCircle(x, y + 20, 4, ERROR_COLOR);
}
}
}
void afficherStatut(const String& texte, uint16_t couleur) {
clear(0, 180, SCREEN_W, 30);
tft.setTextColor(couleur, BACKGROUND_COLOR);
tft.drawCentreString(tronc(texte, 45), SCREEN_W / 2, 185, 2);
}
void afficherValeurIR(long irValue) {
clear(350, 270, 120, 20);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawString("IR: " + String(irValue), 350, 270, 1);
}
void afficherBPM(int valeurBPM) {
clear(80, 80, 150, 60);
uint16_t couleur = TEXT_COLOR;
if (valeurBPM == 0) {
couleur = WARNING_COLOR;
} else if (valeurBPM >= 60 && valeurBPM <= 100) {
couleur = SUCCESS_COLOR;
} else if (valeurBPM > 100 && valeurBPM <= 120) {
couleur = SECONDARY_COLOR;
} else {
couleur = ERROR_COLOR;
}
tft.setTextColor(couleur, BACKGROUND_COLOR);
String texte = (valeurBPM > 0) ? String(valeurBPM) : "--";
tft.drawCentreString(texte, 155, 80, 8);
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("BPM", 155, 140, 2);
}
void afficherSpO2(int valeurSpO2) {
clear(250, 80, 150, 60);
uint16_t couleur = TEXT_COLOR;
if (valeurSpO2 == 0) {
couleur = WARNING_COLOR;
} else if (valeurSpO2 >= 95) {
couleur = SUCCESS_COLOR;
} else if (valeurSpO2 >= 90) {
couleur = SECONDARY_COLOR;
} else {
couleur = ERROR_COLOR;
}
tft.setTextColor(couleur, BACKGROUND_COLOR);
String texte = (valeurSpO2 > 0) ? String(valeurSpO2) + "%" : "--%";
tft.drawCentreString(texte, 325, 80, 8);
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("SpO2", 325, 140, 2);
}
void afficherPoids(float valeurPoids) {
clear(150, 160, 180, 60);
// ✅ CORRECTION : Affichage cohérent en kg
tft.setTextColor(valeurPoids > 0 ? PRIMARY_COLOR : WARNING_COLOR, BACKGROUND_COLOR);
String texte = (valeurPoids > 0) ? String(valeurPoids, 1) + " kg" : "--.- kg";
tft.drawCentreString(texte, 240, 160, 6);
}
void afficherTemperature(float valeurTemperature) {
clear(150, 160, 180, 60);
uint16_t couleur;
if (valeurTemperature >= TEMPERATURE_FIEVRE) {
couleur = TEMP_HIGH_COLOR;
} else if (valeurTemperature >= TEMPERATURE_FIEVRE_LEGERE) {
couleur = TEMP_WARNING_COLOR;
} else if (valeurTemperature >= TEMPERATURE_NORMALE_MIN && valeurTemperature <= TEMPERATURE_NORMALE_MAX) {
couleur = TEMP_NORMAL_COLOR;
} else {
couleur = WARNING_COLOR;
}
tft.setTextColor(couleur, BACKGROUND_COLOR);
String texte = (valeurTemperature > 0) ? String(valeurTemperature, 1) + " °C" : "--.- °C";
tft.drawCentreString(texte, 240, 160, 6);
}
void afficherQualiteSignal(float qualite) {
int x = 50, y = 220, largeur = 150, hauteur = 10;
clear(x, y-20, 250, 30);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawString("Signal:", x, y-20, 1);
tft.drawRect(x, y, largeur, hauteur, TEXT_COLOR);
uint16_t couleur = ERROR_COLOR;
if (qualite > 75) couleur = SUCCESS_COLOR;
else if (qualite > 50) couleur = SECONDARY_COLOR;
else if (qualite > 25) couleur = WARNING_COLOR;
int largeurBarre = (largeur - 2) * qualite / 100.0;
if (largeurBarre > 0) {
tft.fillRect(x + 1, y + 1, largeurBarre, hauteur - 2, couleur);
}
tft.setTextColor(couleur, BACKGROUND_COLOR);
tft.drawString(String((int)qualite) + "%", x + largeur + 10, y-20, 1);
}
void afficherProgressionStabilite(int compteur, int total) {
clear(50, 240, 200, 20);
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Stability: " + String(compteur) + "/" + String(total), 50, 240, 1);
}
// ============================================================
// ÉCRAN BIENVENUE PERSONNALISÉ - NOUVEAU ✅
// ============================================================
void afficherEcranBienvenueEtudiant() {
tft.fillScreen(BACKGROUND_COLOR);
// Cadre décoratif
tft.drawRoundRect(20, 20, SCREEN_W - 40, SCREEN_H - 40, 15, PRIMARY_COLOR);
tft.drawRoundRect(22, 22, SCREEN_W - 44, SCREEN_H - 44, 13, HIGHLIGHT_COLOR);
// Titre principal
tft.setTextColor(PRIMARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("WELCOME", SCREEN_W / 2, 50, 6);
// Message de salutation
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Hello", SCREEN_W / 2, 110, 4);
// Prénom en grand
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString(String(etudActuel.prenom), SCREEN_W / 2, 130, 4);
if (strlen(etudActuel.nom) > 0) {
tft.setTextColor(PRIMARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString(tronc(String(etudActuel.nom), 20), SCREEN_W / 2, 170, 6);
} else {
tft.setTextColor(PRIMARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString(tronc(String(etudActuel.uid), 16), SCREEN_W / 2, 170, 6);
}
// Message de préparation
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Preparation of measurements...", SCREEN_W / 2, 270, 2);
// Animation de chargement
int barX = 80, barY = 290, barW = SCREEN_W - 160, barH = 8;
tft.drawRect(barX, barY, barW, barH, TEXT_COLOR);
for (int i = 0; i <= 100; i += 5) {
int fillW = (barW - 2) * i / 100;
tft.fillRect(barX + 1, barY + 1, fillW, barH - 2, PRIMARY_COLOR);
if (i % 25 == 0) {
beep(NOTE_C4 + (i / 25) * 100, 50);
}
delay(60);
}
beepOK();
}
void afficherEcranBienvenue() {
tft.fillScreen(BACKGROUND_COLOR);
tft.setTextColor(PRIMARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("MEDICAL SYSTEM", SCREEN_W / 2, 80, 6);
tft.drawCentreString("BIOMETRIC", SCREEN_W / 2, 140, 6);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("BPM + SpO2 + WEIGHT + TEMP", SCREEN_W / 2, 190, 2);
tft.drawCentreString("Initialization...", SCREEN_W / 2, 240, 2);
int barX = (SCREEN_W - 300) / 2;
int barY = 270;
for(int i = 0; i <= 100; i += 10) {
tft.drawRect(barX, barY, 300, 12, TEXT_COLOR);
tft.fillRect(barX + 1, barY + 1, (298 * i) / 100, 10, PRIMARY_COLOR);
delay(50);
}
}
// ============================================================
// 🏋️ RÉINITIALISATION POIDS (état BLE)
// ============================================================
void reinitialiserPoids() {
    bleWeightValue = 0;
    bleWeightNew = false;
    bleLastRx = 0;
    bleStableRef = 0;
    bleStableCount = 0;
    utilisateurDetecte = false;
    donnees.poids = 0;
    Serial.println("[POIDS] 🔄 Réinitialisé (BLE)");
}
// ============================================================
// GESTION TEMPÉRATURE AMÉLIORÉE ✅
// ============================================================
// ============================================================
// COMPENSATION DE TEMPÉRATURE MLX90614 - ALGORITHME OPTIMISÉ
// ============================================================
float calculerFacteurK(float tempAmbiente) {
// Adaptation dynamique du facteur K selon la température ambiante
if (tempAmbiente < 18.0) {
return 0.18;  // Compensation forte (pièce froide)
} else if (tempAmbiente <= 25.0) {
// Interpolation linéaire entre 18°C et 25°C
return 0.18 - (tempAmbiente - 18.0) * (0.18 - 0.12) / 7.0;
} else {
return 0.06;  // Compensation faible (pièce chaude)
}
}
float compenserTemperatureCorps(float tObj, float tAmb) {
// Formule de compensation : T_body = T_obj + K(T_amb) * (T_obj - T_amb) + OFFSET
float k = calculerFacteurK(tAmb);
float tBody = tObj + k * (tObj - tAmb) + 0.8;  // +0.8°C offset clinique
Serial.print("[TEMP] Brute: "); Serial.print(tObj);
Serial.print(" | Amb: "); Serial.print(tAmb);
Serial.print(" | K: "); Serial.print(k, 3);
Serial.print(" | Compensation: "); Serial.println(tBody);
return tBody;
}
float lireTemperatureFiltree() {
static unsigned long dernierUpdate = 0;
static float temperatureFiltree = 0;
if (millis() - dernierUpdate >= INTERVALLE_LECTURE_TEMP) {
if (etatCapteurs.mlx90614Actif) {
float tObj = mlx.readObjectTempC();     // Température surface (front)
float tAmb = mlx.readAmbientTempC();    // Température ambiante
// ✅ Appliquer la compensation optimisée
float tCompensee = compenserTemperatureCorps(tObj, tAmb);
// ✅ Filtre exponentiel sur température compensée
const float alpha = 0.5;
temperatureFiltree = alpha * tCompensee + (1 - alpha) * temperatureFiltree;
donnees.temperatureAmbiante = tAmb;  // Stocker pour logs
dernierUpdate = millis();
return temperatureFiltree;
}
}
return temperatureFiltree;
}
bool verifierStabiliteTemperature(float temperatureActuelle) {
historiqueTemperature[indexHistoriqueTemperature] = temperatureActuelle;
indexHistoriqueTemperature = (indexHistoriqueTemperature + 1) % 5;
float minTemp = historiqueTemperature[0];
float maxTemp = historiqueTemperature[0];
for (int i = 1; i < 5; i++) {
if (historiqueTemperature[i] < minTemp) minTemp = historiqueTemperature[i];
if (historiqueTemperature[i] > maxTemp) maxTemp = historiqueTemperature[i];
}
float variation = maxTemp - minTemp;
bool stable = (variation <= 0.15);  // 🎯 Seuil ajusté pour temp compensée
if (stable) {
if (!stabilisationTempEnCours) {
stabilisationTempEnCours = true;
debutStabilisationTemp = millis();
}
return (millis() - debutStabilisationTemp >= 1500);
} else {
stabilisationTempEnCours = false;
debutStabilisationTemp = 0;
return false;
}
}
// ============================================================
// ALGORITHME PULSEOX MAX30102 (ratio-of-ratios)
// ============================================================
// Filtrage DC (baseline lente) : alpha élevé = baseline stable
float filtrerDC(float nouvelleMesure, float valeurActuelle, float alpha) {
    return alpha * valeurActuelle + (1.0f - alpha) * nouvelleMesure;
}
// AC = composante pulsatile (signal - baseline)
float calculerAC(float mesure, float dc) {
    return mesure - dc;
}

// Calcul SpO2 réaliste (MAX30102, formule du ratio des ratios)
// Cadence d'appel ~50-100 Hz (chaque échantillon IR/RED), pas seulement aux beats.
void calculerSpO2(long irValue, long redValue) {
    if (irValue < config.seuilIrDoigt) {
        donnees.spo2 = 0;
        // Reset baseline pour éviter une transition brutale au retour du doigt
        irDC = 0; redDC = 0;
        return;
    }

    // 1) Initialisation de la baseline au premier doigt posé
    if (irDC == 0) irDC = (float)irValue;
    if (redDC == 0) redDC = (float)redValue;

    // 2) Baseline DC (lente, alpha=0.95)
    irDC  = filtrerDC((float)irValue,  irDC,  SPO2_DC_ALPHA);
    redDC = filtrerDC((float)redValue, redDC, SPO2_DC_ALPHA);

    // 3) AC instantané, puis enveloppe (moyenne absolue lissée)
    float irAcSample  = calculerAC((float)irValue,  irDC);
    float redAcSample = calculerAC((float)redValue, redDC);
    irAC  = filtrerDC(fabsf(irAcSample),  irAC,  1.0f - SPO2_AC_ALPHA);
    redAC = filtrerDC(fabsf(redAcSample), redAC, 1.0f - SPO2_AC_ALPHA);

    if (irDC < 1.0f || redDC < 1.0f || irAC < 1.0f) {
        return; // Pas encore assez de signal, on garde la valeur précédente
    }

    // 4) Ratio des ratios R = (AC_red/DC_red) / (AC_ir/DC_ir)
    float r = (redAC / redDC) / (irAC / irDC);
    // Garde-fou : R typique humain ~0.4 (98 %) à 1.0 (~85 %)
    if (r < 0.2f) r = 0.2f;
    if (r > 1.6f) r = 1.6f;

    // 5) Polynôme empirique étalonné : SpO2 = A + B*R²
    float spo2_value = SPO2_COEFF_A + SPO2_COEFF_B * (r * r);

    // 6) Clamp dans la plage physiologique réaliste (90-100 %)
    if (spo2_value < SPO2_MIN_PHYSIO) spo2_value = SPO2_MIN_PHYSIO;
    if (spo2_value > SPO2_MAX_PHYSIO) spo2_value = SPO2_MAX_PHYSIO;

    // 7) Moyenne glissante sur le buffer
    spo2Buffer[spo2BufferIndex] = spo2_value;
    spo2BufferIndex = (spo2BufferIndex + 1) % SPO2_BUFFER_SIZE;
    float moyenneSpO2 = 0;
    for (int i = 0; i < SPO2_BUFFER_SIZE; i++) moyenneSpO2 += spo2Buffer[i];
    moyenneSpO2 /= SPO2_BUFFER_SIZE;
    donnees.spo2 = (int)(moyenneSpO2 + 0.5f);

    // 8) Debug 1 fois sur 25 (≈ 1 par seconde à 25 Hz d'appel)
    if (spo2Counter++ % 25 == 0) {
        Serial.print("[SPO2] R: "); Serial.print(r, 3);
        Serial.print(" | DC_IR: "); Serial.print(irDC, 0);
        Serial.print(" | AC_IR: "); Serial.print(irAC, 0);
        Serial.print(" | raw: "); Serial.print(spo2_value, 1);
        Serial.print(" | moy: "); Serial.println(donnees.spo2);
    }
}

void reinitialiserBufferSpO2() {
    for (int i = 0; i < SPO2_BUFFER_SIZE; i++) {
        spo2Buffer[i] = 98;  // Valeur neutre haute mais plausible
    }
    spo2BufferIndex = 0;
    irDC = 0; irAC = 0;
    redDC = 0; redAC = 0;
    spo2Counter = 0;
}
// ============================================================
// GESTION DES ÉTATS AVEC ACTIVATION CAPTEURS ✅
// ============================================================
void changerEtat(Etat nouvelEtat) {
Serial.println("\n[ETAT] ========================================");
Serial.println("[ETAT] Changement d'état demandé");
Serial.println("[ETAT] État actuel: " + String(etatActuel));
Serial.println("[ETAT] Nouvel état: " + String(nouvelEtat));
Serial.println("[ETAT] ========================================");
desactiverTousCapteurs();
etatActuel = nouvelEtat;
tempsDebutEtat = millis();
dernierUpdateAffichage = 0;
switch (etatActuel) {
case BADGE:
setupBadge();
break;
case BIENVENUE:
setupBienvenue();
// Audio envoyé directement dans setupBienvenue()
break;
case RYTHME_CARDIAQUE:
setupRythmeCardiaque();
envoyerSignalAudio(AUDIO_RYTHME);  // 📢 003.mp3
break;
case TEMPERATURE:
setupTemperature();
envoyerSignalAudio(AUDIO_TEMPERATURE);  // 📢 004.mp3
break;
case POIDS:
setupPoids();
envoyerSignalAudio(AUDIO_POIDS);  // 📢 005.mp3
break;
case AFFICHAGE:
setupAffichage();
envoyerSignalAudio(AUDIO_FIN);  // 📢 006.mp3
break;
default:
break;
}
}
// ============================================================
// ÉTAT BADGE - RFID
// ============================================================
void setupBadge() {
Serial.println("\n[BADGE] ===== DEBUT SETUP BADGE 480x320 =====");
// 🎯 BUG FIX: Réinitialiser l'utilisateur et les données précédents
memset(&etudActuel, 0, sizeof(Etudiant));
donnees.bpm = 0;
donnees.spo2 = 0;
donnees.poids = 0;
donnees.temperature = 0;
donnees.bpmStable = 0;
donnees.spo2Stable = 0;
donnees.temperatureStable = 0;
Serial.println("[BADGE] ✅ Utilisateur et données réinitialisées - En attente nouveau badge");
tft.fillScreen(BACKGROUND_COLOR);
// Cadre principal
tft.drawRoundRect(10, 10, SCREEN_W - 20, SCREEN_H - 20, 20, PRIMARY_COLOR);
tft.setTextColor(PRIMARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("MEDICAL ROBOT", SCREEN_W / 2, 60, 6);
tft.drawCentreString("SCHOOL", SCREEN_W / 2, 120, 6);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Present your RFID card", SCREEN_W / 2, 180, 2);
// Section informations système
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("=== SYSTEM STATUS ===", SCREEN_W / 2, 210, 1);
if (wifiStat.enabled) {
String wifiTxt = wifiStat.connected ? "WiFi: Connecte" : "WiFi: Hors ligne";
uint16_t wifiCol = wifiStat.connected ? SUCCESS_COLOR : WARNING_COLOR;
tft.setTextColor(wifiCol, BACKGROUND_COLOR);
tft.drawCentreString(wifiTxt, SCREEN_W / 2, 230, 1);
}
if (queueSize > 0) {
tft.setTextColor(WARNING_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("En attente: " + String(queueSize) + " mesure(s)", SCREEN_W / 2, 250, 1);
}
// Icône badge animée
int x = SCREEN_W / 2 - 25, y = 270;
tft.drawRoundRect(x, y, 50, 35, 8, PRIMARY_COLOR);
tft.fillRoundRect(x + 10, y + 8, 30, 20, 5, PRIMARY_COLOR);
Serial.println("[BADGE] ✅✅✅ ECRAN BADGE 480x320 COMPLET ✅✅✅");
}
void loopBadge() {
char uid[20];
if (readBadge(uid)) {
Serial.println("[RFID] Badge détecté: " + String(uid));
// Réinitialiser etudActuel avant la recherche
memset(&etudActuel, 0, sizeof(Etudiant));
  if (findEtud(uid, &etudActuel)) {
Serial.println("[RFID] ✅ Carte détectée: UID=" + String(etudActuel.uid));
String fullName = String(etudActuel.prenom) + " " + String(etudActuel.nom);
sendAttendance(etudActuel.uid, fullName.c_str(), etudActuel.role);
changerEtat(BIENVENUE);
} else {
Serial.println("[RFID] ❌ Étudiant inconnu");
tft.fillScreen(BACKGROUND_COLOR);
dessinerHeader("UNKNOWN BADGE");
tft.setTextColor(ERROR_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Not registered", SCREEN_W / 2, 120, 4);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("UID: " + tronc(String(uid), 20), SCREEN_W / 2, 170, 2);
tft.drawCentreString("Contact administration", SCREEN_W / 2, 210, 1);
beepError();
delay(3000);
changerEtat(BADGE);
}
}
static unsigned long lastQueue = 0;
if (millis() - lastQueue > 5000) {
traiterQueue();
lastQueue = millis();
}
checkWiFi();
static unsigned long tAnim = 0;
static int f = 0;
if (millis() - tAnim > 800) {
int x = SCREEN_W / 2 - 25, y = 270;
clear(x, y, 50, 40);
tft.drawRoundRect(x, y, 50, 35, 8, PRIMARY_COLOR);
if (f % 2 == 0) tft.fillRoundRect(x + 10, y + 8, 30, 20, 5, PRIMARY_COLOR);
f++;
tAnim = millis();
}
}
// ============================================================
// FONCTIONS D'AFFICHAGE BIENVENUE ✅ NOUVELLES
// ============================================================
// Affichage "Rapprochez votre visage" avec countdown NON-BLOQUANT
void afficherRapprochezVisage() {
tft.fillScreen(BACKGROUND_COLOR);
dessinerHeader("EYE ANALYSIS");
// Texte principal
tft.setTextColor(PRIMARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("BRING YOUR FACE CLOSER", SCREEN_W / 2, 80, 4);
tft.drawCentreString("IN FRONT OF THE CAMERA", SCREEN_W / 2, 130, 4);
// Dessiner cadre visage stylisé
int cx = SCREEN_W / 2;
int cy = 200;
tft.drawRoundRect(cx - 90, cy - 110, 180, 220, 15, HIGHLIGHT_COLOR);
tft.fillCircle(cx - 40, cy - 40, 15, PRIMARY_COLOR);   // Œil gauche
tft.fillCircle(cx + 40, cy - 40, 15, PRIMARY_COLOR);   // Œil droit
tft.drawLine(cx - 20, cy + 10, cx + 20, cy + 10, PRIMARY_COLOR); // Nez
tft.drawArc(cx, cy + 40, 30, 25, 200, 340, PRIMARY_COLOR, BACKGROUND_COLOR); // Bouche
// Compte à rebours 3...2...1 avec yield()
tft.setTextColor(WARNING_COLOR, BACKGROUND_COLOR);
for (int i = 3; i > 0; i--) {
tft.fillRect(cx - 50, 280, 100, 40, BACKGROUND_COLOR); // Effacer
tft.drawCentreString(String(i), cx, 285, 6);
// ✅ RETIRÉ: beep(NOTE_C4, 100); - Seul l'audio MP3 joue
// ✅ Remplacer delay(1000) par boucle + yield()
unsigned long debut = millis();
while (millis() - debut < 900) {
yield();  // Laisser respirer le watchdog
delay(50);
}
}
// ✅ RETIRÉ: beep(NOTE_G5, 150); - Bip final supprimé pour audio MP3
}
// Affichage "Capture en cours" avec barre de progression NON-BLOQUANTE
void afficherCaptureEnCours() {
tft.fillScreen(BACKGROUND_COLOR);
dessinerHeader("CAPTURE IN PROGRESS");
tft.setTextColor(WARNING_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("📸 CAPTURE EN COURS", SCREEN_W / 2, 100, 4);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Stay still", SCREEN_W / 2, 160, 2);
tft.drawCentreString("Don't move", SCREEN_W / 2, 190, 2);
// Barre de progression (3 secondes = 100 * 30ms) avec yield()
int barX = 90, barY = 240, barW = 300, barH = 20;
tft.drawRect(barX, barY, barW, barH, TEXT_COLOR);
for (int i = 0; i <= 100; i += 2) {
int fillW = (barW - 2) * i / 100;
tft.fillRect(barX + 1, barY + 1, fillW, barH - 2, PRIMARY_COLOR);
// Afficher pourcentage
tft.fillRect(SCREEN_W / 2 - 40, barY + 30, 80, 30, BACKGROUND_COLOR);
tft.setTextColor(PRIMARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString(String(i) + "%", SCREEN_W / 2, barY + 35, 4);
// ✅ Remplacer delay(30) par delay(30) + yield()
yield();
delay(30); // Total: 100 * 30ms = 3 secondes
}
// ✅ RETIRÉ: beep(NOTE_E5, 100); - Seul l'audio MP3 joue
}
// ============================================================
// ÉTAT BIENVENUE PERSONNALISÉ ✅ REFACTORISÉ
// ============================================================
void setupBienvenue() {
// ÉTAPE 1 : Afficher "Bonjour M. DUPONT" (déjà avec animation)
afficherEcranBienvenueEtudiant();
// ÉTAPE 2 : Bip sonore puis audio 002 (YEUX) - puis attendre 7 secondes
// "Identification réussie. Première étape : analyse oculaire..."
beepMesureComplete();  // 🔔 Bip sonore de bienvenue
delay(300);
envoyerSignalAudio(AUDIO_YEUX);  // 📢 002.mp3 (7 secondes)
// ⭐ ATTENDRE 7 SECONDES pour que l'utilisateur écoute l'audio
Serial.println("[BIENVENUE] ⏳ Attente de 7 secondes pour l'audio 002...");
unsigned long debut = millis();
while (millis() - debut < 7000) {  // 7000ms = 7 secondes
yield();  // Laisser respirer le watchdog
delay(100);
}
Serial.println("[BIENVENUE] ✅ Audio 002 terminé - Passage au countdown");
// ÉTAPE 3 : Afficher "RAPPROCHEZ VOTRE VISAGE" (3 secondes + countdown)
afficherRapprochezVisage();
// ÉTAPE 4 : Afficher "CAPTURE EN COURS" (3 secondes + barre)
afficherCaptureEnCours();
// ÉTAPE 5 : Lancer capture Raspberry (ID interne à la Raspberry, pas le patient_id MERA)
if (wifiStat.connected) {
if (lancerCaptureOeuxRaspberry(1)) {
// ✅ Succès - capture lancée
Serial.println("[BIENVENUE] ✅ Capture Raspberry lancée");
// captureOeuxEnCours et debutCaptureyeux déjà définis par lancerCaptureOeuxRaspberry()
} else {
// ❌ Échec - Raspberry inaccessible
Serial.println("[BIENVENUE] ❌ Impossible de contacter la Raspberry");
resultatOeux.disponibles = false;
captureOeuxEnCours = false;
tft.fillScreen(BACKGROUND_COLOR);
dessinerHeader("NETWORK ERROR");
tft.setTextColor(ERROR_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Raspberry inaccessible", SCREEN_W / 2, 150, 3);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Rest of the examination", SCREEN_W / 2, 220, 2);
beepError();
delay(2000);
}
} else {
// ❌ Pas de WiFi ou ID invalide
Serial.println("[BIENVENUE] ⚠️  WiFi ou ID invalide");
resultatOeux.disponibles = false;
captureOeuxEnCours = false;
}
}
void loopBienvenue() {
// ⭐ SI capture lancée, faire UNIQUEMENT le polling
if (captureOeuxEnCours) {
unsigned long tempsEcoule = millis() - debutCaptureyeux;
// Afficher statut toutes les secondes
static unsigned long dernierAffichage = 0;
if (millis() - dernierAffichage > 1000) {
dernierAffichage = millis();
int secondesEcoulees = tempsEcoule / 1000;
tft.fillRect(0, 270, SCREEN_W, 40, BACKGROUND_COLOR);
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Analyse en cours... " + String(secondesEcoulees) + "s",
SCREEN_W / 2, 280, 2);
}
// POLLING toutes les 2 secondes
static unsigned long dernierPolling = 0;
if (millis() - dernierPolling > 2000) {
dernierPolling = millis();
if (obtenirResultatsOeuxRaspberry(sessionRaspberryId)) {
// ✅ Résultats reçus!
Serial.println("[BIENVENUE] ✅ Résultats IA reçus");
captureOeuxEnCours = false;
// ❌ NE PAS AFFICHER LES RÉSULTATS ICI
// Les résultats seront affichés dans setupAffichage() avec les autres mesures
beepOK();
delay(500); // Bref feedback
changerEtat(RYTHME_CARDIAQUE);
return;
}
}
// Timeout après 30 secondes
if (tempsEcoule > 30000) {
Serial.println("[BIENVENUE] ❌ Timeout capture oculaire");
captureOeuxEnCours = false;
resultatOeux.disponibles = false;
tft.fillScreen(BACKGROUND_COLOR);
dessinerHeader("TIMEOUT");
tft.setTextColor(ERROR_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Analysis impossible", SCREEN_W / 2, 150, 3);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Rest of the examination...", SCREEN_W / 2, 220, 2);
beepError();
delay(2000);
changerEtat(RYTHME_CARDIAQUE);
}
} else {
// ⭐ Si pas de capture lancée (erreur initiale), passer directement
if (millis() - tempsDebutEtat > 1000) {
Serial.println("[BIENVENUE] Capture non lancée - Suite examen");
changerEtat(RYTHME_CARDIAQUE);
}
}
}
// ============================================================
// ÉTAT RYTHME CARDIAQUE - VERSION AMÉLIORÉE ✅
// ============================================================
// ================================================
// 🫀 ALGORITHME BEAT FINDER PRO - IMPLÉMENTATION
// ================================================
// Filtre Kalman pour lissage BPM temps réel
float filtreKalmanBPM(float bpmMesu) {
// Prédiction
float prediction = kalmanState;
float covariancePred = kalmanCovariance + KALMAN_PROCESS_NOISE;
// Correction (Kalman gain)
float kalmanGain = covariancePred / (covariancePred + KALMAN_MEASUREMENT_NOISE);
// Mise à jour état
kalmanState = prediction + kalmanGain * (bpmMesu - prediction);
// Mise à jour covariance
kalmanCovariance = (1.0 - kalmanGain) * covariancePred;
return kalmanState;
}
// Validation d'un beat selon pattern physiologique
bool estBeatValide(long timeSinceLast) {
// Validation physiologie: 40-300 BPM = 200-1500ms entre beats
if (timeSinceLast < BEAT_PATTERN_MIN || timeSinceLast > BEAT_PATTERN_MAX) {
beatPatternCount = 0;  // Reset pattern
return false;
}
beatPatternCount++;
return true;
}
// Tolerance adaptatif basé variance - PLUS STRICT
float calculerToleranceAdaptative() {
// Commence strict, se relâche si variance monte (faux positifs)
// L'idée: forcer la stabilisation au lieu d'accepter n'importe quoi
if (bpmVariance < 2.0) {
return 2.0;  // ±1-2 BPM - ultra stable (très bon signal)
} else if (bpmVariance < 4.0) {
return 3.0;  // ±3 BPM - très stable
} else if (bpmVariance < 8.0) {
return 5.0;  // ±5 BPM - stable
} else if (bpmVariance < 15.0) {
return 8.0;  // ±8 BPM - apprentissage
} else {
return 12.0;  // ±12 BPM - max (signal très bruité)
}
}
// Réinitialiser algorithme BPM
void reinitialiserBPMAlgorithme() {
for(int i = 0; i < BPM_BUFFER_SIZE; i++) {
bpmBuffer[i] = 0;
}
bpmBufferIndex = 0;
kalmanState = 0;
kalmanCovariance = 1.0;
lastBeatTime = 0;
bpmVariance = 0;
beatPatternCount = 0;
adaptativeTolerance = 10.0;
detectionStartTime = 0;
Serial.println("[BPM] Algorithme réinitialisé");
}
void setupRythmeCardiaque() {
activerCapteurCardiaque();
tft.fillScreen(BACKGROUND_COLOR);
dessinerHeader("HEART RATE MEASUREMENT");
// Zone BPM - Gauche
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("HEARTBEATS", 120, 50, 2);
tft.drawCentreString("PER MINUTE", 120, 70, 2);
// Zone SpO2 - Droite
tft.drawCentreString("OXYGENATION", 360, 50, 2);
tft.drawCentreString("OF THE BLOOD", 360, 70, 2);
afficherBPM(0);
afficherSpO2(0);
afficherStatut("Place your finger on the sensor", WARNING_COLOR);
for(byte i = 0; i < RATE_SIZE; i++) rates[i] = 0;
rateSpot = 0;
lastBeat = 0;
donnees.bpm = 0;
donnees.spo2 = 0;
etatCapteurs.doigtPresent = false;
compteurMesuresStables = 0;
dernierBPMValide = 0;
mesureEnCours = false;
debutMesureStable = 0;
reinitialiserBPMAlgorithme();  // Initialiser Beat Finder Pro
}
void loopRythmeCardiaque() {
if (!etatCapteurs.max30102Actif) {
afficherStatut("Heart rate sensor unavailable", ERROR_COLOR);
donnees.bpmStable = 0;
donnees.spo2Stable = 0;
delay(2000);
desactiverCapteurCardiaque();
changerEtat(TEMPERATURE);
return;
}
long irValue = particleSensor.getIR();
long redValue = particleSensor.getRed();
if (millis() - dernierAffichageIR > 1000) {
Serial.println("[HR] IR: " + String(irValue) + ", RED: " + String(redValue));
afficherValeurIR(irValue);
dernierAffichageIR = millis();
}
// ✨ SpO2 doit être calculée à CHAQUE échantillon pour que la baseline DC/AC
// se construise correctement. Pas seulement aux beats détectés.
calculerSpO2(irValue, redValue);
if (irValue > config.seuilIrDoigt) {
// ✅ DOIGT DÉTECTÉ
if (!etatCapteurs.doigtPresent) {
etatCapteurs.doigtPresent = true;
afficherStatut("Finger detected - Keep still 3-4 s...", SUCCESS_COLOR);
lastBeatTime = millis();
debutMesureStable = millis();
detectionStartTime = millis();
mesureEnCours = true;
reinitialiserBPMAlgorithme();
reinitialiserBufferSpO2();
Serial.println("[BPM] 🟢 Doigt détecté - Démarrage mesure équilibrée");
}
float qualiteSignal = min(100.0, (float)(irValue - config.seuilIrDoigt) / 30000.0 * 100.0);
// 🫀 BEAT FINDER PRO - Détection beat avec pattern
if (checkForBeat(irValue) == true) {
long timeSinceLast = millis() - lastBeatTime;
lastBeatTime = millis();
// Calculer BPM brut
int rawBPM = 60000 / timeSinceLast;
// Valider selon pattern physiologique
if (estBeatValide(timeSinceLast)) {
// ✅ Beat valide
// Appliquer filtre Kalman
float filteredBPM = filtreKalmanBPM(rawBPM);
// Ajouter au buffer circulaire
bpmBuffer[bpmBufferIndex] = filteredBPM;
bpmBufferIndex = (bpmBufferIndex + 1) % BPM_BUFFER_SIZE;
// Calculer variance buffer
float sum = 0, sumSq = 0;
int validCount = 0;
for (int i = 0; i < BPM_BUFFER_SIZE; i++) {
if (bpmBuffer[i] > 0) {
sum += bpmBuffer[i];
sumSq += bpmBuffer[i] * bpmBuffer[i];
validCount++;
}
}
if (validCount > 0) {
float mean = sum / validCount;
bpmVariance = (sumSq / validCount) - (mean * mean);
donnees.bpm = (int)mean;
// Mettre à jour tolerance adaptatif
adaptativeTolerance = calculerToleranceAdaptative();
}
// (SpO2 déjà calculée plus haut, à chaque échantillon)
// 🔒 GESTION STABILITÉ BPM
if (dernierBPMValide == 0) {
dernierBPMValide = donnees.bpm;
compteurMesuresStables = 1;
} else {
if (abs(donnees.bpm - dernierBPMValide) <= adaptativeTolerance &&
bpmVariance <= 30.0) {
compteurMesuresStables++;
Serial.println("[BPM] ✓ Stable #" + String(compteurMesuresStables) + " (delta:" +
String(abs(donnees.bpm - dernierBPMValide)) + " Var:" + String((int)bpmVariance) + ")");
} else {
if (compteurMesuresStables > 0) {
Serial.println("[BPM] ✗ Instable - Reset (delta:" + String(abs(donnees.bpm - dernierBPMValide)) +
" Var:" + String((int)bpmVariance) + ")");
}
compteurMesuresStables = max(0, compteurMesuresStables - 1);
}
dernierBPMValide = donnees.bpm;
}
// Debug
Serial.println("[BPM] Raw:" + String(rawBPM) + " Filt:" + String((int)filteredBPM) +
" Moy:" + String(donnees.bpm) + " Tol:" + String((int)adaptativeTolerance) +
" Var:" + String((int)bpmVariance) + " SpO2:" + String(donnees.spo2));
// 🎯 VALIDATION ÉQUILIBRÉE :
// - Au moins TEMPS_MIN_MESURE_BPM (3 s) écoulés
// - Au moins NOMBRE_MESURES_STABLES_REQUIS (2) mesures consécutives stables
// - Au moins SPO2_MIN_BEATS_BEFORE_VALID battements valides comptés
// - SpO2 dans la plage physiologique (90-100 %)
// - BPM dans la plage physiologique (SEUIL_BPM_MIN .. SEUIL_BPM_MAX)
unsigned long tempsMesure = millis() - debutMesureStable;
bool tempsOK     = (tempsMesure >= TEMPS_MIN_MESURE_BPM);
bool stableOK    = (compteurMesuresStables >= NOMBRE_MESURES_STABLES_REQUIS);
bool beatsOK     = (beatPatternCount >= SPO2_MIN_BEATS_BEFORE_VALID);
bool varianceOK  = (bpmVariance < 25.0);
bool bpmRangeOK  = (donnees.bpm >= SEUIL_BPM_MIN && donnees.bpm <= SEUIL_BPM_MAX);
bool spo2RangeOK = (donnees.spo2 >= SPO2_MIN_PHYSIO && donnees.spo2 <= SPO2_MAX_PHYSIO);

bool mesureValide = tempsOK && stableOK && beatsOK && varianceOK && bpmRangeOK && spo2RangeOK;

// Filet de sécurité : timeout absolu - on accepte la moyenne courante si BPM raisonnable
bool fallback = (tempsMesure >= TEMPS_MAX_MESURE_BPM) && bpmRangeOK;

if (mesureValide || fallback) {
donnees.bpmStable = donnees.bpm;
// Si SpO2 hors plage, on n'enregistre rien plutôt qu'une valeur incorrecte
donnees.spo2Stable = spo2RangeOK ? donnees.spo2 : 0;
donnees.donneesValides = true;
long timeToDetection = millis() - detectionStartTime;
Serial.println(String(fallback ? "[BPM] ⚠️ TIMEOUT - " : "[BPM] ✅ ") + "DETECTÉ EN " +
String(timeToDetection) + "ms - BPM:" + String(donnees.bpmStable) +
" SpO2:" + String(donnees.spo2Stable) + "% Var:" + String((int)bpmVariance));
afficherStatut(String("Measurements complete (") + String(timeToDetection/1000.0, 1) + "s)",
                fallback ? WARNING_COLOR : SUCCESS_COLOR);
beepOK();
delay(800);
desactiverCapteurCardiaque();
changerEtat(TEMPERATURE);
return;
}
} else {
// ❌ Beat rejeté (hors pattern physiologique)
Serial.println("[BPM] ❌ Beat rejeté (pattern invalide): delta=" + String(timeSinceLast) + "ms");
}
}
// Affichage mis à jour tous les 500ms
if (millis() - dernierUpdateAffichage > 500) {
afficherBPM(donnees.bpm);
afficherSpO2(donnees.spo2);
afficherQualiteSignal(qualiteSignal);
String status = "BPM:" + String(donnees.bpm) +
                " | Beats:" + String(beatPatternCount) + "/" + String(SPO2_MIN_BEATS_BEFORE_VALID) +
                " | Var:" + String((int)bpmVariance);
afficherStatut(status, PRIMARY_COLOR);
afficherProgressionStabilite(compteurMesuresStables, NOMBRE_MESURES_STABLES_REQUIS);
dernierUpdateAffichage = millis();
}
} else {
// ❌ DOIGT RETIRÉ
if (etatCapteurs.doigtPresent) {
etatCapteurs.doigtPresent = false;
donnees.bpm = 0;
donnees.spo2 = 0;
compteurMesuresStables = 0;
beatPatternCount = 0;
mesureEnCours = false;
afficherStatut("Finger removed - Replace finger", WARNING_COLOR);
afficherBPM(0);
afficherSpO2(0);
afficherQualiteSignal(0);
Serial.println("[BPM] 🔴 Doigt retiré");
}
}
}
// ============================================================
// ÉTAT TEMPÉRATURE - VERSION AMÉLIORÉE ✅
// ============================================================
void setupTemperature() {
activerCapteurTemperature();
tft.fillScreen(BACKGROUND_COLOR);
dessinerHeader("TEMPERATURE MEASUREMENT");
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("BODY TEMPERATURE", SCREEN_W / 2, 100, 2);
afficherTemperature(0.0);
afficherStatut("Bring your forehead close to the sensor", PRIMARY_COLOR);
for (int i = 0; i < 5; i++) {
historiqueTemperature[i] = 0;
}
indexHistoriqueTemperature = 0;
stabilisationTempEnCours = false;
debutStabilisationTemp = 0;
}
void loopTemperature() {
if (!etatCapteurs.mlx90614Actif) {
afficherStatut("Temperature sensor unavailable", ERROR_COLOR);
donnees.temperatureStable = 0;  // Marquer comme non disponible
delay(2000);
desactiverCapteurTemperature();
changerEtat(POIDS);  // Continuer vers la mesure suivante
return;
}
float temperatureBrute = lireTemperatureFiltree();
if (temperatureBrute > 25) {
donnees.temperature = temperatureBrute;
bool stable = verifierStabiliteTemperature(donnees.temperature);
afficherTemperature(donnees.temperature);
if (stable) {
donnees.temperatureStable = donnees.temperature;
afficherStatut("✓ Temperature stable !", SUCCESS_COLOR);
beepOK();  // ✅ BIP pour indiquer que la mesure est prise
delay(500);
desactiverCapteurTemperature();
changerEtat(POIDS);
return;
} else {
if (!stabilisationTempEnCours) {
afficherStatut("Waiting for stabilization...", WARNING_COLOR);
} else {
int msRestantes = 1500 - (millis() - debutStabilisationTemp);
afficherStatut("Stable... " + String(msRestantes/100.0, 1) + "s", SUCCESS_COLOR);
}
}
} else {
afficherStatut("Bring your forehead close to the sensor", WARNING_COLOR);
}
delay(100);
}

// ============================================================
// 🏋️ ÉTAT POIDS - MESURE VIA BALANCE BLE
// ============================================================
void setupPoids() {
    Serial.println("\n[POIDS] === SETUP MESURE BALANCE BLE ===");
    reinitialiserPoids();
    activerCapteurPoids();          // démarre le scan BLE
    debutMesurePoids = millis();

    tft.fillScreen(BACKGROUND_COLOR);
    dessinerHeader("WEIGHT MEASUREMENT");
    tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
    tft.drawCentreString("BODY WEIGHT", SCREEN_W / 2, 100, 2);
    afficherPoids(0.0);
    afficherStatut("Get on the scale and stay still", PRIMARY_COLOR);
    Serial.println("[POIDS] ✅ Setup terminé - en attente de la balance BLE");
}

void loopPoids() {
    // 1) Scan BLE inactif → on saute proprement vers AFFICHAGE
    if (!etatCapteurs.balanceActif) {
        afficherStatut("Weight sensor unavailable", ERROR_COLOR);
        donnees.poids = 0;
        delay(1500);
        changerEtat(AFFICHAGE);
        return;
    }

    // 2) Nouveau poids reçu par BLE ?
    if (bleWeightNew) {
        bleWeightNew = false;
        float poids = bleWeightValue;

        // Première valeur plausible = présence détectée
        if (!utilisateurDetecte) {
            utilisateurDetecte = true;
            Serial.println("[POIDS] 👤 Balance active: " + String(poids, 2) + " kg");
        }

        // Affichage temps réel
        donnees.poids = poids;
        afficherPoids(poids);

        // Test de stabilité : N lectures consécutives dans ±BLE_WEIGHT_STABLE_TOL
        if (bleStableCount == 0 || fabsf(poids - bleStableRef) > BLE_WEIGHT_STABLE_TOL) {
            bleStableRef = poids;
            bleStableCount = 1;
            afficherStatut("Measuring...", PRIMARY_COLOR);
        } else {
            bleStableCount++;
            afficherStatut("Stabilizing...", SUCCESS_COLOR);
        }

        // Validation : poids stable + plage physiologique → étape suivante
        if (bleStableCount >= BLE_WEIGHT_STABLE_COUNT &&
            poids >= WEIGHT_MIN_PHYSIO && poids <= WEIGHT_MAX_PHYSIO) {
            donnees.poids = poids;
            Serial.println("[POIDS] ✅ STABLE: " + String(poids, 2) + " kg");
            afficherStatut("Weight: " + String(poids, 1) + " kg", SUCCESS_COLOR);
            beepMesureComplete();
            delay(800);
            desactiverCapteurPoids();
            changerEtat(AFFICHAGE);
            return;
        }
    }

    // 3) Timeout de détection : aucune donnée BLE reçue de la balance
    if (!utilisateurDetecte && millis() - debutMesurePoids > WEIGHT_TIMEOUT_DETECTION) {
        Serial.println("[POIDS] ⏱️ Timeout: aucune donnée balance reçue");
        afficherStatut("No scale detected", ERROR_COLOR);
        donnees.poids = 0;
        beepWarning();
        delay(1500);
        desactiverCapteurPoids();
        changerEtat(AFFICHAGE);
        return;
    }

    // 4) Timeout absolu : on accepte la dernière valeur si plausible
    if (millis() - debutMesurePoids > WEIGHT_TIMEOUT_TOTAL) {
        if (donnees.poids >= WEIGHT_MIN_PHYSIO && donnees.poids <= WEIGHT_MAX_PHYSIO) {
            Serial.println("[POIDS] ⏱️ Timeout - valeur partielle: " + String(donnees.poids, 2) + " kg");
            afficherStatut("Weight (approx): " + String(donnees.poids, 1) + " kg", WARNING_COLOR);
            beepWarning();
        } else {
            donnees.poids = 0;
            afficherStatut("Measurement failed", ERROR_COLOR);
            beepError();
        }
        delay(1200);
        desactiverCapteurPoids();
        changerEtat(AFFICHAGE);
        return;
    }

    delay(20);
}

// ============================================================
// ÉTAT AFFICHAGE RÉSULTATS - VERSION AMÉLIORÉE ✅
// ============================================================
void setupAffichage() {
desactiverTousCapteurs();
donnees.timestamp = millis();
bool sent = false;
// ⭐⭐ AJOUTER DU DÉBOGAGE CRITIQUE
Serial.println("[AFFICHAGE] === TENTATIVE ENVOI MESURES ===");
Serial.println("[AFFICHAGE] Carte: " + String(etudActuel.uid));
Serial.println("[AFFICHAGE] BPM: " + String(donnees.bpmStable));
Serial.println("[AFFICHAGE] SpO2: " + String(donnees.spo2Stable));
Serial.println("[AFFICHAGE] Temp: " + String(donnees.temperatureStable, 1));
Serial.println("[AFFICHAGE] Poids: " + String(donnees.poids, 1));
if (wifiStat.connected && etudActuel.actif) {
sent = envoyerMesuresServeur(
etudActuel.uid,
donnees.bpmStable, donnees.spo2Stable, donnees.temperatureStable, donnees.poids,
resultatOeux.oeil_gauche, resultatOeux.oeil_gauche_conf,
resultatOeux.oeil_droit, resultatOeux.oeil_droit_conf,
resultatOeux.alerte);
} else {
if (!etudActuel.actif) {
Serial.println("[AFFICHAGE] ❌ Carte non reconnue, ajout à la file d'attente");
}
if (!wifiStat.connected) {
Serial.println("[AFFICHAGE] ⚠️ WiFi déconnecté, ajout à la file d'attente");
}
}
if (!sent) {
Serial.println("[AFFICHAGE] Ajout des mesures à la file d'attente");
ajouterQueue(
etudActuel.uid,
donnees.bpmStable, donnees.spo2Stable, donnees.temperatureStable, donnees.poids);
}
tft.fillScreen(BACKGROUND_COLOR);
dessinerHeader("MEASUREMENT SUMMARY");
// Cadre principal
tft.drawRoundRect(20, 60, SCREEN_W - 40, 200, 15, PRIMARY_COLOR);
int yStart = 80;
int ligneHauteur = 45;
// Ligne 1: BPM et SpO2
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawString("Rythme cardiaque:", 40, yStart, 2);
tft.drawString("Saturation O2:", 260, yStart, 2);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
String bpmText = (donnees.bpmStable > 0) ? String(donnees.bpmStable) + " BPM" : "Non mesure";
tft.drawString(bpmText, 40, yStart + 25, 4);
String spo2Text = (donnees.spo2Stable > 0) ? String(donnees.spo2Stable) + " %" : "Non mesure";
tft.drawString(spo2Text, 260, yStart + 25, 4);
// Ligne 2: Température
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawString("Temperature:", 40, yStart + ligneHauteur, 2);
uint16_t tempColor = TEMP_NORMAL_COLOR;
String tempText = "Non mesuree";
if (donnees.temperatureStable > 0) {
tempText = String(donnees.temperatureStable, 1) + " °C";
if (donnees.temperatureStable >= TEMPERATURE_FIEVRE) tempColor = TEMP_HIGH_COLOR;
else if (donnees.temperatureStable >= TEMPERATURE_FIEVRE_LEGERE) tempColor = TEMP_WARNING_COLOR;
else tempColor = TEMP_NORMAL_COLOR;
}
tft.setTextColor(tempColor, BACKGROUND_COLOR);
tft.drawString(tempText, 40, yStart + ligneHauteur + 25, 4);
// Ligne 3: Poids
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawString("Body weight:", 40, yStart + 2*ligneHauteur, 2);
tft.setTextColor(PRIMARY_COLOR, BACKGROUND_COLOR);
String poidsText = (donnees.poids > 0) ? String(donnees.poids, 1) + " kg" : "Not measured";
tft.drawString(poidsText, 40, yStart + 2*ligneHauteur + 25, 4);
// ⭐⭐ AFFICHAGE RÉSULTATS OCULAIRES - SIMPLIFIÉ (une seule fois)
int yEyes = yStart + 3*ligneHauteur;
tft.drawLine(20, yEyes - 10, SCREEN_W - 20, yEyes - 10, SECONDARY_COLOR);
tft.setTextColor(SECONDARY_COLOR, BACKGROUND_COLOR);
tft.drawString("👁️ Yeux:", 30, yEyes, 2);
if (resultatOeux.disponibles) {
// Affichage compact: G: Sain (90%)  |  D: Cataracte (85%)
uint16_t colorOG = (String(resultatOeux.oeil_gauche) == "Sain") ? SUCCESS_COLOR : ERROR_COLOR;
uint16_t colorOD = (String(resultatOeux.oeil_droit) == "Sain") ? SUCCESS_COLOR : ERROR_COLOR;
tft.setTextColor(colorOG, BACKGROUND_COLOR);
tft.drawString("G: " + String(resultatOeux.oeil_gauche), 30, yEyes + 25, 2);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawString(String(resultatOeux.oeil_gauche_conf * 100, 0) + "%", 30, yEyes + 40, 1);
tft.setTextColor(colorOD, BACKGROUND_COLOR);
tft.drawString("D: " + String(resultatOeux.oeil_droit), 220, yEyes + 25, 2);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawString(String(resultatOeux.oeil_droit_conf * 100, 0) + "%", 220, yEyes + 40, 1);
} else {
tft.setTextColor(WARNING_COLOR, BACKGROUND_COLOR);
tft.drawString("Not available", 30, yEyes + 25, 2);
}
// ⭐⭐ ALERTE VISUELLE SI ANOMALIE DÉTECTÉE
if (resultatOeux.disponibles && resultatOeux.alerte == 1) {
// Affichage alerte en rouge sur toute la largeur
tft.fillRect(0, 280, SCREEN_W, 35, ERROR_COLOR);
tft.setTextColor(TEXT_COLOR, ERROR_COLOR);
tft.drawCentreString("⚠️ ANOMALIE DÉTECTÉE", SCREEN_W / 2, 290, 2);
// Bips d'alerte (triple bip)
beep(NOTE_C5, 100);
delay(100);
beep(NOTE_C5, 100);
delay(100);
beep(NOTE_C5, 100);
}
// Statut envoi
tft.setTextColor(sent ? SUCCESS_COLOR : WARNING_COLOR, BACKGROUND_COLOR);
tft.drawCentreString(sent ? "✓ Data sent to server" : "⚠️ Data awaiting synchronization", SCREEN_W / 2, 320, 1);
Serial.println("\n=== SYNTHESE DES MESURES ===");
Serial.println("Carte RFID: " + String(etudActuel.uid));
Serial.println("BPM: " + String(donnees.bpmStable));
Serial.println("SpO2: " + String(donnees.spo2Stable) + "%");
Serial.println("Température: " + String(donnees.temperatureStable, 1) + "°C");
Serial.println("Poids: " + String(donnees.poids, 1) + "kg");
Serial.println("Oeil Gauche: " + String(resultatOeux.oeil_gauche) + " (" + String(resultatOeux.oeil_gauche_conf, 2) + ")");
Serial.println("Oeil Droit: " + String(resultatOeux.oeil_droit) + " (" + String(resultatOeux.oeil_droit_conf, 2) + ")");
Serial.println("Alerte: " + String(resultatOeux.alerte ? "OUI" : "NON"));
Serial.println("Envoi: " + String(sent ? "Réussi" : "En attente"));
Serial.println("=============================\n");
}
void loopAffichage() {
unsigned long tempsEcoule = millis() - tempsDebutEtat;
int secondesRestantes = (DELAI_AFFICHAGE - tempsEcoule) / 1000 + 1;
if(secondesRestantes < 0) secondesRestantes = 0;
clear(0, SCREEN_H - 25, SCREEN_W, 25);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("New measurement in " + String(secondesRestantes) + " seconds", SCREEN_W / 2, SCREEN_H - 20, 1);
if (tempsEcoule > DELAI_AFFICHAGE) {
beep(NOTE_G4, 100);
changerEtat(BADGE);
}
}
// ============================================================
// COMMANDES SÉRIE
// ============================================================
void handleSerial() {
while (Serial.available()) {
char c = Serial.read();
if (c == '\n' || c == '\r') {
if (inBuf.length() > 0) {
processCmd(inBuf);
inBuf = "";
}
} else inBuf += c;
}
}
void processCmd(String cmd) {
cmd.trim();
String originalCmd = cmd;
cmd.toLowerCase();
if (cmd.startsWith("badge ")) {
String uid = originalCmd.substring(6);
uid.trim();
if (uid.length() > 0) {
Serial.println("Simuler badge: " + uid);
// Réinitialiser etudActuel
memset(&etudActuel, 0, sizeof(Etudiant));
char buf[20];
strncpy(buf, uid.c_str(), 19);
buf[19] = 0;
if (findEtud(buf, &etudActuel)) {
Serial.println("✅ Carte détectée: " + String(etudActuel.uid));
String fullNameCmd = String(etudActuel.prenom) + " " + String(etudActuel.nom);
sendAttendance(etudActuel.uid, fullNameCmd.c_str(), etudActuel.role);
changerEtat(BIENVENUE);
} else {
Serial.println("❌ Carte inconnue: " + uid);
}
return;
}
}
// ⭐⭐ SUPPRIMER les commandes liées au cache
if (cmd == "liste" || cmd == "l") {
Serial.println("❌ Commande désactivée - Mode sans cache EEPROM");
return;
}
if (cmd == "ajouter" || cmd == "add") {
Serial.println("❌ Commande désactivée - Mode sans cache EEPROM");
return;
}
if (cmd.startsWith("sup ")) {
Serial.println("❌ Commande désactivée - Mode sans cache EEPROM");
return;
}
if (cmd == "reset") {
Serial.println("❌ Commande désactivée - Mode sans cache EEPROM");
return;
}
// Garder les autres commandes utiles
if (cmd == "wifi") {
Serial.println("\n=== CONFIG WIFI ===");
Serial.print("SSID: ");
modeWiFiConfig = true;
etapeWiFi = 1;
}
else if (cmd == "queue") {
Serial.println("\n=== QUEUE (" + String(queueSize) + ") ===");
for (int i = 0; i < queueSize; i++) {
Serial.println(String(i + 1) + ". " + queue[i].prenom + " " + queue[i].nom);
}
}
else if (cmd == "sync") {
Serial.println("[SYNC] Force synchronisation...");
traiterQueue();
}
else if (cmd == "poids" || cmd == "p") {
Serial.println("\n=== TEST BALANCE BLE ===");
bool etaitActif = balanceScanActive;
if (!etaitActif) demarrerScanBalance();
Serial.println("Écoute des annonces BLE pendant 5 s...");
unsigned long t0 = millis();
while (millis() - t0 < 5000) {
    if (bleWeightNew) {
        bleWeightNew = false;
        Serial.println("  ⚖️  " + String(bleWeightValue, 2) + " kg");
    }
    delay(20);
    yield();
}
if (!etaitActif) arreterScanBalance();
Serial.println("==========================\n");
}
else if (cmd == "etat" || cmd == "e") {
Serial.println("\n=== ÉTAT ===");
Serial.println("WiFi: " + String(wifiStat.connected ? "OK" : "OFF"));
Serial.println("Queue: " + String(queueSize));
Serial.println("Heap: " + String(ESP.getFreeHeap()));
Serial.println("============\n");
}
else if (cmd == "help" || cmd == "h") {
Serial.println("\n=== COMMANDES ===");
Serial.println("badge UID : Simuler badge");
Serial.println("wifi      : Config WiFi");
Serial.println("queue     : Voir queue");
Serial.println("sync      : Force sync");
Serial.println("etat      : État système");
Serial.println("=================\n");
}
else Serial.println("'help' pour les commandes");
}
// ============================================================
// 🔥 ÉCRAN DÉMARRAGE - ADAPTÉ POUR 480x320 ✅
// ============================================================
void bootScreen() {
Serial.println("\n[BOOT] ========================================");
Serial.println("[BOOT] Affichage écran de démarrage 480x320");
Serial.println("[BOOT] ========================================");
if (TFT_BL >= 0) {
digitalWrite(TFT_BL, TFT_BL_ON);
Serial.println("[BOOT] ✅ Rétroéclairage vérifié");
}
tft.fillScreen(BACKGROUND_COLOR);
delay(100);
// Cadre décoratif
tft.drawRoundRect(15, 15, SCREEN_W - 30, SCREEN_H - 30, 25, PRIMARY_COLOR);
tft.drawRoundRect(17, 17, SCREEN_W - 34, SCREEN_H - 34, 23, HIGHLIGHT_COLOR);
tft.setTextColor(PRIMARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("ROBOT MEDICAL", SCREEN_W / 2, 70, 6);
tft.drawCentreString("SCOLAIRE", SCREEN_W / 2, 130, 6);
Serial.println("[BOOT] Titre affiché");
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Intelligent biometric system", SCREEN_W / 2, 180, 2);
tft.drawCentreString("v5.3 - ESP32 - 480x320", SCREEN_W / 2, 210, 1);
Serial.println("[BOOT] Version affichée");
delay(800);
int bX = 90, bY = 250, bW = 300, bH = 12;
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("System initialization...", SCREEN_W / 2, bY - 25, 1);
tft.drawRect(bX, bY, bW, bH, TEXT_COLOR);
Serial.println("[BOOT] Barre de progression créée");
for (int i = 0; i <= 100; i += 5) {
int fillW = (bW - 2) * i / 100;
tft.fillRect(bX + 1, bY + 1, fillW, bH - 2, PRIMARY_COLOR);
if (i % 25 == 0 && i > 0) {
beep(NOTE_C4 + (i / 25) * 100, 60);
}
delay(35);
}
Serial.println("[BOOT] Animation terminée");
tft.setTextColor(SUCCESS_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("SYSTEM READY", SCREEN_W / 2, 290, 4);
beep(NOTE_C5, 100);
delay(50);
beep(NOTE_E5, 100);
delay(50);
beep(NOTE_G5, 150);
Serial.println("[BOOT] ✅ Écran de démarrage terminé");
delay(800);
tft.fillScreen(BACKGROUND_COLOR);
Serial.println("[BOOT] Écran nettoyé - Prêt pour la suite");
}
// ============================================================
// 🔥 SETUP - ORDRE CRITIQUE CORRIGÉ 🔥
// ============================================================
void setup() {
Serial.begin(115200);
delay(2000);
pinMode(BUZZER_PIN, OUTPUT);
beep(NOTE_C5, 200);
Serial.println("\n");
Serial.println("========================================");
Serial.println("   ROBOT MEDICAL SCOLAIRE v5.4");
Serial.println("   MODE SANS CACHE EEPROM");
Serial.println("   BALANCE BLE ACTIVE");
Serial.println("========================================");
Serial.println();
delay(1000);
Serial.println("[INIT] Étape 1/5 - Écran TFT 480x320...");
initTFT();
delay(300);
Serial.println("[INIT] Étape 2/5 - Écran de démarrage...");
bootScreen();
Serial.println("[INIT] Étape 3/5 - Configuration...");
initConfig();
Serial.println("[INIT] Étape 4/5 - Bus I2C...");
initI2C();
delay(200);
Serial.println("[INIT] Étape 5/7 - Communication ESP32 esclave...");
initRFID();
delay(200);
Serial.println("[INIT] Étape 6/7 - Balance BLE (scan à la demande)...");
// Le stack BLE n'est initialisé que pendant l'étape POIDS (économie de RAM et
// meilleure coexistence avec le WiFi). Rien à initialiser ici.
etatCapteurs.balanceActif = false;
delay(200);
Serial.println("[INIT] Étape 7/7 - Finalisation...");
initBuzzer();
Serial.println();
Serial.println("[INIT] ========================================");
Serial.println("[INIT] ✅ SYSTÈME SANS EEPROM INITIALISÉ");
Serial.println("[INIT] ✅ BALANCE BLE (scan à la demande) PRÊTE");
Serial.println("[INIT] ========================================");
Serial.println();
if (WIFI_ENABLED) {
Serial.println("[INIT] Tentative connexion WiFi...");
tft.fillScreen(BACKGROUND_COLOR);
tft.setTextColor(PRIMARY_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("WiFi Connection...", SCREEN_W / 2, 140, 4);
bool wifiOk = initWiFi();
tft.fillScreen(BACKGROUND_COLOR);
if (wifiOk) {
tft.setTextColor(SUCCESS_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("WiFi connected", SCREEN_W / 2, 120, 4);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString(WiFi.localIP().toString(), SCREEN_W / 2, 170, 2);
Serial.println("[INIT] Affichage résultat WiFi OK");
} else {
tft.setTextColor(WARNING_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("WiFi hors ligne", SCREEN_W / 2, 140, 4);
tft.setTextColor(TEXT_COLOR, BACKGROUND_COLOR);
tft.drawCentreString("Local mode activated", SCREEN_W / 2, 190, 2);
Serial.println("[INIT] Affichage résultat WiFi Offline");
}
delay(1500);
tft.fillScreen(BACKGROUND_COLOR);
Serial.println("[INIT] Écran WiFi nettoyé");
}
Serial.println("\n[INIT] ========================================");
Serial.println("[INIT] DEMARRAGE APPLICATION 480x320");
Serial.println("[INIT] ========================================");
Serial.println("[INIT] Appel changerEtat(BADGE)...");
changerEtat(BADGE);
Serial.println("[INIT] Retour de changerEtat(BADGE)");
Serial.println("[INIT] État actuel: " + String(etatActuel));
Serial.println("========================================");
Serial.println("   SYSTEME OPERATIONNEL 480x320");
Serial.println("   En attente de badge RFID...");
Serial.println("   Tapez 'help' pour les commandes");
Serial.println("========================================\n");
}
// ============================================================
// LOOP PRINCIPAL
// ============================================================
void loop() {
static unsigned long lastDebug = 0;
if (millis() - lastDebug > 10000) {
Serial.println("\n[LOOP] ===== DEBUG ETAT =====");
Serial.println("[LOOP] État: " + String(etatActuel));
Serial.println("[LOOP] Temps écoulé: " + String((millis() - tempsDebutEtat) / 1000) + "s");
Serial.println("[LOOP] Heap libre: " + String(ESP.getFreeHeap()) + " bytes");
if (etatActuel == BADGE) {
sendCommand("PING");
}
Serial.println("[LOOP] ========================\n");
lastDebug = millis();
}

// ⭐⭐⭐ HEARTBEAT AUTOMATIQUE - TOUTES LES 30 SECONDES ⭐⭐⭐
if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
sendHeartbeat();
lastHeartbeat = millis();
}

handleSerial();
switch (etatActuel) {
case BADGE:               loopBadge(); break;
case BIENVENUE:           loopBienvenue(); break;
case RYTHME_CARDIAQUE:    loopRythmeCardiaque(); break;
case TEMPERATURE:         loopTemperature(); break;
case POIDS:               loopPoids(); break;
case AFFICHAGE:           loopAffichage(); break;
default:                  break;
}
delay(10);
}