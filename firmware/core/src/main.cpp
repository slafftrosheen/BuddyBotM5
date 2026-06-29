#include <Arduino.h>
#include <LittleFS.h>
#include <M5CoreS3.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <ArduinoOTA.h>
#include <Update.h>
#include <WiFiMulti.h>
#include <ESPmDNS.h>

#define sensor_t Adafruit_sensor_t
#include <Adafruit_Sensor.h>
#include "Adafruit_BME680.h"
#undef sensor_t

#include "config.h"
#include "sounds.h"
#include "persona.h"

// IMU State
float imu_pitch = 0.0;
float imu_roll = 0.0;
float imu_yaw = 0.0;
unsigned long last_imu_time = 0;

// Motor State (Slew Limiting & PID)
float target_m1 = 0;
float target_m2 = 0;
float current_m1 = 0;
float current_m2 = 0;
float target_speed = 0;
float target_turn = 0;

float yaw_target = 0.0;
bool heading_locked = false;

// Gamification State
unsigned long lastActivityTime = 0;
unsigned long nextQuirkTime = 60000;
unsigned long pettingStartTime = 0;
bool isPetting = false;

WiFiMulti wifiMulti;

// Web Server
AsyncWebServer server(80);

// BME680 Sensor
Adafruit_BME680 bme;

// ═══════════════════════════════════════
// RollerCAN I2C Protocol
// ═══════════════════════════════════════
const uint8_t ROLLER_M1_ADDR = 0x64;
const uint8_t ROLLER_M2_ADDR = 0x65;

// ═══════════════════════════════════════
// 8-Channel Servo Hat I2C Protocol
// ═══════════════════════════════════════
const uint8_t SERVO_HAT_ADDR = 0x38;

bool motorsInitialized = false;

// ═══════════════════════════════════════
// RollerCAN Motor Control
// ═══════════════════════════════════════
void rollerSetConfig(uint8_t addr, uint8_t output, uint8_t mode) {
    Wire.beginTransmission(addr);
    Wire.write(0x00);
    Wire.write(output);
    Wire.write(mode);
    Wire.endTransmission();
}

void rollerSetSpeed(uint8_t addr, int32_t speedRPM100) {
    Wire.beginTransmission(addr);
    Wire.write(0x40);
    Wire.write((uint8_t)(speedRPM100 & 0xFF));
    Wire.write((uint8_t)((speedRPM100 >> 8) & 0xFF));
    Wire.write((uint8_t)((speedRPM100 >> 16) & 0xFF));
    Wire.write((uint8_t)((speedRPM100 >> 24) & 0xFF));
    Wire.endTransmission();
}

void initMotors() {
    rollerSetConfig(ROLLER_M1_ADDR, 1, 1);
    delay(10);
    rollerSetConfig(ROLLER_M2_ADDR, 1, 1);
    delay(10);
    rollerSetSpeed(ROLLER_M1_ADDR, 0);
    rollerSetSpeed(ROLLER_M2_ADDR, 0);
    motorsInitialized = true;
}

// Motor speed with inversion from config
void setMotorSpeeds(int speedPctM1, int speedPctM2) {
    if (buddyConfig.motorInvertL) speedPctM1 = -speedPctM1;
    if (buddyConfig.motorInvertR) speedPctM2 = -speedPctM2;
    int32_t rpm100_m1 = (int32_t)speedPctM1 * buddyConfig.motorMaxRPM;
    int32_t rpm100_m2 = (int32_t)speedPctM2 * buddyConfig.motorMaxRPM;
    rollerSetSpeed(ROLLER_M1_ADDR, rpm100_m1);
    rollerSetSpeed(ROLLER_M2_ADDR, rpm100_m2);
}

// ═══════════════════════════════════════
// 8-Servo Hat Control
// ═══════════════════════════════════════
void setServoAngle(uint8_t channel, uint8_t angle) {
    if (channel > 7) return;
    if (buddyConfig.servoInvert[channel]) {
        angle = 180 - angle;
    }
    if (angle > 180) angle = 180;
    Wire.beginTransmission(SERVO_HAT_ADDR);
    Wire.write(channel);
    Wire.write(angle);
    Wire.endTransmission();
}

// ═══════════════════════════════════════
// Color helpers
// ═══════════════════════════════════════
uint16_t hexToColor565(const char* hex) {
    if (hex[0] == '#') hex++;
    long rgb = strtol(hex, NULL, 16);
    uint8_t r = (rgb >> 16) & 0xFF;
    uint8_t g = (rgb >> 8) & 0xFF;
    uint8_t b = rgb & 0xFF;
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}



// ═══════════════════════════════════════
// WiFi Init (from config)
// ═══════════════════════════════════════
void initWiFi() {
    CoreS3.Display.fillScreen(TFT_BLACK);
    CoreS3.Display.setCursor(0, 0);
    CoreS3.Display.setTextSize(2);
    CoreS3.Display.println("Connecting to WiFi...");

    WiFi.setHostname("buddy");
    WiFi.disconnect(true, true);
    delay(100);
    WiFi.mode(WIFI_STA);
    
    if (strlen(buddyConfig.wifi_ssid1) > 0) {
        wifiMulti.addAP(buddyConfig.wifi_ssid1, buddyConfig.wifi_pass1);
        CoreS3.Display.printf("  SSID1: %s\n", buddyConfig.wifi_ssid1);
    }
    if (strlen(buddyConfig.wifi_ssid2) > 0) {
        wifiMulti.addAP(buddyConfig.wifi_ssid2, buddyConfig.wifi_pass2);
        CoreS3.Display.printf("  SSID2: %s\n", buddyConfig.wifi_ssid2);
    }
    if (strlen(buddyConfig.wifi_ssid3) > 0) {
        wifiMulti.addAP(buddyConfig.wifi_ssid3, buddyConfig.wifi_pass3);
        CoreS3.Display.printf("  SSID3: %s\n", buddyConfig.wifi_ssid3);
    }

    unsigned long startAttempt = millis();
    while (wifiMulti.run() != WL_CONNECTED) {
        delay(100);
        CoreS3.Display.print(".");
        if (millis() - startAttempt > 15000) {
            // Captive portal fallback
            CoreS3.Display.println("\nNo WiFi! Starting AP...");
            WiFi.mode(WIFI_AP);
            WiFi.softAP("BuddyBot-Setup", "buddy123");
            CoreS3.Display.print("AP IP: ");
            CoreS3.Display.println(WiFi.softAPIP());
            return;
        }
    }

    CoreS3.Display.println("\nConnected!");
    
    if (MDNS.begin("buddy")) {
        CoreS3.Display.println("MDNS: buddy.local");
    }
}

// ═══════════════════════════════════════
// Web Server Init
// ═══════════════════════════════════════
void initServer() {
    // Serve Web UI from SD Card
    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html").setCacheControl("max-age=0, no-cache, no-store, must-revalidate");

    // ── File Upload Handler ──
    server.on("/api/upload", HTTP_POST, [](AsyncWebServerRequest *request){
        if (request->_tempObject != NULL) {
            request->send(200, "text/plain", "Upload Complete");
        } else {
            request->send(500, "text/plain", "Failed to open file on SD Card");
        }
    }, [](AsyncWebServerRequest *request, const String& filename, size_t index, uint8_t *data, size_t len, bool final){
        static File uploadFile;
        if (!index) {
            String path = "/" + filename;
            bool isMedia = path.endsWith(".jpg") || path.endsWith(".png") || path.endsWith(".wav");
            fs::FS &targetFS = LittleFS;
            if (targetFS.exists(path)) targetFS.remove(path);
            uploadFile = targetFS.open(path, FILE_WRITE);
            if (uploadFile) {
                request->_tempObject = (void*)1;
            } else {
                request->_tempObject = NULL;
            }
        }
        if (uploadFile) {
            uploadFile.write(data, len);
            if (final) {
                uploadFile.close();
            }
        }
    });

    // ── GET /api/telemetry ──
    server.on("/api/telemetry", HTTP_GET, [](AsyncWebServerRequest *request){
        JsonDocument doc;
        if (bme.performReading()) {
            doc["temp"] = bme.temperature;
            doc["hum"] = bme.humidity;
            doc["pres"] = bme.pressure / 100.0;
            doc["gas"] = bme.gas_resistance;
        } else {
            doc["temp"] = 0; doc["hum"] = 0; doc["pres"] = 0; doc["gas"] = 0;
        }
        doc["pitch"] = imu_pitch;
        doc["roll"] = imu_roll;
        doc["heap"] = ESP.getFreeHeap();
        doc["rssi"] = WiFi.RSSI();
        doc["battery"] = CoreS3.Power.getBatteryLevel();
        doc["uptime"] = millis() / 1000;
        doc["hasServo"] = buddyConfig.hasServo;
        doc["hasCam"] = buddyConfig.hasCam;
        doc["hasPi"] = buddyConfig.hasPi;
        doc["xp"] = buddyConfig.xp;
        doc["level"] = buddyConfig.level;
        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    // ── GET /api/config ──
    server.on("/api/config", HTTP_GET, [](AsyncWebServerRequest *request){
        request->send(200, "application/json", configToJson());
    });

    // ── POST /api/config ──
    server.on("/api/config", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        if (configApply((const char*)data, len)) {
            persona.applyConfig();
            request->send(200, "text/plain", "Config Saved");
        } else {
            request->send(400, "text/plain", "Bad Config JSON");
        }
    });

    // ── POST /api/motors ──
    server.on("/api/motors", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        if (!deserializeJson(doc, data, len)) {
            target_speed = doc["speed"];
            target_turn = doc["turn"];
            int trimL = doc["trimL"] | buddyConfig.motorTrimL;
            int trimR = doc["trimR"] | buddyConfig.motorTrimR;

            // Optional manual trim (will be mostly obsolete with PID)
            target_m1 = target_speed + target_turn + trimL;
            target_m2 = target_speed - target_turn + trimR;
            
            // Activate Heading Lock if going straight
            if (abs(target_speed) > 10 && abs(target_turn) < 5) {
                if (!heading_locked) {
                    yaw_target = imu_yaw;
                    heading_locked = true;
                }
            } else {
                heading_locked = false;
            }

            request->send(200, "text/plain", "OK");
            lastActivityTime = millis();
        } else {
            request->send(400, "text/plain", "Bad Request");
        }
    });

    // ── POST /api/servo ──
    server.on("/api/servo", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        if (!deserializeJson(doc, data, len)) {
            int angle = doc["angle"];
            
            if (!doc["channel"].isNull()) {
                int channel = doc["channel"];
                setServoAngle(channel, angle);
            } else if (!doc["group"].isNull()) {
                int group = doc["group"];
                // Map group (1-4) to two servos each
                if (group == 1) { setServoAngle(0, angle); setServoAngle(1, angle); }
                else if (group == 2) { setServoAngle(2, angle); setServoAngle(3, angle); }
                else if (group == 3) { setServoAngle(4, angle); setServoAngle(5, angle); }
                else if (group == 4) { setServoAngle(6, angle); setServoAngle(7, angle); }
            }
            
            request->send(200, "text/plain", "OK");
            lastActivityTime = millis();
        } else {
            request->send(400, "text/plain", "Bad Request");
        }
    });

    // ── POST /api/persona ──
    server.on("/api/persona", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        if (index + len == total) {
            JsonDocument doc;
            if (!deserializeJson(doc, data, len)) {
                if (!doc["emotion"].isNull()) {
                    persona.setEmotion((EmotionState)(doc["emotion"].as<int>()));
                }
                if (!doc["eyeColor"].isNull()) {
                    buddyConfig.eyeColorMain = hexToColor565(doc["eyeColor"]);
                    needsConfigSave = true;
                }
                if (!doc["talking"].isNull()) {
                    if (doc["talking"].as<bool>()) {
                        persona.startTalking();
                    } else {
                        persona.stopTalking();
                    }
                }
                if (!doc["blinkRate"].isNull()) {
                    buddyConfig.blinkRate = doc["blinkRate"] | 3000;
                }
                lastActivityTime = millis();
                request->send(200, "text/plain", "OK");
            } else {
                request->send(400, "text/plain", "Bad Request");
            }
        }
    });

    // ── POST /api/xp ──
    server.on("/api/xp", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        if (index + len == total) {
            JsonDocument doc;
            if (!deserializeJson(doc, data, len)) {
                if (!doc["add"].isNull()) {
                    int add = doc["add"];
                    buddyConfig.xp += add;
                    
                    int newLevel = (buddyConfig.xp / 100) + 1;
                    if (newLevel > buddyConfig.level) {
                        buddyConfig.level = newLevel;
                        persona.setEmotion(EMO_EXCITED); // Celebrate!
                        playSoundAsync("level_up");
                        
                        // Dynamically change eye color based on level
                        if (newLevel == 2) buddyConfig.eyeColorMain = 0x07E0; // Green
                        else if (newLevel == 3) buddyConfig.eyeColorMain = 0x001F; // Blue
                        else if (newLevel == 4) buddyConfig.eyeColorMain = 0xF800; // Red
                        else if (newLevel >= 5) buddyConfig.eyeColorMain = 0xFD20; // Orange/Gold
                        
                        // Eyes grow slightly as it levels up
                        buddyConfig.eyeSizeX = min(100, buddyConfig.eyeSizeX + 4);
                        buddyConfig.eyeSizeY = min(100, buddyConfig.eyeSizeY + 4);
                    }
                    needsConfigSave = true;
                }
                
                // Return current stats
                JsonDocument resDoc;
                resDoc["xp"] = buddyConfig.xp;
                resDoc["level"] = buddyConfig.level;
                String resStr;
                serializeJson(resDoc, resStr);
                
                request->send(200, "application/json", resStr);
            } else {
                request->send(400, "text/plain", "Bad Request");
            }
        }
    });

    // ── POST /api/sound ──
    server.on("/api/sound", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        if (!deserializeJson(doc, data, len)) {
            const char* sound = doc["sound"] | "beep";
            playSoundAsync(sound);
            request->send(200, "text/plain", "OK");
            lastActivityTime = millis();
        } else {
            request->send(400, "text/plain", "Bad Request");
        }
    });

    // ── GET /api/sounds ──
    server.on("/api/sounds", HTTP_GET, [](AsyncWebServerRequest *request){
        JsonDocument doc;
        JsonArray arr = doc["sounds"].to<JsonArray>();
        arr.add("happy");
        arr.add("sad");
        arr.add("alert");
        arr.add("eat");
        arr.add("startup");
        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    // ── GET /api/action ──
    server.on("/api/action", HTTP_GET, [](AsyncWebServerRequest *request){
        if (request->hasParam("cmd")) {
            String cmd = request->getParam("cmd")->value();
            if (cmd == "treat") {
                // Non-blocking treat animation via FreeRTOS task
                xTaskCreatePinnedToCore([](void* param) {
                    playSoundAsync("eat");
                    setMotorSpeeds(50, -50);
                    vTaskDelay(pdMS_TO_TICKS(150));
                    setMotorSpeeds(-50, 50);
                    vTaskDelay(pdMS_TO_TICKS(150));
                    setMotorSpeeds(0, 0);
                    persona.setEmotion(EMO_HAPPY);
                    vTaskDelete(NULL);
                }, "treat", 4096, NULL, 1, NULL, 0);
                lastActivityTime = millis();
                request->send(200, "text/plain", "Yummy");
                return;
            }
        }
        request->send(400, "text/plain", "Invalid Action");
    });





    // ── Web OTA (/update) ──
    server.on("/update", HTTP_GET, [](AsyncWebServerRequest *request){
        String html = "<!DOCTYPE html><html><head><title>BuddyBot Web OTA</title>";
        html += "<style>body{font-family:sans-serif;background:#2c3e50;color:white;text-align:center;padding:50px;}";
        html += ".card{background:#34495e;padding:20px;border-radius:10px;display:inline-block;}";
        html += "input[type=submit]{background:#e74c3c;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;font-size:16px;}</style></head>";
        html += "<body><h1>🤖 BuddyBot Firmware & FS Update</h1>";
        html += "<div class='card'><form method='POST' action='/update' enctype='multipart/form-data'>";
        html += "<p>Select <b>firmware.bin</b> (U_FLASH) or <b>littlefs.bin</b> (U_SPIFFS):</p>";
        html += "<input type='file' name='update' style='margin-bottom:20px;'><br>";
        html += "<input type='submit' value='Upload & Flash'>";
        html += "</form></div></body></html>";
        request->send(200, "text/html", html);
    });

    server.on("/update", HTTP_POST, [](AsyncWebServerRequest *request){
        bool shouldReboot = !Update.hasError();
        AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", shouldReboot ? "OK: Rebooting..." : "FAIL: Update Error");
        response->addHeader("Connection", "close");
        request->send(response);
        if (shouldReboot) {
            delay(1000);
            esp_restart();
        }
    }, [](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final){
        if(!index){
            Serial.printf("[OTA] Update Start: %s\n", filename.c_str());
            // If filename has 'littlefs' or 'spiffs', treat as FS
            int cmd = (filename.indexOf("littlefs") >= 0 || filename.indexOf("spiffs") >= 0 || filename.indexOf("fs") >= 0) ? U_SPIFFS : U_FLASH;
            
            // Set update size to max possible depending on type
            size_t updateSize = (cmd == U_FLASH) ? (ESP.getFreeSketchSpace() - 0x1000) & 0xFFFFF000 : UPDATE_SIZE_UNKNOWN;
            
            if(!Update.begin(updateSize, cmd)){
                Update.printError(Serial);
            }
        }
        if(!Update.hasError()){
            if(Update.write(data, len) != len){
                Serial.println("[OTA] Write failed.");
                Update.printError(Serial);
            }
        }
        if(final){
            if(Update.end(true)){
                Serial.printf("[OTA] Update Success: %uB\n", index+len);
            } else {
                Update.printError(Serial);
            }
        }
    });

    // ── POST /api/reboot ──

    server.on("/api/reboot", HTTP_POST, [](AsyncWebServerRequest *request){
        request->send(200, "text/plain", "Rebooting...");
        delay(500);
        esp_restart();
    });

    server.begin();
    CoreS3.Display.println("Web Server Started");

    ArduinoOTA.setHostname("BuddyBot-Core");
    ArduinoOTA.begin();
}

// ═══════════════════════════════════════
// Setup
// ═══════════════════════════════════════
void setup() {
    auto cfg = M5.config();
    cfg.internal_mic = false;
    CoreS3.begin(cfg); // Use CoreS3.begin() instead of M5.begin() to properly initialize AW9523 on CoreS3! // Use CoreS3.begin() instead of M5.begin() to properly initialize AW9523 on CoreS3!

    int sda = 2, scl = 1; // CoreS3 Port A (I2C)
    Wire.begin(sda, scl);

    Wire.beginTransmission(0x38);
    buddyConfig.hasServo = (Wire.endTransmission() == 0);

    // Initialize LittleFS for Web UI
    if (!LittleFS.begin(true)) {
        CoreS3.Display.println("LittleFS Mount FAILED");
    } else {
        CoreS3.Display.println("LittleFS: MOUNTED OK");
    }

    // Load config from LittleFS (or create defaults)
    configLoad();

    // Apply config values
    M5.Speaker.setVolume(buddyConfig.speakerVolume);

    // Initialize sound system
    initSoundPlayer();

    // Connect WiFi using config credentials
    initWiFi();

    // Initialize BME680
    if (!bme.begin(0x76)) {
        CoreS3.Display.println("BME680: NOT FOUND");
    } else {
        bme.setTemperatureOversampling(BME680_OS_8X);
        bme.setHumidityOversampling(BME680_OS_2X);
        bme.setPressureOversampling(BME680_OS_4X);
        bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
        bme.setGasHeater(320, 150);
        CoreS3.Display.println("BME680: OK");
    }

    // Initialize RollerCAN motors
    initMotors();
    CoreS3.Display.println("Motors: INIT");

    // Initialize all servos to stop (90)
    for (int i = 0; i < 8; i++) {
        setServoAngle(i, 90);
    }
    CoreS3.Display.println("Servos: STOP");

    CoreS3.Display.printf("HW: Core%s%s\n", 
        buddyConfig.hasServo ? "+Servo" : "",
        buddyConfig.hasPi ? "+Pi" : "");

    initServer();

    // Startup sound
    playSoundAsync("startup");
    persona.begin();
}

// ═══════════════════════════════════════
// Loop
// ═══════════════════════════════════════
void loop() {
    if (needsConfigSave) {
        configSave();
        needsConfigSave = false;
    }
    CoreS3.update();
    ArduinoOTA.handle();

    // IMU processing
    float ax, ay, az, gx, gy, gz;
    CoreS3.Imu.getAccel(&ax, &ay, &az);
    CoreS3.Imu.getGyro(&gx, &gy, &gz);
    
    imu_pitch = atan2(ax, sqrt(ay * ay + az * az)) * 180.0 / PI;
    imu_roll = atan2(ay, az) * 180.0 / PI;

    unsigned long now = millis();
    float dt = (now - last_imu_time) / 1000.0;
    if (last_imu_time > 0 && dt > 0) {
        // Simple deadband for gyro noise
        if (abs(gz) > 1.5) {
            imu_yaw += gz * dt;
        }
    }
    last_imu_time = now;

    // ── Motor Control & Slew Rate Limiting ──
    float m1_req = target_m1;
    float m2_req = target_m2;

    // Flip/Stall Detection
    if (abs(imu_pitch) > 45.0) {
        m1_req = 0;
        m2_req = 0;
        target_m1 = 0;
        target_m2 = 0;
    } 
    else if (heading_locked) {
        // Simple P-Controller for Drive Straight
        float error = yaw_target - imu_yaw;
        float p_gain = 1.2;
        float correction = error * p_gain;
        
        // If reversing, flip the correction direction
        if (target_speed < 0) {
            correction = -correction;
        }
        
        m1_req -= correction;
        m2_req += correction;
    }

    // Slew Rate (Easing)
    float slew_rate = 150.0 * dt; // Max change per second
    
    if (m1_req > current_m1 + slew_rate) current_m1 += slew_rate;
    else if (m1_req < current_m1 - slew_rate) current_m1 -= slew_rate;
    else current_m1 = m1_req;

    if (m2_req > current_m2 + slew_rate) current_m2 += slew_rate;
    else if (m2_req < current_m2 - slew_rate) current_m2 -= slew_rate;
    else current_m2 = m2_req;

    current_m1 = constrain(current_m1, -100, 100);
    current_m2 = constrain(current_m2, -100, 100);

    // Only update I2C if motors are moving or just stopped, and throttle to 20Hz max
    static bool was_moving = false;
    static unsigned long last_motor_update = 0;
    if (millis() - last_motor_update > 50) {
        last_motor_update = millis();
        if (abs(current_m1) > 1 || abs(current_m2) > 1 || was_moving) {
            setMotorSpeeds((int)current_m1, (int)current_m2);
            was_moving = (abs(current_m1) > 1 || abs(current_m2) > 1);
        }
    }

    // Gamification: Environment Sensing (Feature 3: Smoke/Fire Alarm)
    static unsigned long lastBmeCheck = 0;
    if (millis() - lastBmeCheck > 3000) {
        lastBmeCheck = millis();
        if (bme.performReading()) {
            if (bme.temperature > buddyConfig.fireTempThreshold || bme.gas_resistance < buddyConfig.fireGasThreshold) {
                // Fire / Smoke detected!
                playSoundAsync("alert");
                persona.setEmotion(EMO_SHOCKED);
                lastActivityTime = millis();
            }
        }
    }

    // Gamification: Petting Detection & Impact Detection (Feature 4)
    float accMag = sqrt(ax * ax + ay * ay + az * az);
    static float lastAccMag = 1.0;
    
    if (abs(accMag - lastAccMag) > buddyConfig.impactThresholdG) { 
        // Impact Detection!
        playSoundAsync("hurt"); // Ouch!
        persona.setEmotion(EMO_ANGRY);
        lastActivityTime = millis();
        isPetting = false;
    } else if (abs(accMag - lastAccMag) > 0.2) { 
        // Normal Petting Detection
        if (!isPetting) {
            pettingStartTime = millis();
            isPetting = true;
        } else if (millis() - pettingStartTime > 2000) {
            playSoundAsync("purr");
            persona.setEmotion(EMO_HAPPY);
            lastActivityTime = millis();
            isPetting = false;
        }
    } else {
        isPetting = false;
    }
    lastAccMag = accMag;

    // Gamification: Idle Quirks
    if (millis() - lastActivityTime > nextQuirkTime) {
        int quirk = random(0, 3);
        if (quirk == 0) {
            playSoundAsync("sneeze");
            persona.setEmotion(EMO_DOUBTFUL);
        } else if (quirk == 1) {
            playSoundAsync("whistle");
            persona.setEmotion(EMO_HAPPY);
        } else {
            playSoundAsync("snore");
            persona.setEmotion(EMO_SLEEPY);
        }
        lastActivityTime = millis();
        nextQuirkTime = random(20000, 45000);
    }

    // Touch: cycle emotions on tap
    if (CoreS3.Touch.getCount() > 0) {
        auto t = CoreS3.Touch.getDetail();
        if (t.wasClicked()) {
            static int currentEmotionIdx = 0;
            currentEmotionIdx = (currentEmotionIdx + 1) % 12;
            persona.setEmotion((EmotionState)currentEmotionIdx);
        }
    }

    // Persona rendering
    persona.update();

    // WiFi auto-reconnect
    static unsigned long lastWiFiCheck = 0;
    if (millis() - lastWiFiCheck > 10000) {
        lastWiFiCheck = millis();
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WiFi] Lost connection, reconnecting...");
            wifiMulti.run();
        }
    }

    yield();
    delay(10);
}
