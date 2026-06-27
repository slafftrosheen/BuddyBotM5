#include "sounds.h"
#include <SD.h>
#include <M5CoreS3.h>

// ═══════════════════════════════════════
// WAV File Playback from SD Card
// ═══════════════════════════════════════

// WAV header structure (44 bytes)
struct WavHeader {
    char riff[4];           // "RIFF"
    uint32_t fileSize;
    char wave[4];           // "WAVE"
    char fmt[4];            // "fmt "
    uint32_t fmtSize;
    uint16_t audioFormat;   // 1 = PCM
    uint16_t numChannels;
    uint32_t sampleRate;
    uint32_t byteRate;
    uint16_t blockAlign;
    uint16_t bitsPerSample;
    char data[4];           // "data"
    uint32_t dataSize;
};

// Playback buffer in PSRAM (64KB chunks)
static uint8_t* wavPlayBuf = nullptr;
static const size_t WAV_BUF_SIZE = 64 * 1024;

// Async playback state
static TaskHandle_t soundTaskHandle = nullptr;
static char asyncSoundName[32] = {0};

void initSoundPlayer() {
    // Check /sounds/ directory exists
    if (!SD.exists("/sounds")) {
        Serial.println("[Sound] /sounds/ directory not found on SD card");
        SD.mkdir("/sounds");
        Serial.println("[Sound] Created /sounds/ directory");
    } else {
        Serial.println("[Sound] /sounds/ directory found");
    }

    // Pre-allocate playback buffer in PSRAM
    wavPlayBuf = (uint8_t*)ps_malloc(WAV_BUF_SIZE);
    if (!wavPlayBuf) {
        wavPlayBuf = (uint8_t*)malloc(WAV_BUF_SIZE);
    }
    if (wavPlayBuf) {
        Serial.println("[Sound] Playback buffer allocated");
    } else {
        Serial.println("[Sound] WARNING: Failed to allocate playback buffer!");
    }
}

// Play a WAV file from an absolute path on SD
void playWavFile(const char* path) {
    if (!wavPlayBuf) {
        Serial.println("[Sound] No playback buffer!");
        return;
    }

    File f = SD.open(path, FILE_READ);
    if (!f) {
        Serial.printf("[Sound] File not found: %s\n", path);
        return;
    }

    // Read WAV header
    WavHeader hdr;
    if (f.read((uint8_t*)&hdr, sizeof(WavHeader)) != sizeof(WavHeader)) {
        Serial.println("[Sound] Failed to read WAV header");
        f.close();
        return;
    }

    // Validate
    if (memcmp(hdr.riff, "RIFF", 4) != 0 || memcmp(hdr.wave, "WAVE", 4) != 0) {
        Serial.println("[Sound] Invalid WAV file");
        f.close();
        return;
    }

    uint32_t sampleRate = hdr.sampleRate;
    uint32_t dataSize = hdr.dataSize;

    Serial.printf("[Sound] Playing: %s (%dHz, %d bytes)\n", path, sampleRate, dataSize);

    // Read and play in chunks
    uint32_t remaining = dataSize;
    while (remaining > 0) {
        size_t toRead = remaining > WAV_BUF_SIZE ? WAV_BUF_SIZE : remaining;
        size_t bytesRead = f.read(wavPlayBuf, toRead);
        if (bytesRead == 0) break;

        M5.Speaker.playRaw((int16_t*)wavPlayBuf, bytesRead / 2, sampleRate, false, 1);
        // Wait for this chunk to finish before loading next
        while (M5.Speaker.isPlaying()) {
            delay(1);
        }

        remaining -= bytesRead;
    }

    f.close();
}

// ═══════════════════════════════════════
// Tone Fallback (when WAV file is missing)
// ═══════════════════════════════════════
static void playToneFallback(const char* name) {
    if (strcmp(name, "beep") == 0) {
        M5.Speaker.tone(1000, 200);
    } else if (strcmp(name, "siren") == 0) {
        for (int i = 0; i < 3; i++) {
            M5.Speaker.tone(800, 150); delay(200);
            M5.Speaker.tone(1200, 150); delay(200);
        }
    } else if (strcmp(name, "laugh") == 0) {
        int notes[] = {500, 600, 700, 600, 500, 700, 800};
        for (int i = 0; i < 7; i++) {
            M5.Speaker.tone(notes[i], 80); delay(100);
        }
    } else if (strcmp(name, "horn") == 0) {
        M5.Speaker.tone(300, 500);
    } else if (strcmp(name, "r2d2") == 0) {
        int freqs[] = {2000, 1500, 2500, 1800, 2200, 1000, 3000, 1200};
        for (int i = 0; i < 8; i++) {
            M5.Speaker.tone(freqs[i], 60); delay(80);
        }
    } else if (strcmp(name, "melody") == 0 || strcmp(name, "levelup") == 0) {
        int notes[] = {262, 294, 330, 349, 392, 440, 494, 523};
        for (int i = 0; i < 8; i++) {
            M5.Speaker.tone(notes[i], 150); delay(180);
        }
    } else if (strcmp(name, "purr") == 0) {
        for (int i = 0; i < 5; i++) {
            M5.Speaker.tone(150, 100); delay(120);
            M5.Speaker.tone(120, 100); delay(120);
        }
    } else if (strcmp(name, "sneeze") == 0) {
        M5.Speaker.tone(2000, 50); delay(100);
        M5.Speaker.tone(3000, 150);
    } else if (strcmp(name, "whistle") == 0) {
        M5.Speaker.tone(1500, 200); delay(250);
        M5.Speaker.tone(2000, 400);
    } else if (strcmp(name, "snore") == 0) {
        M5.Speaker.tone(200, 800); delay(900);
        M5.Speaker.tone(400, 400);
    } else if (strcmp(name, "eat") == 0) {
        for (int i = 0; i < 4; i++) {
            M5.Speaker.tone(800 + (i*100), 50); delay(60);
        }
    } else if (strcmp(name, "startup") == 0) {
        M5.Speaker.tone(1000, 100); delay(120);
        M5.Speaker.tone(1500, 100); delay(120);
        M5.Speaker.tone(2000, 150);
    } else if (strcmp(name, "kick") == 0) {
        M5.Speaker.tone(80, 100);
    } else if (strcmp(name, "snare") == 0) {
        M5.Speaker.tone(300, 50);
    } else if (strcmp(name, "hihat") == 0) {
        M5.Speaker.tone(6000, 30);
    } else if (strcmp(name, "scratch") == 0) {
        for (int i = 0; i < 4; i++) {
            M5.Speaker.tone(1000 + random(2000), 30); delay(40);
        }
    } else {
        // Unknown sound — generic beep
        M5.Speaker.tone(800, 100);
    }
}

// ═══════════════════════════════════════
// Main playSound — tries WAV first, falls back to tone
// ═══════════════════════════════════════
void playSound(const char* name) {
    // Build path: /sounds/<name>.wav
    char path[64];
    snprintf(path, sizeof(path), "/sounds/%s.wav", name);

    if (SD.exists(path)) {
        playWavFile(path);
    } else {
        Serial.printf("[Sound] WAV not found: %s — using tone fallback\n", path);
        playToneFallback(name);
    }
}

// ═══════════════════════════════════════
// Async playback (FreeRTOS task)
// ═══════════════════════════════════════
static void soundTaskFunc(void* param) {
    const char* name = (const char*)param;
    playSound(name);
    soundTaskHandle = nullptr;
    vTaskDelete(NULL);
}

void playSoundAsync(const char* name) {
    // Kill previous task if still running
    if (soundTaskHandle != nullptr) {
        vTaskDelete(soundTaskHandle);
        soundTaskHandle = nullptr;
    }
    strlcpy(asyncSoundName, name, sizeof(asyncSoundName));
    xTaskCreatePinnedToCore(soundTaskFunc, "sound", 8192, (void*)asyncSoundName, 1, &soundTaskHandle, 0);
}

void stopSound() {
    M5.Speaker.stop();
    if (soundTaskHandle != nullptr) {
        vTaskDelete(soundTaskHandle);
        soundTaskHandle = nullptr;
    }
}
