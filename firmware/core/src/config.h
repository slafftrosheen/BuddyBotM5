#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

// ═══════════════════════════════════════
// BuddyBot Configuration System
// Persists to /config.json on SD card
// ═══════════════════════════════════════

// Build Tier (set at compile time via platformio.ini)
#ifdef BUDDY_TIER_MAX
    #define BUDDY_TIER 2
#elif defined(BUDDY_TIER_PRO)
    #define BUDDY_TIER 1
#else
    #define BUDDY_TIER 0  // Lite is default
#endif

struct BuddyConfig {
    // ── Network ──
    char wifi_ssid1[32];
    char wifi_pass1[64];
    char wifi_ssid2[32];
    char wifi_pass2[64];
    char wifi_ssid3[32];
    char wifi_pass3[64];
    
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
    
    // ── API Keys ──
    char geminiApiKey[64];
    
    // ── Build Tier ──
    // 0=Lite, 1=Pro, 2=Max
    // Auto-detected at boot, can be overridden in config
    int buildTier;
    
    // ── Misc ──
    bool camFlip;
    bool camMirror;
    int speakerVolume;  // 0-255
};

// Global config instance
extern BuddyConfig buddyConfig;

// Functions
void configSetDefaults();
void configLoad();      // Load from /config.json on SD
void configSave();      // Save to /config.json on SD
String configToJson();  // Serialize current config to JSON string
bool configApply(const char* json, size_t len);  // Apply JSON patch to config
