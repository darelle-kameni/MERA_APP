/*
 * MAX30100 - Lecture optimisée pour ESP32-S3
 * Utilise une tâche FreeRTOS dédiée sur le Core 0 pour garantir
 * un échantillonnage régulier, indépendant du BLE (Core 1 / loop principal).
 */

#include <Wire.h>
#include "MAX30100_PulseOximeter.h"

// ---- Config pins I2C ----
#define SDA_PIN 8
#define SCL_PIN 9

// ---- Config capteur ----
#define REPORTING_PERIOD_MS 2000

PulseOximeter pox;

// Variables partagées entre tâches (protégées par mutex)
SemaphoreHandle_t dataMutex;
volatile float sharedHeartRate = 0;
volatile uint8_t sharedSpO2 = 0;
volatile bool fingerDetected = false;

uint32_t tsLastBeat = 0;

void onBeatDetected() {
    tsLastBeat = millis();
    Serial.println(">> Beat détecté");
}

// ---- Tâche dédiée MAX30100 (Core 0) ----
void max30100Task(void *pvParameters) {
    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(400000); // I2C fast mode, améliore la stabilité d'échantillonnage

    if (!pox.begin()) {
        Serial.println("FAILED to init MAX30100");
        vTaskDelete(NULL);
        return;
    }

    // Forcer le mode SpO2 + HR (sinon parfois init en HR only)
    pox.setIRLedCurrent(MAX30100_LED_CURR_7_6MA); // ajuste selon la peau/doigt
    pox.setOnBeatDetectedCallback(onBeatDetected);

    Serial.println("MAX30100 initialisé, tâche démarrée");

    for (;;) {
        pox.update(); // doit être appelé le plus souvent possible, jamais bloqué

        // Détection présence doigt : pas de battement depuis 3s = probablement retiré
        bool finger = (millis() - tsLastBeat) < 3000;

        if (xSemaphoreTake(dataMutex, (TickType_t)5) == pdTRUE) {
            sharedHeartRate = pox.getHeartRate();
            sharedSpO2 = pox.getSpO2();
            fingerDetected = finger;
            xSemaphoreGive(dataMutex);
        }

        vTaskDelay(1 / portTICK_PERIOD_MS); // laisse respirer l'ordonnanceur sans casser le sampling
    }
}

void setup() {
    Serial.begin(115200);
    delay(500);

    dataMutex = xSemaphoreCreateMutex();

    // Tâche MAX30100 sur Core 0, priorité haute pour ne pas être coupée
    xTaskCreatePinnedToCore(
        max30100Task,
        "MAX30100_Task",
        4096,
        NULL,
        2,          // priorité (2 = plus prioritaire que loop() par défaut)
        NULL,
        0           // Core 0 -> laisse le Core 1 libre pour ton BLE / reste de l'app
    );
}

void loop() {
    static uint32_t tsLastReport = 0;

    if (millis() - tsLastReport > REPORTING_PERIOD_MS) {
        float hr;
        uint8_t spo2;
        bool finger;

        if (xSemaphoreTake(dataMutex, (TickType_t)10) == pdTRUE) {
            hr = sharedHeartRate;
            spo2 = sharedSpO2;
            finger = fingerDetected;
            xSemaphoreGive(dataMutex);

            if (!finger) {
                Serial.println("Aucun doigt détecté");
            } else {
                Serial.printf("Heart rate: %.2f bpm / SpO2: %d %%\n", hr, spo2);
            }
        }

        tsLastReport = millis();
    }

    // Le reste de ton code (BLE, ESP32-S3 sensors, etc.) tourne ici sans bloquer le capteur
}