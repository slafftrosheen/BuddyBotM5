#include "config.h"
#include <LittleFS.h>

// Global config instance
BuddyConfig buddyConfig;
bool needsConfigSave = false;

// ═══════════════════════════════════════
// Default Configuration Values
// ═══════════════════════════════════════
void configSetDefaults() {
    // Network — configure via /config.json on LittleFS or web UI
    strlcpy(buddyConfig.wifi_ssid1, "STARLINK.TAK", sizeof(buddyConfig.wifi_ssid1));
    strlcpy(buddyConfig.wifi_pass1, "Slaff181188", sizeof(buddyConfig.wifi_pass1));
    memset(buddyConfig.wifi_ssid2, 0, sizeof(buddyConfig.wifi_ssid2));
    memset(buddyConfig.wifi_pass2, 0, sizeof(buddyConfig.wifi_pass2));
    strlcpy(buddyConfig.wifi_ssid3, "", sizeof(buddyConfig.wifi_ssid3));
    strlcpy(buddyConfig.wifi_pass3, "", sizeof(buddyConfig.wifi_pass3));
    
    // Camera
    strlcpy(buddyConfig.camIp, "10.140.12.137", sizeof(buddyConfig.camIp));
    strlcpy(buddyConfig.piIp, "10.140.12.57", sizeof(buddyConfig.piIp));

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
    buddyConfig.personaType = 0;

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
    buddyConfig.xp = 0;
    buddyConfig.level = 1;

    // Tuning (Phase 5)
    buddyConfig.impactThresholdG = 1.5;
    buddyConfig.fireTempThreshold = 40.0;
    buddyConfig.fireGasThreshold = 10000;
}

// ═══════════════════════════════════════
// Load config from /config.json on LittleFS
// ═══════════════════════════════════════
void configLoad() {
    configSetDefaults();

    Serial.println("[Config] Loading from LittleFS...");
    if (!LittleFS.exists("/config.json")) {
        Serial.println("[Config] /config.json not found, using defaults.");
        return;
    }

    File f = LittleFS.open("/config.json", FILE_READ);
    if (!f) {
        Serial.println("[Config] Failed to open /config.json for reading");
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
    if (!doc["motorTrimL"].isNull()) buddyConfig.motorTrimL = doc["motorTrimL"];
    if (!doc["motorTrimR"].isNull()) buddyConfig.motorTrimR = doc["motorTrimR"];
    if (!doc["motorInvertL"].isNull()) buddyConfig.motorInvertL = doc["motorInvertL"];
    if (!doc["motorInvertR"].isNull()) buddyConfig.motorInvertR = doc["motorInvertR"];
    if (!doc["motorMaxRPM"].isNull()) buddyConfig.motorMaxRPM = doc["motorMaxRPM"];

    // Servos
    if (!doc["servoInvert"].isNull()) {
        JsonArray arr = doc["servoInvert"].as<JsonArray>();
        for (int i = 0; i < 8 && i < (int)arr.size(); i++) {
            buddyConfig.servoInvert[i] = arr[i];
        }
    }

    // Persona
    if (!doc["blinkRate"].isNull()) buddyConfig.blinkRate = doc["blinkRate"];
    if (!doc["eyeSizeX"].isNull()) buddyConfig.eyeSizeX = doc["eyeSizeX"];
    if (!doc["eyeSizeY"].isNull()) buddyConfig.eyeSizeY = doc["eyeSizeY"];
    if (!doc["eyeFps"].isNull()) buddyConfig.eyeFps = doc["eyeFps"];
    if (!doc["eyeColorMain"].isNull()) buddyConfig.eyeColorMain = doc["eyeColorMain"];
    if (!doc["eyeColorBg"].isNull()) buddyConfig.eyeColorBg = doc["eyeColorBg"];
    if (!doc["personaType"].isNull()) buddyConfig.personaType = doc["personaType"];
    if (!doc["eyeSizeX"].isNull()) buddyConfig.eyeSizeX = doc["eyeSizeX"];
    if (!doc["eyeSizeY"].isNull()) buddyConfig.eyeSizeY = doc["eyeSizeY"];
    if (!doc["eyeFps"].isNull()) buddyConfig.eyeFps = doc["eyeFps"];
    if (!doc["eyeColorMain"].isNull()) buddyConfig.eyeColorMain = doc["eyeColorMain"];
    if (!doc["eyeColorBg"].isNull()) buddyConfig.eyeColorBg = doc["eyeColorBg"];
    if (!doc["personaType"].isNull()) buddyConfig.personaType = doc["personaType"];

    // API Keys
    if (!doc["geminiApiKey"].isNull()) strlcpy(buddyConfig.geminiApiKey, doc["geminiApiKey"], sizeof(buddyConfig.geminiApiKey));

    // Hardware State
    if (!doc["hasServo"].isNull()) buddyConfig.hasServo = doc["hasServo"];
    if (!doc["hasCam"].isNull()) buddyConfig.hasCam = doc["hasCam"];
    if (!doc["hasPi"].isNull()) buddyConfig.hasPi = doc["hasPi"];
    // Misc
    if (!doc["camFlip"].isNull()) buddyConfig.camFlip = doc["camFlip"];
    if (!doc["camMirror"].isNull()) buddyConfig.camMirror = doc["camMirror"];
    if (!doc["speakerVolume"].isNull()) buddyConfig.speakerVolume = doc["speakerVolume"];
    if (!doc["xp"].isNull()) buddyConfig.xp = doc["xp"];
    if (!doc["level"].isNull()) buddyConfig.level = doc["level"];
    if (!doc["xp"].isNull()) buddyConfig.xp = doc["xp"];
    if (!doc["level"].isNull()) buddyConfig.level = doc["level"];

    // Tuning (Phase 5)
    if (!doc["impactThresholdG"].isNull()) buddyConfig.impactThresholdG = doc["impactThresholdG"];
    if (!doc["fireTempThreshold"].isNull()) buddyConfig.fireTempThreshold = doc["fireTempThreshold"];
    if (!doc["fireGasThreshold"].isNull()) buddyConfig.fireGasThreshold = doc["fireGasThreshold"];

    Serial.printf("[Config] Loaded. InvertL=%d, InvertR=%d\n",
        buddyConfig.motorInvertL, buddyConfig.motorInvertR);
}

// ═══════════════════════════════════════
// Save config to /config.json on LittleFS
// ═══════════════════════════════════════
void configSave() {
    Serial.println("[Config] Saving to LittleFS...");
    if (LittleFS.exists("/config.json")) {
        LittleFS.remove("/config.json");
    }

    File f = LittleFS.open("/config.json", FILE_WRITE);
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
    doc["personaType"] = buddyConfig.personaType;
    doc["eyeSizeX"] = buddyConfig.eyeSizeX;
    doc["eyeSizeY"] = buddyConfig.eyeSizeY;
    doc["eyeFps"] = buddyConfig.eyeFps;
    doc["eyeColorMain"] = buddyConfig.eyeColorMain;
    doc["eyeColorBg"] = buddyConfig.eyeColorBg;
    doc["personaType"] = buddyConfig.personaType;

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
    doc["xp"] = buddyConfig.xp;
    doc["level"] = buddyConfig.level;
    doc["xp"] = buddyConfig.xp;
    doc["level"] = buddyConfig.level;

    // Tuning (Phase 5)
    doc["impactThresholdG"] = buddyConfig.impactThresholdG;
    doc["fireTempThreshold"] = buddyConfig.fireTempThreshold;
    doc["fireGasThreshold"] = buddyConfig.fireGasThreshold;

    serializeJsonPretty(doc, f);
    f.close();
    Serial.println("[Config] Saved to LittleFS.");
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
    doc["xp"] = buddyConfig.xp;
    doc["level"] = buddyConfig.level;
    doc["xp"] = buddyConfig.xp;
    doc["level"] = buddyConfig.level;

    // Tuning (Phase 5)
    doc["impactThresholdG"] = buddyConfig.impactThresholdG;
    doc["fireTempThreshold"] = buddyConfig.fireTempThreshold;
    doc["fireGasThreshold"] = buddyConfig.fireGasThreshold;

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
    if (!doc["motorTrimL"].isNull()) buddyConfig.motorTrimL = doc["motorTrimL"];
    if (!doc["motorTrimR"].isNull()) buddyConfig.motorTrimR = doc["motorTrimR"];
    if (!doc["motorInvertL"].isNull()) buddyConfig.motorInvertL = doc["motorInvertL"];
    if (!doc["motorInvertR"].isNull()) buddyConfig.motorInvertR = doc["motorInvertR"];
    if (!doc["motorMaxRPM"].isNull()) buddyConfig.motorMaxRPM = doc["motorMaxRPM"];

    // Servos
    if (!doc["servoInvert"].isNull()) {
        JsonArray arr = doc["servoInvert"].as<JsonArray>();
        for (int i = 0; i < 8 && i < (int)arr.size(); i++) {
            buddyConfig.servoInvert[i] = arr[i];
        }
    }

    // Persona
    if (!doc["blinkRate"].isNull()) buddyConfig.blinkRate = doc["blinkRate"];
    if (!doc["eyeSizeX"].isNull()) buddyConfig.eyeSizeX = doc["eyeSizeX"];
    if (!doc["eyeSizeY"].isNull()) buddyConfig.eyeSizeY = doc["eyeSizeY"];
    if (!doc["eyeFps"].isNull()) buddyConfig.eyeFps = doc["eyeFps"];
    if (!doc["eyeColorMain"].isNull()) buddyConfig.eyeColorMain = doc["eyeColorMain"];
    if (!doc["eyeColorBg"].isNull()) buddyConfig.eyeColorBg = doc["eyeColorBg"];
    if (!doc["personaType"].isNull()) buddyConfig.personaType = doc["personaType"];
    if (!doc["eyeSizeX"].isNull()) buddyConfig.eyeSizeX = doc["eyeSizeX"];
    if (!doc["eyeSizeY"].isNull()) buddyConfig.eyeSizeY = doc["eyeSizeY"];
    if (!doc["eyeFps"].isNull()) buddyConfig.eyeFps = doc["eyeFps"];
    if (!doc["eyeColorMain"].isNull()) buddyConfig.eyeColorMain = doc["eyeColorMain"];
    if (!doc["eyeColorBg"].isNull()) buddyConfig.eyeColorBg = doc["eyeColorBg"];
    if (!doc["personaType"].isNull()) buddyConfig.personaType = doc["personaType"];

    // API Keys — only update if non-masked value is sent
    if (!doc["geminiApiKey"].isNull()) {
        String newKey = doc["geminiApiKey"].as<String>();
        if (!newKey.startsWith("****")) {
            strlcpy(buddyConfig.geminiApiKey, newKey.c_str(), sizeof(buddyConfig.geminiApiKey));
        }
    }

    // Hardware State
    if (!doc["hasServo"].isNull()) buddyConfig.hasServo = doc["hasServo"];
    if (!doc["hasCam"].isNull()) buddyConfig.hasCam = doc["hasCam"];
    if (!doc["hasPi"].isNull()) buddyConfig.hasPi = doc["hasPi"];
    // Misc
    if (!doc["camFlip"].isNull()) buddyConfig.camFlip = doc["camFlip"];
    if (!doc["camMirror"].isNull()) buddyConfig.camMirror = doc["camMirror"];
    if (!doc["speakerVolume"].isNull()) buddyConfig.speakerVolume = doc["speakerVolume"];
    if (!doc["xp"].isNull()) buddyConfig.xp = doc["xp"];
    if (!doc["level"].isNull()) buddyConfig.level = doc["level"];
    if (!doc["xp"].isNull()) buddyConfig.xp = doc["xp"];
    if (!doc["level"].isNull()) buddyConfig.level = doc["level"];

    needsConfigSave = true;
    return true;
}
