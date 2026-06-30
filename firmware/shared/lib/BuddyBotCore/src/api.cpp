#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <ESPAsyncWebServer.h>
#include <M5Unified.h>
#include <Update.h>
#include <ArduinoOTA.h>
#include "api.h"
#include "config.h"
#include "motor.h"
#include "persona.h"
#include "sounds.h"

extern float target_speed;
extern float target_turn;
extern float target_m1;
extern float target_m2;
extern float yaw_target;
extern bool heading_locked;
extern float imu_yaw;
extern unsigned long lastActivityTime;
extern AsyncWebServer server;
#include "Adafruit_BME680.h"
extern Adafruit_BME680 bme;
extern float imu_pitch;
extern float imu_roll;



uint16_t hexToColor565(String hex) {
    long num = strtol(&hex[1], NULL, 16);
    uint8_t r = num >> 16;
    uint8_t g = (num >> 8) & 0xFF;
    uint8_t b = num & 0xFF;
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

void initServer() {
    // Serve Web UI from SD Card
    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html").setCacheControl("max-age=0, no-cache, no-store, must-revalidate");

    // â”€â”€ File Upload Handler â”€â”€
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

    // â”€â”€ GET /api/telemetry â”€â”€
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
        doc["hasServo"] = buddyConfig.hasServo;
        doc["hasCam"] = buddyConfig.hasCam;
        doc["hasPi"] = buddyConfig.hasPi;
        doc["xp"] = buddyConfig.xp;
        doc["level"] = buddyConfig.level;
        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    // â”€â”€ GET /api/config â”€â”€
    server.on("/api/config", HTTP_GET, [](AsyncWebServerRequest *request){
        request->send(200, "application/json", configToJson());
    });

    // â”€â”€ POST /api/config â”€â”€
    server.on("/api/config", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        if (configApply((const char*)data, len)) {
            persona.applyConfig();
            M5.Display.setRotation(buddyConfig.screenRotation);
            request->send(200, "text/plain", "Config Saved");
        } else {
            request->send(400, "text/plain", "Bad Config JSON");
        }
    });

    // â”€â”€ POST /api/motors â”€â”€
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

    // â”€â”€ POST /api/servo â”€â”€
    server.on("/api/servo", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        if (!deserializeJson(doc, data, len)) {
            if (!doc["channel"].isNull() && !doc["angle"].isNull()) {
                uint8_t channel = doc["channel"];
                uint8_t angle = doc["angle"];
                setServoAngle(channel, angle);
                request->send(200);
            } else {
                request->send(400, "text/plain", "Missing channel or angle");
            }
        } else {
            request->send(400);
        }
    });

    // â”€â”€ POST /api/persona â”€â”€
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
                    needsConfigSave = true;
                }
                
                // Immediately apply new colors, eye size, or blink rates
                persona.applyConfig();
                
                lastActivityTime = millis();
                request->send(200, "text/plain", "OK");
            } else {
                request->send(400, "text/plain", "Bad Request");
            }
        }
    });

    // â”€â”€ POST /api/xp â”€â”€
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

    // â”€â”€ POST /api/sound â”€â”€
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

    // â”€â”€ GET /api/sounds â”€â”€
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

    // â”€â”€ GET /api/action â”€â”€
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





    // â”€â”€ Web OTA (/update) â”€â”€
    server.on("/update", HTTP_GET, [](AsyncWebServerRequest *request){
        String html = "<!DOCTYPE html><html><head><title>BuddyBot Web OTA</title>";
        html += "<style>body{font-family:sans-serif;background:#2c3e50;color:white;text-align:center;padding:50px;}";
        html += ".card{background:#34495e;padding:20px;border-radius:10px;display:inline-block;}";
        html += "input[type=submit]{background:#e74c3c;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;font-size:16px;}</style></head>";
        html += "<body><h1>ðŸ¤– BuddyBot Firmware & FS Update</h1>";
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

    // â”€â”€ POST /api/reboot â”€â”€

    server.on("/api/reboot", HTTP_POST, [](AsyncWebServerRequest *request){
        request->send(200, "text/plain", "Rebooting...");
        delay(500);
        esp_restart();
    });

    server.begin();
    M5.Display.println("Web Server Started");

    ArduinoOTA.setHostname("BuddyBot-Core");
    ArduinoOTA.begin();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Setup
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


extern WiFiMulti wifiMulti;

void initWiFi() {
    WiFi.mode(WIFI_STA);
    if (strlen(buddyConfig.wifi_ssid1) > 0) {
        wifiMulti.addAP(buddyConfig.wifi_ssid1, buddyConfig.wifi_pass1);
        M5.Display.println("Connecting to WiFi...");
        int attempts = 0;
        while(wifiMulti.run() != WL_CONNECTED && attempts < 20) {
            delay(500);
            M5.Display.print(".");
            attempts++;
        }
        M5.Display.println("");
        if(WiFi.status() == WL_CONNECTED) {
            M5.Display.print("Connected! IP: ");
            M5.Display.println(WiFi.localIP());
        } else {
            M5.Display.println("WiFi Failed.");
        }
    }
}

