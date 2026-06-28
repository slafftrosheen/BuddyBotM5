#include <Arduino.h>
#include <SD.h>
#include <M5Unified.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <ArduinoOTA.h>
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

#if BUDDY_TIER >= 1  // Pro+ only
// ═══════════════════════════════════════
// 8-Channel Servo Hat I2C Protocol
// ═══════════════════════════════════════
const uint8_t SERVO_HAT_ADDR = 0x38;
#endif

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

#if BUDDY_TIER >= 1  // Pro+ only
// ═══════════════════════════════════════
// 8-Servo Hat Control
// ═══════════════════════════════════════
void setServoAngle(uint8_t channel, uint8_t angle) {
    if (channel > 7) return;
    if (angle > 180) angle = 180;
    Wire.beginTransmission(SERVO_HAT_ADDR);
    Wire.write(channel);
    Wire.write(angle);
    Wire.endTransmission();
}
#endif

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
    M5.Lcd.fillScreen(BLACK);
    M5.Lcd.setCursor(0, 0);
    M5.Lcd.setTextSize(2);
    M5.Lcd.println("Connecting to WiFi...");

    WiFi.setHostname("buddy");
    WiFi.mode(WIFI_STA);
    
    if (strlen(buddyConfig.wifi_ssid1) > 0) {
        wifiMulti.addAP(buddyConfig.wifi_ssid1, buddyConfig.wifi_pass1);
        M5.Lcd.printf("  SSID1: %s\n", buddyConfig.wifi_ssid1);
    }
    if (strlen(buddyConfig.wifi_ssid2) > 0) {
        wifiMulti.addAP(buddyConfig.wifi_ssid2, buddyConfig.wifi_pass2);
        M5.Lcd.printf("  SSID2: %s\n", buddyConfig.wifi_ssid2);
    }
    if (strlen(buddyConfig.wifi_ssid3) > 0) {
        wifiMulti.addAP(buddyConfig.wifi_ssid3, buddyConfig.wifi_pass3);
        M5.Lcd.printf("  SSID3: %s\n", buddyConfig.wifi_ssid3);
    }

    unsigned long startAttempt = millis();
    while (wifiMulti.run() != WL_CONNECTED) {
        delay(100);
        M5.Lcd.print(".");
        if (millis() - startAttempt > 15000) {
            // Captive portal fallback
            M5.Lcd.println("\nNo WiFi! Starting AP...");
            WiFi.mode(WIFI_AP);
            WiFi.softAP("BuddyBot-Setup", "buddy123");
            M5.Lcd.print("AP IP: ");
            M5.Lcd.println(WiFi.softAPIP());
            return;
        }
    }

    M5.Lcd.println("\nConnected!");
    
    if (MDNS.begin("buddy")) {
        M5.Lcd.println("MDNS: buddy.local");
    }
}

// ═══════════════════════════════════════
// Web Server Init
// ═══════════════════════════════════════
void initServer() {
    // Serve Web UI from SD Card
    server.serveStatic("/", SD, "/").setDefaultFile("index.html").setCacheControl("max-age=0, no-cache, no-store, must-revalidate");

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
            if (SD.exists(path)) SD.remove(path);
            uploadFile = SD.open(path, FILE_WRITE);
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
        doc["battery"] = M5.Power.getBatteryLevel();
        doc["uptime"] = millis() / 1000;
        doc["buildTier"] = buddyConfig.buildTier;
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

#if BUDDY_TIER >= 1
            int steer_pulse = map(target_turn, -100, 100, 0, 180);
            setServoAngle(0, steer_pulse);
#endif

            request->send(200, "text/plain", "OK");
            lastActivityTime = millis();
        } else {
            request->send(400, "text/plain", "Bad Request");
        }
    });

#if BUDDY_TIER >= 1  // Pro+ only
    // ── POST /api/servo ──
    server.on("/api/servo", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        if (!deserializeJson(doc, data, len)) {
            int channel = doc["channel"];
            int angle = doc["angle"];
            setServoAngle(channel, angle);
            request->send(200, "text/plain", "OK");
            lastActivityTime = millis();
        } else {
            request->send(400, "text/plain", "Bad Request");
        }
    });
#endif

    // ── POST /api/persona ──
    server.on("/api/persona", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        if (!deserializeJson(doc, data, len)) {
            if (doc.containsKey("emotion")) {
                persona.setEmotion((EmotionState)(doc["emotion"].as<int>()));
            }
            if (doc.containsKey("talking")) {
                if (doc["talking"].as<bool>()) {
                    persona.startTalking();
                } else {
                    persona.stopTalking();
                }
            }

            if (doc.containsKey("eyeColor")) {
                strlcpy(buddyConfig.eyeColorHex, doc["eyeColor"], sizeof(buddyConfig.eyeColorHex));
            }
            if (doc.containsKey("eyeSize")) {
                buddyConfig.eyeSize = doc["eyeSize"] | 30;
            }
            if (doc.containsKey("blinkRate")) {
                buddyConfig.blinkRate = doc["blinkRate"] | 3000;
            }

            request->send(200, "text/plain", "OK");
            lastActivityTime = millis();
        } else {
            request->send(400, "text/plain", "Bad Request");
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
        File dir = SD.open("/sounds");
        if (dir) {
            File entry;
            while ((entry = dir.openNextFile())) {
                String name = entry.name();
                if (name.endsWith(".wav")) {
                    name.replace(".wav", "");
                    // Strip leading path if present
                    int lastSlash = name.lastIndexOf('/');
                    if (lastSlash >= 0) name = name.substring(lastSlash + 1);
                    arr.add(name);
                }
                entry.close();
            }
            dir.close();
        }
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

    // ── POST /api/reboot ──
    server.on("/api/reboot", HTTP_POST, [](AsyncWebServerRequest *request){
        request->send(200, "text/plain", "Rebooting...");
        delay(500);
        esp_restart();
    });

    server.begin();
    M5.Lcd.println("Web Server Started");

    ArduinoOTA.setHostname("BuddyBot-Core");
    ArduinoOTA.begin();
}

// ═══════════════════════════════════════
// Setup
// ═══════════════════════════════════════
void setup() {
    auto cfg = M5.config();
    cfg.internal_mic = false;
    M5.begin(cfg);

    int sda = 2, scl = 1; // Default CoreS3 Port A
    auto board = M5.getBoard();
    if (board == m5::board_t::board_M5StickCPlus || 
        board == m5::board_t::board_M5StickCPlus2 ||
        board == m5::board_t::board_M5StickC) {
        sda = 32;
        scl = 33;
    }
    Wire.begin(sda, scl);

    // Mount SD Card FIRST (needed for config)
    SPI.begin(36, 35, 37, 4);
    if (!SD.begin(4, SPI, 25000000)) {
        M5.Lcd.setTextColor(RED);
        M5.Lcd.println("SD Card: NOT MOUNTED!");
        M5.Lcd.setTextColor(WHITE);
    } else {
        M5.Lcd.setTextColor(GREEN);
        M5.Lcd.println("SD Card: MOUNTED OK");
        M5.Lcd.setTextColor(WHITE);
        if (!SD.exists("/sprites")) SD.mkdir("/sprites");
        if (!SD.exists("/sounds")) SD.mkdir("/sounds");
    }

    // Load config from SD (or create defaults)
    configLoad();

    // Apply config values
    M5.Speaker.setVolume(buddyConfig.speakerVolume);

    // Initialize sound system
    initSoundPlayer();

    // Connect WiFi using config credentials
    initWiFi();

    // Initialize BME680
    if (!bme.begin(0x76)) {
        M5.Lcd.println("BME680: NOT FOUND");
    } else {
        bme.setTemperatureOversampling(BME680_OS_8X);
        bme.setHumidityOversampling(BME680_OS_2X);
        bme.setPressureOversampling(BME680_OS_4X);
        bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
        bme.setGasHeater(320, 150);
        M5.Lcd.println("BME680: OK");
    }

    // Initialize RollerCAN motors
    initMotors();
    M5.Lcd.println("Motors: INIT");

#if BUDDY_TIER >= 1
    // Initialize all servos to stop (90)
    for (int i = 0; i < 8; i++) {
        setServoAngle(i, 90);
    }
    M5.Lcd.println("Servos: STOP");
#endif

    M5.Lcd.printf("Build Tier: %s\n", 
        buddyConfig.buildTier == 0 ? "LITE" : 
        buddyConfig.buildTier == 1 ? "PRO" : "MAX");

    initServer();

    // Startup sound
    playSoundAsync("startup");
    persona.begin();
}

// ═══════════════════════════════════════
// Loop
// ═══════════════════════════════════════
void loop() {
    M5.update();
    ArduinoOTA.handle();

    // IMU processing
    float ax, ay, az, gx, gy, gz;
    M5.Imu.getAccel(&ax, &ay, &az);
    M5.Imu.getGyro(&gx, &gy, &gz);
    
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

    // Only update I2C if motors are moving or just stopped
    static bool was_moving = false;
    if (abs(current_m1) > 1 || abs(current_m2) > 1 || was_moving) {
        setMotorSpeeds((int)current_m1, (int)current_m2);
        was_moving = (abs(current_m1) > 1 || abs(current_m2) > 1);
    }

    // Gamification: Petting Detection
    float accMag = sqrt(ax * ax + ay * ay + az * az);
    static float lastAccMag = 1.0;
    if (abs(accMag - lastAccMag) > 0.2) { 
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
            persona.setEmotion(EMO_CURIOUS);
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
    if (M5.Touch.getCount() > 0) {
        auto t = M5.Touch.getDetail();
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
