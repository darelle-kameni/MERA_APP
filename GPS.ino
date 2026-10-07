#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include "MAX30100_PulseOximeter.h"    // Bibliothèque "MAX30100lib" par OXullo (Arduino Library Manager)
#include <TinyGPSPlus.h>      // Bibliothèque "TinyGPSPlus" par Mikal Hart

// ---------- Écran TFT (SPI) ----------
#define TFT_CS   10
#define TFT_DC   5
#define TFT_RST  14
#define TFT_MOSI 11
#define TFT_SCLK 12
SPIClass spiTFT(FSPI);
Adafruit_ST7735 tft = Adafruit_ST7735(&spiTFT, TFT_CS, TFT_DC, TFT_RST);

// ---------- MAX30100 (I2C) ----------
#define I2C_SDA  8
#define I2C_SCL  9
PulseOximeter pox;

// Variables partagées entre tâches (protégées par mutex)
SemaphoreHandle_t dataMutex;
volatile float sharedHeartRate = 0;
volatile uint8_t sharedSpO2 = 0;
volatile bool fingerDetected = false;
volatile uint32_t tsLastBeat = 0;
volatile float measuredBPM = 0;

void onBeatDetected() {
  uint32_t maintenant = millis();
  uint32_t intervalle = maintenant - tsLastBeat;
  tsLastBeat = maintenant;

  if (intervalle > 0) {
    float bpm = 60000.0f / intervalle;
    if (bpm > 40 && bpm < 220) {
      measuredBPM = bpm;
    }
  }
  Serial.println(">> Beat detecte");
}

// ---- Tâche dédiée MAX30100 (Core 0) ----
void max30100Task(void *pvParameters) {
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);

  // Diagnostic : liste les adresses I2C présentes sur le bus
  Serial.printf("Scan I2C (SDA=%d, SCL=%d) : ", I2C_SDA, I2C_SCL);
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("0x%02X ", addr);
    }
  }
  Serial.println();

  if (!pox.begin()) {
    Serial.println("FAILED to init MAX30100");
    vTaskDelete(NULL);
    return;
  }

  pox.setIRLedCurrent(MAX30100_LED_CURR_7_6MA);
  pox.setOnBeatDetectedCallback(onBeatDetected);

  Serial.println("MAX30100 initialise, tache demarree");

  for (;;) {
    pox.update();

    // Pas de battement depuis 3 s = doigt probablement retiré
    bool finger = (millis() - tsLastBeat) < 3000;

    if (xSemaphoreTake(dataMutex, (TickType_t)5) == pdTRUE) {
      sharedHeartRate = measuredBPM;
      sharedSpO2 = pox.getSpO2();
      fingerDetected = finger;
      xSemaphoreGive(dataMutex);
    }

    vTaskDelay(1 / portTICK_PERIOD_MS);
  }
}

// ---------- GPS (UART) ----------
#define GPS_RX   17   // vers TX du module GPS
#define GPS_TX   18   // vers RX du module GPS
HardwareSerial gpsSerial(1);
TinyGPSPlus gps;

void afficherMessage(const char* ligne1, const char* ligne2 = "", uint16_t couleur1 = ST77XX_WHITE, uint16_t couleur2 = ST77XX_GREEN) {
  tft.fillScreen(ST77XX_BLACK);
  tft.setCursor(5, 40);
  tft.setTextSize(2);
  tft.setTextColor(couleur1);
  tft.println(ligne1);
  tft.setCursor(5, 70);
  tft.setTextColor(couleur2);
  tft.println(ligne2);
}

void mesurerPouls() {
  afficherMessage("Posez le doigt", "sur le capteur", ST77XX_WHITE, ST77XX_YELLOW);

  unsigned long depart = millis();
  float hr = 0;

  while (millis() - depart < 15000) {   // timeout 15 s
    if (xSemaphoreTake(dataMutex, (TickType_t)10) == pdTRUE) {
      hr = sharedHeartRate;
      bool finger = fingerDetected;
      xSemaphoreGive(dataMutex);

      if (hr > 0 && finger) break;
    }
    delay(50);
  }

  if (hr > 0) {
    char buf[16];
    dtostrf(hr, 4, 1, buf);
    String txt = String(buf) + " bpm";
    afficherMessage("Pouls :", txt.c_str(), ST77XX_WHITE, ST77XX_CYAN);
  } else {
    afficherMessage("Erreur", "signal", ST77XX_WHITE, ST77XX_RED);
  }
  delay(3000);
}

void afficherCoordonneesGPS() {
  afficherMessage("Recherche", "GPS...", ST77XX_WHITE, ST77XX_YELLOW);

  unsigned long depart = millis();
  bool fixObtenu = false;

  while (millis() - depart < 10000) {   // timeout 10 s
    while (gpsSerial.available() > 0) {
      gps.encode(gpsSerial.read());
    }
    if (gps.location.isValid() && gps.location.isUpdated()) {
      fixObtenu = true;
      break;
    }
  }

  if (fixObtenu) {
    char lat[16], lon[16];
    dtostrf(gps.location.lat(), 8, 5, lat);
    dtostrf(gps.location.lng(), 8, 5, lon);
    afficherMessage(lat, lon, ST77XX_WHITE, ST77XX_CYAN);
  } else {
    afficherMessage("GPS non", "disponible", ST77XX_WHITE, ST77XX_RED);
  }
  delay(4000);
}

void setup() {
  Serial.begin(115200);

  // Écran
  spiTFT.begin(TFT_SCLK, -1, TFT_MOSI, TFT_CS);
  tft.initR(INITR_144GREENTAB);
  tft.setRotation(0);
  tft.fillScreen(ST77XX_BLACK);
  tft.setTextSize(2);
  tft.setCursor(10, 50);
  tft.setTextColor(ST77XX_WHITE);
  tft.print("Bonjour ");
  tft.setTextColor(ST77XX_GREEN);
  tft.println("LABO GIT");
  delay(2000);

  // MAX30100 : tâche dédiée sur Core 0
  dataMutex = xSemaphoreCreateMutex();
  xTaskCreatePinnedToCore(
    max30100Task,
    "MAX30100_Task",
    4096,
    NULL,
    2,
    NULL,
    0
  );

  // GPS
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
}

void loop() {
  mesurerPouls();
  afficherCoordonneesGPS();
}
