#include "config.h"
#include <SD.h>

// Global config instance
BuddyConfig buddyConfig;

// ═══════════════════════════════════════
// Default Configuration Values
// ═══════════════════════════════════════
void configSetDefaults() {
    // Network — configure via /config.json on SD card or web UI
    memset(buddyConfig.wifi_ssid1, 0, sizeof(buddyConfig.wifi_ssid1));
    memset(buddyConfig.wifi_pass1, 0, sizeof(buddyConfig.wifi_pass1));
    memset(buddyConfig.wifi_ssid2, 0, sizeof(buddyConfig.wifi_ssid2));
    memset(buddyConfig.wifi_pass2, 0, sizeof(buddyConfig.wifi_pass2));
    memset(buddyConfig.wifi_ssid3, 0, sizeof(buddyConfig.wifi_ssid3));
    memset(buddyConfig.wifi_pass3, 0, sizeof(buddyConfig.wifi_pass3));

    // Motors
    buddyConfig.motorTrimL = 0;
    buddyConfig.motorTrimR = 0;
    buddyConfig.motorInvertL = false;
    buddyConfig.motorInvertR = false;
    buddyConfig.motorMaxRPM = 3000;

    // Servos
    for (int i = 0; i < 8; i++) {
        buddyConfig.servoInvert[i] = false;
    }

    // Persona
    strlcpy(buddyConfig.eyeColorHex, "#00f3ff", sizeof(buddyConfig.eyeColorHex));
    buddyConfig.eyeSize = 30;
    buddyConfig.blinkRate = 3000;

    // API Keys
    memset(buddyConfig.geminiApiKey, 0, sizeof(buddyConfig.geminiApiKey));

    // Build Tier — use compile-time default, can be overridden
    buddyConfig.buildTier = BUDDY_TIER;

    // Misc
    buddyConfig.camFlip = false;
    buddyConfig.camMirror = false;
    buddyConfig.speakerVolume = 128;
}

// ═══════════════════════════════════════
// Load config from /config.json on SD
// ═══════════════════════════════════════
void configLoad() {
    configSetDefaults();

    if (!SD.exists("/config.json")) {
        Serial.println("[Config] No config.json found, using defaults.");
        configSave(); // Create the file with defaults
        return;
    }

    File f = SD.open("/config.json", FILE_READ);
    if (!f) {
        Serial.println("[Config] Failed to open config.json");
        return;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, f);
    f.close();

    if (err) {
        Serial.printf("[Config] Parse error: %s\n", err.c_str());
        return;
    }

    // Network
    if (doc.containsKey("wifi_ssid1")) strlcpy(buddyConfig.wifi_ssid1, doc["wifi_ssid1"], sizeof(buddyConfig.wifi_ssid1));
    if (doc.containsKey("wifi_pass1")) strlcpy(buddyConfig.wifi_pass1, doc["wifi_pass1"], sizeof(buddyConfig.wifi_pass1));
    if (doc.containsKey("wifi_ssid2")) strlcpy(buddyConfig.wifi_ssid2, doc["wifi_ssid2"], sizeof(buddyConfig.wifi_ssid2));
    if (doc.containsKey("wifi_pass2")) strlcpy(buddyConfig.wifi_pass2, doc["wifi_pass2"], sizeof(buddyConfig.wifi_pass2));
    if (doc.containsKey("wifi_ssid3")) strlcpy(buddyConfig.wifi_ssid3, doc["wifi_ssid3"], sizeof(buddyConfig.wifi_ssid3));
    if (doc.containsKey("wifi_pass3")) strlcpy(buddyConfig.wifi_pass3, doc["wifi_pass3"], sizeof(buddyConfig.wifi_pass3));

    // Motors
    if (doc.containsKey("motorTrimL")) buddyConfig.motorTrimL = doc["motorTrimL"];
    if (doc.containsKey("motorTrimR")) buddyConfig.motorTrimR = doc["motorTrimR"];
    if (doc.containsKey("motorInvertL")) buddyConfig.motorInvertL = doc["motorInvertL"];
    if (doc.containsKey("motorInvertR")) buddyConfig.motorInvertR = doc["motorInvertR"];
    if (doc.containsKey("motorMaxRPM")) buddyConfig.motorMaxRPM = doc["motorMaxRPM"];

    // Servos
    if (doc.containsKey("servoInvert")) {
        JsonArray arr = doc["servoInvert"].as<JsonArray>();
        for (int i = 0; i < 8 && i < (int)arr.size(); i++) {
            buddyConfig.servoInvert[i] = arr[i];
        }
    }

    // Persona
    if (doc.containsKey("eyeColorHex")) strlcpy(buddyConfig.eyeColorHex, doc["eyeColorHex"], sizeof(buddyConfig.eyeColorHex));
    if (doc.containsKey("eyeSize")) buddyConfig.eyeSize = doc["eyeSize"];
    if (doc.containsKey("blinkRate")) buddyConfig.blinkRate = doc["blinkRate"];

    // API Keys
    if (doc.containsKey("geminiApiKey")) strlcpy(buddyConfig.geminiApiKey, doc["geminiApiKey"], sizeof(buddyConfig.geminiApiKey));

    // Build Tier
    if (doc.containsKey("buildTier")) buddyConfig.buildTier = doc["buildTier"];

    // Misc
    if (doc.containsKey("camFlip")) buddyConfig.camFlip = doc["camFlip"];
    if (doc.containsKey("camMirror")) buddyConfig.camMirror = doc["camMirror"];
    if (doc.containsKey("speakerVolume")) buddyConfig.speakerVolume = doc["speakerVolume"];

    Serial.printf("[Config] Loaded. Tier=%d, InvertL=%d, InvertR=%d\n",
        buddyConfig.buildTier, buddyConfig.motorInvertL, buddyConfig.motorInvertR);
}

// ═══════════════════════════════════════
// Save config to /config.json on SD
// ═══════════════════════════════════════
void configSave() {
    if (SD.exists("/config.json")) {
        SD.remove("/config.json");
    }

    File f = SD.open("/config.json", FILE_WRITE);
    if (!f) {
        Serial.println("[Config] Failed to create config.json");
        return;
    }

    JsonDocument doc;

    // Network
    doc["wifi_ssid1"] = buddyConfig.wifi_ssid1;
    doc["wifi_pass1"] = buddyConfig.wifi_pass1;
    doc["wifi_ssid2"] = buddyConfig.wifi_ssid2;
    doc["wifi_pass2"] = buddyConfig.wifi_pass2;
    doc["wifi_ssid3"] = buddyConfig.wifi_ssid3;
    doc["wifi_pass3"] = buddyConfig.wifi_pass3;

    // Motors
    doc["motorTrimL"] = buddyConfig.motorTrimL;
    doc["motorTrimR"] = buddyConfig.motorTrimR;
    doc["motorInvertL"] = buddyConfig.motorInvertL;
    doc["motorInvertR"] = buddyConfig.motorInvertR;
    doc["motorMaxRPM"] = buddyConfig.motorMaxRPM;

    // Servos
    JsonArray servos = doc["servoInvert"].to<JsonArray>();
    for (int i = 0; i < 8; i++) {
        servos.add(buddyConfig.servoInvert[i]);
    }

    // Persona
    doc["eyeColorHex"] = buddyConfig.eyeColorHex;
    doc["eyeSize"] = buddyConfig.eyeSize;
    doc["blinkRate"] = buddyConfig.blinkRate;

    // API Keys
    doc["geminiApiKey"] = buddyConfig.geminiApiKey;

    // Build Tier
    doc["buildTier"] = buddyConfig.buildTier;

    // Misc
    doc["camFlip"] = buddyConfig.camFlip;
    doc["camMirror"] = buddyConfig.camMirror;
    doc["speakerVolume"] = buddyConfig.speakerVolume;

    serializeJsonPretty(doc, f);
    f.close();
    Serial.println("[Config] Saved to SD.");
}

// ═══════════════════════════════════════
// Serialize config to JSON string
// ═══════════════════════════════════════
String configToJson() {
    JsonDocument doc;

    doc["wifi_ssid1"] = buddyConfig.wifi_ssid1;
    doc["wifi_ssid2"] = buddyConfig.wifi_ssid2;
    doc["wifi_ssid3"] = buddyConfig.wifi_ssid3;
    // NOTE: passwords are NOT sent to the UI for security

    doc["motorTrimL"] = buddyConfig.motorTrimL;
    doc["motorTrimR"] = buddyConfig.motorTrimR;
    doc["motorInvertL"] = buddyConfig.motorInvertL;
    doc["motorInvertR"] = buddyConfig.motorInvertR;
    doc["motorMaxRPM"] = buddyConfig.motorMaxRPM;

    JsonArray servos = doc["servoInvert"].to<JsonArray>();
    for (int i = 0; i < 8; i++) {
        servos.add(buddyConfig.servoInvert[i]);
    }

    doc["eyeColorHex"] = buddyConfig.eyeColorHex;
    doc["eyeSize"] = buddyConfig.eyeSize;
    doc["blinkRate"] = buddyConfig.blinkRate;

    // Mask API key — only show last 4 chars
    String maskedKey = "****";
    String key = String(buddyConfig.geminiApiKey);
    if (key.length() > 4) {
        maskedKey = "****" + key.substring(key.length() - 4);
    }
    doc["geminiApiKey"] = maskedKey;

    doc["buildTier"] = buddyConfig.buildTier;
    doc["camFlip"] = buddyConfig.camFlip;
    doc["camMirror"] = buddyConfig.camMirror;
    doc["speakerVolume"] = buddyConfig.speakerVolume;

    String result;
    serializeJson(doc, result);
    return result;
}

// ═══════════════════════════════════════
// Apply a JSON patch to the config
// Only updates fields that are present in the JSON
// ═══════════════════════════════════════
bool configApply(const char* json, size_t len) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, json, len);
    if (err) {
        Serial.printf("[Config] Apply parse error: %s\n", err.c_str());
        return false;
    }

    // Network
    if (doc.containsKey("wifi_ssid1")) strlcpy(buddyConfig.wifi_ssid1, doc["wifi_ssid1"], sizeof(buddyConfig.wifi_ssid1));
    if (doc.containsKey("wifi_pass1")) strlcpy(buddyConfig.wifi_pass1, doc["wifi_pass1"], sizeof(buddyConfig.wifi_pass1));
    if (doc.containsKey("wifi_ssid2")) strlcpy(buddyConfig.wifi_ssid2, doc["wifi_ssid2"], sizeof(buddyConfig.wifi_ssid2));
    if (doc.containsKey("wifi_pass2")) strlcpy(buddyConfig.wifi_pass2, doc["wifi_pass2"], sizeof(buddyConfig.wifi_pass2));
    if (doc.containsKey("wifi_ssid3")) strlcpy(buddyConfig.wifi_ssid3, doc["wifi_ssid3"], sizeof(buddyConfig.wifi_ssid3));
    if (doc.containsKey("wifi_pass3")) strlcpy(buddyConfig.wifi_pass3, doc["wifi_pass3"], sizeof(buddyConfig.wifi_pass3));

    // Motors
    if (doc.containsKey("motorTrimL")) buddyConfig.motorTrimL = doc["motorTrimL"];
    if (doc.containsKey("motorTrimR")) buddyConfig.motorTrimR = doc["motorTrimR"];
    if (doc.containsKey("motorInvertL")) buddyConfig.motorInvertL = doc["motorInvertL"];
    if (doc.containsKey("motorInvertR")) buddyConfig.motorInvertR = doc["motorInvertR"];
    if (doc.containsKey("motorMaxRPM")) buddyConfig.motorMaxRPM = doc["motorMaxRPM"];

    // Servos
    if (doc.containsKey("servoInvert")) {
        JsonArray arr = doc["servoInvert"].as<JsonArray>();
        for (int i = 0; i < 8 && i < (int)arr.size(); i++) {
            buddyConfig.servoInvert[i] = arr[i];
        }
    }

    // Persona
    if (doc.containsKey("eyeColorHex")) strlcpy(buddyConfig.eyeColorHex, doc["eyeColorHex"], sizeof(buddyConfig.eyeColorHex));
    if (doc.containsKey("eyeSize")) buddyConfig.eyeSize = doc["eyeSize"];
    if (doc.containsKey("blinkRate")) buddyConfig.blinkRate = doc["blinkRate"];

    // API Keys — only update if non-masked value is sent
    if (doc.containsKey("geminiApiKey")) {
        String newKey = doc["geminiApiKey"].as<String>();
        if (!newKey.startsWith("****")) {
            strlcpy(buddyConfig.geminiApiKey, newKey.c_str(), sizeof(buddyConfig.geminiApiKey));
        }
    }

    // Build Tier
    if (doc.containsKey("buildTier")) buddyConfig.buildTier = doc["buildTier"];

    // Misc
    if (doc.containsKey("camFlip")) buddyConfig.camFlip = doc["camFlip"];
    if (doc.containsKey("camMirror")) buddyConfig.camMirror = doc["camMirror"];
    if (doc.containsKey("speakerVolume")) buddyConfig.speakerVolume = doc["speakerVolume"];

    configSave();
    return true;
}
