/*
 * Test MAX30102 avec ESP32-S3
 * Librairie requise : SparkFun MAX3010x Pulse and Proximity Sensor Library
 * (Arduino IDE > Manage Libraries > "SparkFun MAX3010x")
 */

#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

// ---- Pins I2C ----
#define SDA_PIN 8
#define SCL_PIN 9

MAX30105 particleSensor;

#define BUFFER_LENGTH 100

uint32_t irBuffer[BUFFER_LENGTH];
uint32_t redBuffer[BUFFER_LENGTH];
int32_t spo2;
int8_t validSPO2;
int32_t heartRate;
int8_t validHeartRate;

// Seuil IR pour détecter la présence d'un doigt
#define FINGER_THRESHOLD 50000

void setup() {
    Serial.begin(115200);
    delay(2000);
    Serial.println("=== Test MAX30102 ===");

    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(400000);

    if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
        Serial.println("ERREUR : MAX30102 non détecté. Vérifie le câblage.");
        while (1) delay(1000);
    }

    Serial.println("MAX30102 initialisé avec succès.");

    // Config capteur
    byte ledBrightness = 60;   // 0-255
    byte sampleAverage = 4;    // 1, 2, 4, 8, 16, 32
    byte ledMode = 2;          // 2 = Red + IR (nécessaire pour SpO2)
    byte sampleRate = 100;     // 50, 100, 200, 400, 800, 1000, 1600, 3200
    int pulseWidth = 411;      // 69, 118, 215, 411
    int adcRange = 4096;       // 2048, 4096, 8192, 16384

    particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);

    Serial.println("Place ton doigt sur le capteur...");
}

void loop() {
    // Remplit le buffer (100 échantillons)
    for (byte i = 0; i < BUFFER_LENGTH; i++) {
        while (!particleSensor.available()) {
            particleSensor.check();
        }

        redBuffer[i] = particleSensor.getRed();
        irBuffer[i] = particleSensor.getIR();
        particleSensor.nextSample();
    }

    // Calcule HR et SpO2 sur ce batch
    maxim_heart_rate_and_oxygen_saturation(
        irBuffer, BUFFER_LENGTH, redBuffer,
        &spo2, &validSPO2, &heartRate, &validHeartRate
    );

    // Affichage
    if (irBuffer[BUFFER_LENGTH - 1] < FINGER_THRESHOLD) {
        Serial.println("Aucun doigt détecté");
    } else if (!validHeartRate && !validSPO2) {
        Serial.println("Signal instable — garde le doigt immobile");
    } else {
        Serial.print("Heart rate: ");
        if (validHeartRate) {
            Serial.print(heartRate);
            Serial.print(" bpm");
        } else {
            Serial.print("--");
        }

        Serial.print(" / SpO2: ");
        if (validSPO2) {
            Serial.print(spo2);
            Serial.println(" %");
        } else {
            Serial.println("--");
        }
    }
}