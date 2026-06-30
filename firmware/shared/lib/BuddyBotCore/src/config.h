#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

// ═══════════════════════════════════════
// BuddyBot Configuration System
// Persists to /config.json on LittleFS
// ═══════════════════════════════════════

// Auto-Detected Hardware Flags

struct BuddyConfig {
    // ── System ──
    int screenRotation; // 0=Portrait, 1=Landscape, 2=Inverted Portrait, 3=Inverted Landscape

    // ── Network ──
    char wifi_ssid1[32];
    char wifi_pass1[64];
    char wifi_ssid2[32];
    char wifi_pass2[64];
    char wifi_ssid3[32];
    char wifi_pass3[64];
    
    // Network & External Devices
    char camIp[32];
    char piIp[32];

    // ── Motors ──
    int motorTrimL;
    int motorTrimR;
    bool motorInvertL;
    bool motorInvertR;
    int motorMaxRPM;  // RPM * 100 multiplier (default 3000 → ±3000 RPM)
    
    // ── Drive Hardware Abstraction ──
    int driveType;        // 0=I2C M5Motors, 1=8Servos, 2=GPIO Servos, 3=GPIO H-Bridge
    int driveChannelL;    // 8Servos Channel L
    int driveChannelR;    // 8Servos Channel R
    int drivePinL1;       // GPIO Servo L / H-Bridge L1
    int drivePinL2;       // H-Bridge L2
    int drivePinR1;       // GPIO Servo R / H-Bridge R1
    int drivePinR2;       // H-Bridge R2
    int pwmFreq;          // GPIO Servo PWM Freq (default 50)
    int pwmMin;           // GPIO Servo Min Pulse (default 500)
    int pwmMax;           // GPIO Servo Max Pulse (default 2500)
    int driveCenterOffsetL; // Offset for 90-degree stop point
    int driveCenterOffsetR;
    int ttlServoTx;
    int ttlServoRx;
    int ttlServoLeftId;
    int ttlServoRightId;
    
    // ── Servos ──
    bool servoInvert[8];
    
    // ── Persona ──
    int blinkRate;
    int eyeSizeX;
    int eyeSizeY;
    int eyeFps;
    uint32_t eyeColorMain;
    uint32_t eyeColorBg;
    int personaType; // 0 = RoboEyes, 1 = StackChan
    bool hasCheeks;
    uint32_t cheekColor;
    int mouthType;
    uint32_t mouthColor;
    int mouthSizeX;
    int mouthSizeY;
    
    // ── API Keys ──
    char geminiApiKey[64];
    
    // ── Hardware State ──
    bool hasServo;
    bool hasCam;
    bool hasPi;
    
    // ── Misc ──
    bool camFlip;
    bool camMirror;
    int speakerVolume;  // 0-255
    
    // ── RPG Progression ──
    int xp;
    int level;
    
    // ── Tuning (Phase 5) ──
    float impactThresholdG;
    float fireTempThreshold;
    int fireGasThreshold;
    
    // ?? Sleep Schedule ??
    int sleepStartH;
    int sleepStartM;
    int wakeStartH;
    int wakeStartM;
};

// Global config instance
extern BuddyConfig buddyConfig;

// Functions
void configSetDefaults();
void configLoad();      // Load from /config.json on LittleFS
void configSave();      // Save to /config.json on LittleFS
String configToJson();  // Serialize current config to JSON string
bool configApply(const char* json, size_t len);
extern bool needsConfigSave;  // Apply JSON patch to config
