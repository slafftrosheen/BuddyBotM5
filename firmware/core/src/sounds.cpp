#include "sounds.h"
#include <M5CoreS3.h>

void initSoundPlayer() {
    Serial.println("[Sound] Procedural tones initialized");
}

void playWavFile(const char* path) {
    // Legacy support, map common names if possible
    String name = String(path);
    name.replace("/sounds/", "");
    name.replace(".wav", "");
    playSound(name.c_str());
}

void playSound(const char* name) {
    Serial.printf("[Sound] Playing procedural tone: %s\n", name);
    
    String sName = String(name);
    sName.toLowerCase();

    if (sName == "happy") {
        M5.Speaker.tone(1000, 100); delay(100);
        M5.Speaker.tone(1500, 150); delay(150);
        M5.Speaker.tone(2000, 200);
    } else if (sName == "sad") {
        M5.Speaker.tone(800, 200); delay(200);
        M5.Speaker.tone(600, 200); delay(200);
        M5.Speaker.tone(400, 400);
    } else if (sName == "alert" || sName == "startup") {
        M5.Speaker.tone(2000, 100); delay(100);
        M5.Speaker.tone(2000, 100); delay(100);
        M5.Speaker.tone(2000, 100);
    } else if (sName == "eat" || sName == "yummy") {
        M5.Speaker.tone(1200, 100); delay(150);
        M5.Speaker.tone(1400, 100); delay(150);
        M5.Speaker.tone(1600, 100);
    } else if (sName == "level_up") {
        M5.Speaker.tone(523, 150); delay(150);
        M5.Speaker.tone(659, 150); delay(150);
        M5.Speaker.tone(783, 150); delay(150);
        M5.Speaker.tone(1046, 300); delay(300);
    } else if (sName == "purr") {
        for(int i=0; i<5; i++) {
            M5.Speaker.tone(100, 50); delay(60);
            M5.Speaker.tone(120, 50); delay(60);
        }
    } else if (sName == "sneeze") {
        M5.Speaker.tone(3000, 50); delay(100);
        M5.Speaker.tone(4000, 50); delay(50);
        M5.Speaker.tone(1000, 200); delay(200);
    } else if (sName == "snore") {
        M5.Speaker.tone(150, 400); delay(450);
        M5.Speaker.tone(100, 600); delay(650);
    } else if (sName == "whistle") {
        M5.Speaker.tone(1500, 150); delay(150);
        M5.Speaker.tone(2500, 300); delay(300);
    } else if (sName == "hurt") {
        M5.Speaker.tone(500, 100); delay(100);
        M5.Speaker.tone(300, 200); delay(200);
    } else if (sName == "siren") {
        for(int i=0; i<3; i++) {
            M5.Speaker.tone(800, 300); delay(300);
            M5.Speaker.tone(1200, 300); delay(300);
        }
    } else if (sName == "laugh") {
        M5.Speaker.tone(1500, 100); delay(150);
        M5.Speaker.tone(1400, 100); delay(150);
        M5.Speaker.tone(1500, 100); delay(150);
        M5.Speaker.tone(1400, 200); delay(200);
    } else if (sName == "horn") {
        M5.Speaker.tone(300, 500); delay(500);
        M5.Speaker.tone(300, 500); delay(500);
    } else if (sName == "r2d2") {
        M5.Speaker.tone(2000, 100); delay(100);
        M5.Speaker.tone(3000, 150); delay(150);
        M5.Speaker.tone(1500, 50); delay(50);
        M5.Speaker.tone(2500, 200); delay(200);
    } else if (sName == "melody") {
        M5.Speaker.tone(523, 200); delay(250);
        M5.Speaker.tone(659, 200); delay(250);
        M5.Speaker.tone(783, 200); delay(250);
        M5.Speaker.tone(1046, 400); delay(450);
    } else if (sName == "kick") {
        M5.Speaker.tone(100, 100); delay(100);
    } else if (sName == "snare") {
        M5.Speaker.tone(600, 50); delay(50);
        M5.Speaker.tone(800, 100); delay(100);
    } else if (sName == "hihat") {
        M5.Speaker.tone(4000, 20); delay(20);
    } else if (sName == "scratch") {
        M5.Speaker.tone(2000, 50); delay(50);
        M5.Speaker.tone(1500, 50); delay(50);
        M5.Speaker.tone(2500, 100); delay(100);
    } else {
        // Default beep
        M5.Speaker.tone(1000, 200);
    }
}

// ═══════════════════════════════════════
// Async wrapper
// ═══════════════════════════════════════

static TaskHandle_t soundTaskHandle = nullptr;
static char asyncSoundName[32] = {0};

void playSoundAsync(const char* name) {
    if (soundTaskHandle != nullptr) {
        Serial.println("[Sound] Already playing async!");
        return;
    }
    
    strncpy(asyncSoundName, name, sizeof(asyncSoundName) - 1);
    
    xTaskCreatePinnedToCore(
        [](void* param) {
            playSound(asyncSoundName);
            soundTaskHandle = nullptr;
            vTaskDelete(NULL);
        },
        "SoundTask",
        4096,
        NULL,
        1,
        &soundTaskHandle,
        0
    );
}
