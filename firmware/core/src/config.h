#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

// ═══════════════════════════════════════
// BuddyBot Configuration System
// Persists to /config.json on LittleFS
// ═══════════════════════════════════════

// Auto-Detected Hardware Flags

struct BuddyConfig {
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
