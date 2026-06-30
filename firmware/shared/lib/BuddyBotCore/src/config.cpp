#include "config.h"
#include <LittleFS.h>

// Global config instance
BuddyConfig buddyConfig;
bool needsConfigSave = false;

// ═══════════════════════════════════════
// Default Configuration Values
// ═══════════════════════════════════════
void configSetDefaults() {
    // System
    buddyConfig.screenRotation = 1;

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
    
    // Drive Hardware
    buddyConfig.driveType = 0;
    buddyConfig.driveChannelL = 0;
    buddyConfig.driveChannelR = 1;
    buddyConfig.drivePinL1 = 1;
    buddyConfig.drivePinL2 = 2;
    buddyConfig.drivePinR1 = 3;
    buddyConfig.drivePinR2 = 4;
    buddyConfig.pwmFreq = 50;
    buddyConfig.pwmMin = 500;
    buddyConfig.pwmMax = 2500;
    buddyConfig.driveCenterOffsetL = 0;
    buddyConfig.driveCenterOffsetR = 0;
    buddyConfig.ttlServoTx = 17;
    buddyConfig.ttlServoRx = 16;
    buddyConfig.ttlServoLeftId = 1;
    buddyConfig.ttlServoRightId = 2;

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
    buddyConfig.hasCheeks = false;
    buddyConfig.cheekColor = 0xF81F; // Magenta/Pink
    buddyConfig.mouthType = 0;
    buddyConfig.mouthColor = 0x867D;
    buddyConfig.mouthSizeX = 30;
    buddyConfig.mouthSizeY = 10;

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
            
    buddyConfig.sleepStartH = 22; // 10 PM
    buddyConfig.sleepStartM = 0;
    buddyConfig.wakeStartH = 7;   // 7 AM
    buddyConfig.wakeStartM = 0;
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

    // System
    if (!doc["screenRotation"].isNull()) buddyConfig.screenRotation = doc["screenRotation"];

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

    if (!doc["driveType"].isNull()) buddyConfig.driveType = doc["driveType"];
    if (!doc["driveChannelL"].isNull()) buddyConfig.driveChannelL = doc["driveChannelL"];
    if (!doc["driveChannelR"].isNull()) buddyConfig.driveChannelR = doc["driveChannelR"];
    if (!doc["drivePinL1"].isNull()) buddyConfig.drivePinL1 = doc["drivePinL1"];
    if (!doc["drivePinL2"].isNull()) buddyConfig.drivePinL2 = doc["drivePinL2"];
    if (!doc["drivePinR1"].isNull()) buddyConfig.drivePinR1 = doc["drivePinR1"];
    if (!doc["drivePinR2"].isNull()) buddyConfig.drivePinR2 = doc["drivePinR2"];
    if (!doc["pwmFreq"].isNull()) buddyConfig.pwmFreq = doc["pwmFreq"];
    if (!doc["pwmMin"].isNull()) buddyConfig.pwmMin = doc["pwmMin"];
    if (!doc["pwmMax"].isNull()) buddyConfig.pwmMax = doc["pwmMax"];
    if (!doc["driveCenterOffsetL"].isNull()) buddyConfig.driveCenterOffsetL = doc["driveCenterOffsetL"];
    if (!doc["driveCenterOffsetR"].isNull()) buddyConfig.driveCenterOffsetR = doc["driveCenterOffsetR"];
    if (!doc["ttlServoTx"].isNull()) buddyConfig.ttlServoTx = doc["ttlServoTx"];
    if (!doc["ttlServoRx"].isNull()) buddyConfig.ttlServoRx = doc["ttlServoRx"];
    if (!doc["ttlServoLeftId"].isNull()) buddyConfig.ttlServoLeftId = doc["ttlServoLeftId"];
    if (!doc["ttlServoRightId"].isNull()) buddyConfig.ttlServoRightId = doc["ttlServoRightId"];

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
    if (!doc["hasCheeks"].isNull()) buddyConfig.hasCheeks = doc["hasCheeks"];
    if (!doc["cheekColor"].isNull()) buddyConfig.cheekColor = doc["cheekColor"];
    if (!doc["mouthType"].isNull()) buddyConfig.mouthType = doc["mouthType"];
    if (!doc["mouthColor"].isNull()) buddyConfig.mouthColor = doc["mouthColor"];
    if (!doc["mouthSizeX"].isNull()) buddyConfig.mouthSizeX = doc["mouthSizeX"];
    if (!doc["mouthSizeY"].isNull()) buddyConfig.mouthSizeY = doc["mouthSizeY"];
    if (!doc["eyeSizeX"].isNull()) buddyConfig.eyeSizeX = doc["eyeSizeX"];
    if (!doc["eyeSizeY"].isNull()) buddyConfig.eyeSizeY = doc["eyeSizeY"];
    if (!doc["eyeFps"].isNull()) buddyConfig.eyeFps = doc["eyeFps"];
    if (!doc["eyeColorMain"].isNull()) buddyConfig.eyeColorMain = doc["eyeColorMain"];
    if (!doc["eyeColorBg"].isNull()) buddyConfig.eyeColorBg = doc["eyeColorBg"];
    if (!doc["personaType"].isNull()) buddyConfig.personaType = doc["personaType"];
    if (!doc["hasCheeks"].isNull()) buddyConfig.hasCheeks = doc["hasCheeks"];
    if (!doc["cheekColor"].isNull()) buddyConfig.cheekColor = doc["cheekColor"];
    if (!doc["mouthType"].isNull()) buddyConfig.mouthType = doc["mouthType"];
    if (!doc["mouthColor"].isNull()) buddyConfig.mouthColor = doc["mouthColor"];
    if (!doc["mouthSizeX"].isNull()) buddyConfig.mouthSizeX = doc["mouthSizeX"];
    if (!doc["mouthSizeY"].isNull()) buddyConfig.mouthSizeY = doc["mouthSizeY"];

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
            
    if (!doc["sleepStartH"].isNull()) buddyConfig.sleepStartH = doc["sleepStartH"];
    if (!doc["sleepStartM"].isNull()) buddyConfig.sleepStartM = doc["sleepStartM"];
    if (!doc["wakeStartH"].isNull()) buddyConfig.wakeStartH = doc["wakeStartH"];
    if (!doc["wakeStartM"].isNull()) buddyConfig.wakeStartM = doc["wakeStartM"];

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

    // System
    doc["screenRotation"] = buddyConfig.screenRotation;

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

    doc["driveType"] = buddyConfig.driveType;
    doc["driveChannelL"] = buddyConfig.driveChannelL;
    doc["driveChannelR"] = buddyConfig.driveChannelR;
    doc["drivePinL1"] = buddyConfig.drivePinL1;
    doc["drivePinL2"] = buddyConfig.drivePinL2;
    doc["drivePinR1"] = buddyConfig.drivePinR1;
    doc["drivePinR2"] = buddyConfig.drivePinR2;
    doc["pwmFreq"] = buddyConfig.pwmFreq;
    doc["pwmMin"] = buddyConfig.pwmMin;
    doc["pwmMax"] = buddyConfig.pwmMax;
    doc["driveCenterOffsetL"] = buddyConfig.driveCenterOffsetL;
    doc["driveCenterOffsetR"] = buddyConfig.driveCenterOffsetR;
    doc["screenRotation"] = buddyConfig.screenRotation;
    doc["ttlServoTx"] = buddyConfig.ttlServoTx;
    doc["ttlServoRx"] = buddyConfig.ttlServoRx;
    doc["ttlServoLeftId"] = buddyConfig.ttlServoLeftId;
    doc["ttlServoRightId"] = buddyConfig.ttlServoRightId;

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
    doc["hasCheeks"] = buddyConfig.hasCheeks;
    doc["cheekColor"] = buddyConfig.cheekColor;
    doc["mouthType"] = buddyConfig.mouthType;
    doc["mouthColor"] = buddyConfig.mouthColor;
    doc["mouthSizeX"] = buddyConfig.mouthSizeX;
    doc["mouthSizeY"] = buddyConfig.mouthSizeY;
    doc["eyeSizeX"] = buddyConfig.eyeSizeX;
    doc["eyeSizeY"] = buddyConfig.eyeSizeY;
    doc["eyeFps"] = buddyConfig.eyeFps;
    doc["eyeColorMain"] = buddyConfig.eyeColorMain;
    doc["eyeColorBg"] = buddyConfig.eyeColorBg;
    doc["personaType"] = buddyConfig.personaType;
    doc["hasCheeks"] = buddyConfig.hasCheeks;
    doc["cheekColor"] = buddyConfig.cheekColor;
    doc["mouthType"] = buddyConfig.mouthType;
    doc["mouthColor"] = buddyConfig.mouthColor;
    doc["mouthSizeX"] = buddyConfig.mouthSizeX;
    doc["mouthSizeY"] = buddyConfig.mouthSizeY;

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
            
    doc["sleepStartH"] = buddyConfig.sleepStartH;
    doc["sleepStartM"] = buddyConfig.sleepStartM;
    doc["wakeStartH"] = buddyConfig.wakeStartH;
    doc["wakeStartM"] = buddyConfig.wakeStartM;

    serializeJsonPretty(doc, f);
    f.close();
    Serial.println("[Config] Saved to LittleFS.");
}

// ═══════════════════════════════════════
// Serialize config to JSON string
// ═══════════════════════════════════════
String configToJson() {
    JsonDocument doc;

    doc["screenRotation"] = buddyConfig.screenRotation;

    doc["wifi_ssid1"] = buddyConfig.wifi_ssid1;
    doc["wifi_ssid2"] = buddyConfig.wifi_ssid2;
    doc["wifi_ssid3"] = buddyConfig.wifi_ssid3;
    // NOTE: passwords are NOT sent to the UI for security

    doc["motorTrimL"] = buddyConfig.motorTrimL;
    doc["motorTrimR"] = buddyConfig.motorTrimR;
    doc["motorInvertL"] = buddyConfig.motorInvertL;
    doc["motorInvertR"] = buddyConfig.motorInvertR;
    doc["motorMaxRPM"] = buddyConfig.motorMaxRPM;

    doc["driveType"] = buddyConfig.driveType;
    doc["driveChannelL"] = buddyConfig.driveChannelL;
    doc["driveChannelR"] = buddyConfig.driveChannelR;
    doc["drivePinL1"] = buddyConfig.drivePinL1;
    doc["drivePinL2"] = buddyConfig.drivePinL2;
    doc["drivePinR1"] = buddyConfig.drivePinR1;
    doc["drivePinR2"] = buddyConfig.drivePinR2;
    doc["pwmFreq"] = buddyConfig.pwmFreq;
    doc["pwmMin"] = buddyConfig.pwmMin;
    doc["pwmMax"] = buddyConfig.pwmMax;
    doc["driveCenterOffsetL"] = buddyConfig.driveCenterOffsetL;
    doc["driveCenterOffsetR"] = buddyConfig.driveCenterOffsetR;
    doc["screenRotation"] = buddyConfig.screenRotation;
    doc["ttlServoTx"] = buddyConfig.ttlServoTx;
    doc["ttlServoRx"] = buddyConfig.ttlServoRx;
    doc["ttlServoLeftId"] = buddyConfig.ttlServoLeftId;
    doc["ttlServoRightId"] = buddyConfig.ttlServoRightId;

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
            
    doc["sleepStartH"] = buddyConfig.sleepStartH;
    doc["sleepStartM"] = buddyConfig.sleepStartM;
    doc["wakeStartH"] = buddyConfig.wakeStartH;
    doc["wakeStartM"] = buddyConfig.wakeStartM;

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

    // System
    if (!doc["screenRotation"].isNull()) buddyConfig.screenRotation = doc["screenRotation"];

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

    if (!doc["driveType"].isNull()) buddyConfig.driveType = doc["driveType"];
    if (!doc["driveChannelL"].isNull()) buddyConfig.driveChannelL = doc["driveChannelL"];
    if (!doc["driveChannelR"].isNull()) buddyConfig.driveChannelR = doc["driveChannelR"];
    if (!doc["drivePinL1"].isNull()) buddyConfig.drivePinL1 = doc["drivePinL1"];
    if (!doc["drivePinL2"].isNull()) buddyConfig.drivePinL2 = doc["drivePinL2"];
    if (!doc["drivePinR1"].isNull()) buddyConfig.drivePinR1 = doc["drivePinR1"];
    if (!doc["drivePinR2"].isNull()) buddyConfig.drivePinR2 = doc["drivePinR2"];
    if (!doc["pwmFreq"].isNull()) buddyConfig.pwmFreq = doc["pwmFreq"];
    if (!doc["pwmMin"].isNull()) buddyConfig.pwmMin = doc["pwmMin"];
    if (!doc["pwmMax"].isNull()) buddyConfig.pwmMax = doc["pwmMax"];
    if (!doc["driveCenterOffsetL"].isNull()) buddyConfig.driveCenterOffsetL = doc["driveCenterOffsetL"];
    if (!doc["driveCenterOffsetR"].isNull()) buddyConfig.driveCenterOffsetR = doc["driveCenterOffsetR"];
    if (!doc["ttlServoTx"].isNull()) buddyConfig.ttlServoTx = doc["ttlServoTx"];
    if (!doc["ttlServoRx"].isNull()) buddyConfig.ttlServoRx = doc["ttlServoRx"];
    if (!doc["ttlServoLeftId"].isNull()) buddyConfig.ttlServoLeftId = doc["ttlServoLeftId"];
    if (!doc["ttlServoRightId"].isNull()) buddyConfig.ttlServoRightId = doc["ttlServoRightId"];

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
    if (!doc["hasCheeks"].isNull()) buddyConfig.hasCheeks = doc["hasCheeks"];
    if (!doc["cheekColor"].isNull()) buddyConfig.cheekColor = doc["cheekColor"];
    if (!doc["mouthType"].isNull()) buddyConfig.mouthType = doc["mouthType"];
    if (!doc["mouthColor"].isNull()) buddyConfig.mouthColor = doc["mouthColor"];
    if (!doc["mouthSizeX"].isNull()) buddyConfig.mouthSizeX = doc["mouthSizeX"];
    if (!doc["mouthSizeY"].isNull()) buddyConfig.mouthSizeY = doc["mouthSizeY"];
    if (!doc["eyeSizeX"].isNull()) buddyConfig.eyeSizeX = doc["eyeSizeX"];
    if (!doc["eyeSizeY"].isNull()) buddyConfig.eyeSizeY = doc["eyeSizeY"];
    if (!doc["eyeFps"].isNull()) buddyConfig.eyeFps = doc["eyeFps"];
    if (!doc["eyeColorMain"].isNull()) buddyConfig.eyeColorMain = doc["eyeColorMain"];
    if (!doc["eyeColorBg"].isNull()) buddyConfig.eyeColorBg = doc["eyeColorBg"];
    if (!doc["personaType"].isNull()) buddyConfig.personaType = doc["personaType"];
    if (!doc["hasCheeks"].isNull()) buddyConfig.hasCheeks = doc["hasCheeks"];
    if (!doc["cheekColor"].isNull()) buddyConfig.cheekColor = doc["cheekColor"];
    if (!doc["mouthType"].isNull()) buddyConfig.mouthType = doc["mouthType"];
    if (!doc["mouthColor"].isNull()) buddyConfig.mouthColor = doc["mouthColor"];
    if (!doc["mouthSizeX"].isNull()) buddyConfig.mouthSizeX = doc["mouthSizeX"];
    if (!doc["mouthSizeY"].isNull()) buddyConfig.mouthSizeY = doc["mouthSizeY"];

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
