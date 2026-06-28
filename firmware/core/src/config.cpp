#include "config.h"
#include <SD.h>

// Global config instance
BuddyConfig buddyConfig;
bool needsConfigSave = false;

// ═══════════════════════════════════════
// Default Configuration Values
// ═══════════════════════════════════════
void configSetDefaults() {
    // Network — configure via /config.json on SD card or web UI
    memset(buddyConfig.wifi_ssid1, 0, sizeof(buddyConfig.wifi_ssid1));
    memset(buddyConfig.wifi_pass1, 0, sizeof(buddyConfig.wifi_pass1));
    memset(buddyConfig.wifi_ssid2, 0, sizeof(buddyConfig.wifi_ssid2));
    memset(buddyConfig.wifi_pass2, 0, sizeof(buddyConfig.wifi_pass2));
    strlcpy(buddyConfig.wifi_ssid3, "", sizeof(buddyConfig.wifi_ssid3));
    strlcpy(buddyConfig.wifi_pass3, "", sizeof(buddyConfig.wifi_pass3));
    
    // Camera
    strlcpy(buddyConfig.camIp, "", sizeof(buddyConfig.camIp));
    strlcpy(buddyConfig.piIp, "", sizeof(buddyConfig.piIp));

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
    buddyConfig.blinkRate = 3000;
    buddyConfig.eyeSizeX = 72;
    buddyConfig.eyeSizeY = 72;
    buddyConfig.eyeFps = 20;
    buddyConfig.eyeColorMain = 0x867D;
    buddyConfig.eyeColorBg = 0x0000;

    // API Keys
    memset(buddyConfig.geminiApiKey, 0, sizeof(buddyConfig.geminiApiKey));

    // Hardware State
    buddyConfig.hasServo = false;
    buddyConfig.hasCam = false;
    buddyConfig.hasPi = false;

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
    if (!doc["wifi_ssid1"].isNull()) strlcpy(buddyConfig.wifi_ssid1, doc["wifi_ssid1"] | "", sizeof(buddyConfig.wifi_ssid1));
    if (!doc["wifi_pass1"].isNull()) strlcpy(buddyConfig.wifi_pass1, doc["wifi_pass1"] | "", sizeof(buddyConfig.wifi_pass1));
    if (!doc["wifi_ssid2"].isNull()) strlcpy(buddyConfig.wifi_ssid2, doc["wifi_ssid2"] | "", sizeof(buddyConfig.wifi_ssid2));
    if (!doc["wifi_pass2"].isNull()) strlcpy(buddyConfig.wifi_pass2, doc["wifi_pass2"] | "", sizeof(buddyConfig.wifi_pass2));
    if (!doc["wifi_ssid3"].isNull()) strlcpy(buddyConfig.wifi_ssid3, doc["wifi_ssid3"] | "", sizeof(buddyConfig.wifi_ssid3));
    if (!doc["wifi_pass3"].isNull()) strlcpy(buddyConfig.wifi_pass3, doc["wifi_pass3"] | "", sizeof(buddyConfig.wifi_pass3));
    if (!doc["camIp"].isNull()) strlcpy(buddyConfig.camIp, doc["camIp"] | "", sizeof(buddyConfig.camIp));
    if (!doc["piIp"].isNull()) strlcpy(buddyConfig.piIp, doc["piIp"] | "", sizeof(buddyConfig.piIp));

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
    if (doc.containsKey("blinkRate")) buddyConfig.blinkRate = doc["blinkRate"];
    if (doc.containsKey("eyeSizeX")) buddyConfig.eyeSizeX = doc["eyeSizeX"];
    if (doc.containsKey("eyeSizeY")) buddyConfig.eyeSizeY = doc["eyeSizeY"];
    if (doc.containsKey("eyeFps")) buddyConfig.eyeFps = doc["eyeFps"];
    if (doc.containsKey("eyeColorMain")) buddyConfig.eyeColorMain = doc["eyeColorMain"];
    if (doc.containsKey("eyeColorBg")) buddyConfig.eyeColorBg = doc["eyeColorBg"];
    if (doc.containsKey("eyeSizeX")) buddyConfig.eyeSizeX = doc["eyeSizeX"];
    if (doc.containsKey("eyeSizeY")) buddyConfig.eyeSizeY = doc["eyeSizeY"];
    if (doc.containsKey("eyeFps")) buddyConfig.eyeFps = doc["eyeFps"];
    if (doc.containsKey("eyeColorMain")) buddyConfig.eyeColorMain = doc["eyeColorMain"];
    if (doc.containsKey("eyeColorBg")) buddyConfig.eyeColorBg = doc["eyeColorBg"];

    // API Keys
    if (doc.containsKey("geminiApiKey")) strlcpy(buddyConfig.geminiApiKey, doc["geminiApiKey"], sizeof(buddyConfig.geminiApiKey));

    // Hardware State
    if (doc.containsKey("hasServo")) buddyConfig.hasServo = doc["hasServo"];
    if (doc.containsKey("hasCam")) buddyConfig.hasCam = doc["hasCam"];
    if (doc.containsKey("hasPi")) buddyConfig.hasPi = doc["hasPi"];
    // Misc
    if (doc.containsKey("camFlip")) buddyConfig.camFlip = doc["camFlip"];
    if (doc.containsKey("camMirror")) buddyConfig.camMirror = doc["camMirror"];
    if (doc.containsKey("speakerVolume")) buddyConfig.speakerVolume = doc["speakerVolume"];

    Serial.printf("[Config] Loaded. InvertL=%d, InvertR=%d\n",
        buddyConfig.motorInvertL, buddyConfig.motorInvertR);
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
    doc["camIp"] = buddyConfig.camIp;
    doc["piIp"] = buddyConfig.piIp;

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
    doc["blinkRate"] = buddyConfig.blinkRate;
    doc["eyeSizeX"] = buddyConfig.eyeSizeX;
    doc["eyeSizeY"] = buddyConfig.eyeSizeY;
    doc["eyeFps"] = buddyConfig.eyeFps;
    doc["eyeColorMain"] = buddyConfig.eyeColorMain;
    doc["eyeColorBg"] = buddyConfig.eyeColorBg;
    doc["eyeSizeX"] = buddyConfig.eyeSizeX;
    doc["eyeSizeY"] = buddyConfig.eyeSizeY;
    doc["eyeFps"] = buddyConfig.eyeFps;
    doc["eyeColorMain"] = buddyConfig.eyeColorMain;
    doc["eyeColorBg"] = buddyConfig.eyeColorBg;

    // API Keys
    doc["geminiApiKey"] = buddyConfig.geminiApiKey;

    // Hardware State
    doc["hasServo"] = buddyConfig.hasServo;
    doc["hasCam"] = buddyConfig.hasCam;
    doc["hasPi"] = buddyConfig.hasPi;

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

    doc["blinkRate"] = buddyConfig.blinkRate;

    // Mask API key — only show last 4 chars
    String maskedKey = "****";
    String key = String(buddyConfig.geminiApiKey);
    if (key.length() > 4) {
        maskedKey = "****" + key.substring(key.length() - 4);
    }
    doc["geminiApiKey"] = maskedKey;

    doc["hasServo"] = buddyConfig.hasServo;
    doc["hasCam"] = buddyConfig.hasCam;
    doc["hasPi"] = buddyConfig.hasPi;
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
    if (!doc["wifi_ssid1"].isNull()) strlcpy(buddyConfig.wifi_ssid1, doc["wifi_ssid1"] | "", sizeof(buddyConfig.wifi_ssid1));
    if (!doc["wifi_pass1"].isNull()) strlcpy(buddyConfig.wifi_pass1, doc["wifi_pass1"] | "", sizeof(buddyConfig.wifi_pass1));
    if (!doc["wifi_ssid2"].isNull()) strlcpy(buddyConfig.wifi_ssid2, doc["wifi_ssid2"] | "", sizeof(buddyConfig.wifi_ssid2));
    if (!doc["wifi_pass2"].isNull()) strlcpy(buddyConfig.wifi_pass2, doc["wifi_pass2"] | "", sizeof(buddyConfig.wifi_pass2));
    if (!doc["wifi_ssid3"].isNull()) strlcpy(buddyConfig.wifi_ssid3, doc["wifi_ssid3"] | "", sizeof(buddyConfig.wifi_ssid3));
    if (!doc["wifi_pass3"].isNull()) strlcpy(buddyConfig.wifi_pass3, doc["wifi_pass3"] | "", sizeof(buddyConfig.wifi_pass3));
    if (!doc["camIp"].isNull()) strlcpy(buddyConfig.camIp, doc["camIp"] | "", sizeof(buddyConfig.camIp));
    if (!doc["piIp"].isNull()) strlcpy(buddyConfig.piIp, doc["piIp"] | "", sizeof(buddyConfig.piIp));

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
    if (doc.containsKey("blinkRate")) buddyConfig.blinkRate = doc["blinkRate"];
    if (doc.containsKey("eyeSizeX")) buddyConfig.eyeSizeX = doc["eyeSizeX"];
    if (doc.containsKey("eyeSizeY")) buddyConfig.eyeSizeY = doc["eyeSizeY"];
    if (doc.containsKey("eyeFps")) buddyConfig.eyeFps = doc["eyeFps"];
    if (doc.containsKey("eyeColorMain")) buddyConfig.eyeColorMain = doc["eyeColorMain"];
    if (doc.containsKey("eyeColorBg")) buddyConfig.eyeColorBg = doc["eyeColorBg"];
    if (doc.containsKey("eyeSizeX")) buddyConfig.eyeSizeX = doc["eyeSizeX"];
    if (doc.containsKey("eyeSizeY")) buddyConfig.eyeSizeY = doc["eyeSizeY"];
    if (doc.containsKey("eyeFps")) buddyConfig.eyeFps = doc["eyeFps"];
    if (doc.containsKey("eyeColorMain")) buddyConfig.eyeColorMain = doc["eyeColorMain"];
    if (doc.containsKey("eyeColorBg")) buddyConfig.eyeColorBg = doc["eyeColorBg"];

    // API Keys — only update if non-masked value is sent
    if (doc.containsKey("geminiApiKey")) {
        String newKey = doc["geminiApiKey"].as<String>();
        if (!newKey.startsWith("****")) {
            strlcpy(buddyConfig.geminiApiKey, newKey.c_str(), sizeof(buddyConfig.geminiApiKey));
        }
    }

    // Hardware State
    if (doc.containsKey("hasServo")) buddyConfig.hasServo = doc["hasServo"];
    if (doc.containsKey("hasCam")) buddyConfig.hasCam = doc["hasCam"];
    if (doc.containsKey("hasPi")) buddyConfig.hasPi = doc["hasPi"];
    // Misc
    if (doc.containsKey("camFlip")) buddyConfig.camFlip = doc["camFlip"];
    if (doc.containsKey("camMirror")) buddyConfig.camMirror = doc["camMirror"];
    if (doc.containsKey("speakerVolume")) buddyConfig.speakerVolume = doc["speakerVolume"];

    needsConfigSave = true;
    return true;
}
