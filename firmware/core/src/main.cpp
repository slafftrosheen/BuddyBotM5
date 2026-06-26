#include <Arduino.h>
#include <SD.h>
#include <M5CoreS3.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <ArduinoOTA.h>

#define sensor_t Adafruit_sensor_t
#include <Adafruit_Sensor.h>
#include "Adafruit_BME680.h"
#undef sensor_t

// ═══════════════════════════════════════
// Persona State (8 emotions)
// ═══════════════════════════════════════
// 0: Neutral, 1: Happy, 2: Angry, 3: Sleepy
// 4: Excited, 5: Sad, 6: Curious, 7: Alert
int currentEmotion = 0;
int lastEmotion = -1;
unsigned long nextBlink = 0;
bool isBlinking = false;

// Persona customization
uint16_t eyeColor = CYAN;
int eyeSize = 30;
int blinkRate = 3000;

// IMU State
float imu_pitch = 0.0;
float imu_roll = 0.0;

// Gamification State
unsigned long lastActivityTime = 0;
unsigned long nextQuirkTime = 60000;
unsigned long pettingStartTime = 0;
bool isPetting = false;

// Audio Recording (Parrot Mode)
int16_t* audioBuffer = nullptr;
size_t audioBufferSize = 16000 * 3; // 16kHz * 3 seconds = 48K samples (96KB)
size_t recordedLength = 0;

#include <WiFiMulti.h>

WiFiMulti wifiMulti;
const char* password = "Slaff181188";

// Web Server
AsyncWebServer server(80);

// BME680 Sensor
Adafruit_BME680 bme;

// ═══════════════════════════════════════
// RollerCAN I2C Protocol
// Address: 0x64 (M1), 0x65 (M2)
// Reg 0x00: Config — byte0=output(0/1), byte1=mode(1=speed)
// Reg 0x40: Speed — 4 bytes, int32 LE, value = RPM * 100
// ═══════════════════════════════════════
const uint8_t ROLLER_M1_ADDR = 0x64;
const uint8_t ROLLER_M2_ADDR = 0x65;

// ═══════════════════════════════════════
// 8-Channel Servo Hat I2C Protocol
// Address: 0x38
// Reg 0x00-0x07: CH0-CH7 angle (0-180)
// For continuous rotation: 90=stop, 0=full CW, 180=full CCW
// ═══════════════════════════════════════
const uint8_t SERVO_HAT_ADDR = 0x38;

// Config
String cam_ip = "10.140.12.137";
int motorTrimL = 0;
int motorTrimR = 0;
bool motorsInitialized = false;

// ═══════════════════════════════════════
// RollerCAN Motor Control
// ═══════════════════════════════════════
void rollerSetConfig(uint8_t addr, uint8_t output, uint8_t mode) {
    Wire.beginTransmission(addr);
    Wire.write(0x00);       // Config register
    Wire.write(output);     // 0=off, 1=on
    Wire.write(mode);       // 1=speed, 2=position, 3=current
    Wire.endTransmission();
}

void rollerSetSpeed(uint8_t addr, int32_t speedRPM100) {
    // Speed register 0x40, 4 bytes Little-Endian (value = RPM * 100)
    Wire.beginTransmission(addr);
    Wire.write(0x40);
    Wire.write((uint8_t)(speedRPM100 & 0xFF));
    Wire.write((uint8_t)((speedRPM100 >> 8) & 0xFF));
    Wire.write((uint8_t)((speedRPM100 >> 16) & 0xFF));
    Wire.write((uint8_t)((speedRPM100 >> 24) & 0xFF));
    Wire.endTransmission();
}

void initMotors() {
    // Enable both motors in Speed Mode
    rollerSetConfig(ROLLER_M1_ADDR, 1, 1); // Output ON, Speed Mode
    delay(10);
    rollerSetConfig(ROLLER_M2_ADDR, 1, 1);
    delay(10);
    // Start with speed = 0
    rollerSetSpeed(ROLLER_M1_ADDR, 0);
    rollerSetSpeed(ROLLER_M2_ADDR, 0);
    motorsInitialized = true;
}

// Set motor speeds from -100..+100 percentage
// Maps to approximately -3000..+3000 RPM (* 100 for register)
void setMotorSpeeds(int speedPctM1, int speedPctM2) {
    // Map -100..100 to -300000..300000 (= -3000..3000 RPM * 100)
    int32_t rpm100_m1 = (int32_t)speedPctM1 * 3000;
    int32_t rpm100_m2 = (int32_t)speedPctM2 * 3000;
    rollerSetSpeed(ROLLER_M1_ADDR, rpm100_m1);
    rollerSetSpeed(ROLLER_M2_ADDR, rpm100_m2);
}

// ═══════════════════════════════════════
// 8-Servo Hat Control
// ═══════════════════════════════════════
void setServoAngle(uint8_t channel, uint8_t angle) {
    // channel 0-7, angle 0-180
    // For continuous rotation servos: 90=stop, <90=CW, >90=CCW
    if (channel > 7) return;
    if (angle > 180) angle = 180;
    Wire.beginTransmission(SERVO_HAT_ADDR);
    Wire.write(channel);   // Register = channel number (0x00-0x07)
    Wire.write(angle);
    Wire.endTransmission();
}

// ═══════════════════════════════════════
// Sound Effects via M5.Speaker
// ═══════════════════════════════════════
void playSound(const char* sound) {
    if (strcmp(sound, "beep") == 0) {
        M5.Speaker.tone(1000, 200);
    } else if (strcmp(sound, "siren") == 0) {
        for (int i = 0; i < 3; i++) {
            M5.Speaker.tone(800, 150);
            delay(200);
            M5.Speaker.tone(1200, 150);
            delay(200);
        }
    } else if (strcmp(sound, "laugh") == 0) {
        int notes[] = {500, 600, 700, 600, 500, 700, 800};
        for (int i = 0; i < 7; i++) {
            M5.Speaker.tone(notes[i], 80);
            delay(100);
        }
    } else if (strcmp(sound, "horn") == 0) {
        M5.Speaker.tone(300, 500);
    } else if (strcmp(sound, "r2d2") == 0) {
        int freqs[] = {2000, 1500, 2500, 1800, 2200, 1000, 3000, 1200};
        for (int i = 0; i < 8; i++) {
            M5.Speaker.tone(freqs[i], 60);
            delay(80);
        }
    } else if (strcmp(sound, "melody") == 0) {
        int notes[] = {262, 294, 330, 349, 392, 440, 494, 523};
        for (int i = 0; i < 8; i++) {
            M5.Speaker.tone(notes[i], 150);
            delay(180);
        }
    } else if (strcmp(sound, "purr") == 0) {
        for (int i = 0; i < 5; i++) {
            M5.Speaker.tone(150, 100);
            delay(120);
            M5.Speaker.tone(120, 100);
            delay(120);
        }
    } else if (strcmp(sound, "sneeze") == 0) {
        M5.Speaker.tone(2000, 50);
        delay(100);
        M5.Speaker.tone(3000, 150);
    } else if (strcmp(sound, "whistle") == 0) {
        M5.Speaker.tone(1500, 200);
        delay(250);
        M5.Speaker.tone(2000, 400);
    } else if (strcmp(sound, "snore") == 0) {
        M5.Speaker.tone(200, 800);
        delay(900);
        M5.Speaker.tone(400, 400);
    } else if (strcmp(sound, "eat") == 0) {
        for (int i = 0; i < 4; i++) {
            M5.Speaker.tone(800 + (i*100), 50);
            delay(60);
        }
    }
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
// Persona Rendering (8 emotions)
// ═══════════════════════════════════════
void updatePersona() {
    if (currentEmotion != lastEmotion || millis() > nextBlink) {
        M5.Lcd.fillScreen(BLACK);

        int cx1 = 100, cx2 = 220, cy = 120;

        if (isBlinking) {
            M5.Lcd.fillRect(cx1 - eyeSize, cy, eyeSize * 2, 4, eyeColor);
            M5.Lcd.fillRect(cx2 - eyeSize, cy, eyeSize * 2, 4, eyeColor);
            isBlinking = false;
            nextBlink = millis() + 150; // Eyes closed for 150ms
        } else {
            switch (currentEmotion) {
                case 0: // Neutral
                    M5.Lcd.fillCircle(cx1, cy, eyeSize, eyeColor);
                    M5.Lcd.fillCircle(cx2, cy, eyeSize, eyeColor);
                    break;
                case 1: // Happy
                    M5.Lcd.fillArc(cx1, cy + 10, eyeSize / 2, eyeSize, 180, 360, eyeColor);
                    M5.Lcd.fillArc(cx2, cy + 10, eyeSize / 2, eyeSize, 180, 360, eyeColor);
                    break;
                case 2: // Angry
                    M5.Lcd.fillCircle(cx1, cy, eyeSize, RED);
                    M5.Lcd.fillCircle(cx2, cy, eyeSize, RED);
                    M5.Lcd.fillTriangle(cx1 - 40, cy - 50, cx1 + 40, cy - 10, cx1 + 40, cy - 50, BLACK);
                    M5.Lcd.fillTriangle(cx2 - 40, cy - 10, cx2 + 40, cy - 50, cx2 - 40, cy - 50, BLACK);
                    break;
                case 3: // Sleepy
                    M5.Lcd.fillRect(cx1 - eyeSize, cy, eyeSize * 2, 6, eyeColor);
                    M5.Lcd.fillRect(cx2 - eyeSize, cy, eyeSize * 2, 6, eyeColor);
                    M5.Lcd.setTextSize(2);
                    M5.Lcd.setTextColor(eyeColor);
                    M5.Lcd.setCursor(260, 60);
                    M5.Lcd.print("z");
                    M5.Lcd.setCursor(275, 40);
                    M5.Lcd.print("Z");
                    break;
                case 4: // Excited — ring eyes with sparkle
                    M5.Lcd.fillCircle(cx1, cy, eyeSize + 8, eyeColor);
                    M5.Lcd.fillCircle(cx2, cy, eyeSize + 8, eyeColor);
                    M5.Lcd.fillCircle(cx1, cy, eyeSize - 5, BLACK);
                    M5.Lcd.fillCircle(cx2, cy, eyeSize - 5, BLACK);
                    M5.Lcd.fillCircle(cx1, cy, eyeSize / 3, eyeColor);
                    M5.Lcd.fillCircle(cx2, cy, eyeSize / 3, eyeColor);
                    M5.Lcd.fillCircle(cx1 + 10, cy - 12, 4, WHITE);
                    M5.Lcd.fillCircle(cx2 + 10, cy - 12, 4, WHITE);
                    break;
                case 5: // Sad — droopy with tear
                    M5.Lcd.fillCircle(cx1, cy, eyeSize, eyeColor);
                    M5.Lcd.fillCircle(cx2, cy, eyeSize, eyeColor);
                    M5.Lcd.fillTriangle(cx1 - 35, cy - 35, cx1 + 35, cy - 20, cx1 - 35, cy - 20, BLACK);
                    M5.Lcd.fillTriangle(cx2 + 35, cy - 35, cx2 - 35, cy - 20, cx2 + 35, cy - 20, BLACK);
                    M5.Lcd.fillCircle(cx1 + 20, cy + 35, 5, BLUE);
                    break;
                case 6: // Curious — asymmetric
                    M5.Lcd.fillCircle(cx1, cy, eyeSize + 10, eyeColor);
                    M5.Lcd.fillCircle(cx2, cy, eyeSize - 5, eyeColor);
                    M5.Lcd.setTextSize(3);
                    M5.Lcd.setTextColor(eyeColor);
                    M5.Lcd.setCursor(145, 50);
                    M5.Lcd.print("?");
                    break;
                case 7: // Alert — diamond eyes
                    M5.Lcd.fillTriangle(cx1, cy - eyeSize, cx1 + eyeSize, cy, cx1, cy + eyeSize, RED);
                    M5.Lcd.fillTriangle(cx1, cy - eyeSize, cx1 - eyeSize, cy, cx1, cy + eyeSize, RED);
                    M5.Lcd.fillTriangle(cx2, cy - eyeSize, cx2 + eyeSize, cy, cx2, cy + eyeSize, RED);
                    M5.Lcd.fillTriangle(cx2, cy - eyeSize, cx2 - eyeSize, cy, cx2, cy + eyeSize, RED);
                    M5.Lcd.setTextSize(3);
                    M5.Lcd.setTextColor(RED);
                    M5.Lcd.setCursor(145, 50);
                    M5.Lcd.print("!");
                    break;
                case 8: // Love — heart eyes (simple approximation)
                    M5.Lcd.fillCircle(cx1 - 10, cy - 10, eyeSize/1.5, RED);
                    M5.Lcd.fillCircle(cx1 + 10, cy - 10, eyeSize/1.5, RED);
                    M5.Lcd.fillTriangle(cx1 - 25, cy, cx1 + 25, cy, cx1, cy + 30, RED);
                    M5.Lcd.fillCircle(cx2 - 10, cy - 10, eyeSize/1.5, RED);
                    M5.Lcd.fillCircle(cx2 + 10, cy - 10, eyeSize/1.5, RED);
                    M5.Lcd.fillTriangle(cx2 - 25, cy, cx2 + 25, cy, cx2, cy + 30, RED);
                    break;
                case 9: // Shock — jagged eyes
                    M5.Lcd.fillTriangle(cx1, cy - eyeSize, cx1 + eyeSize, cy + eyeSize/2, cx1 - eyeSize, cy + eyeSize/2, eyeColor);
                    M5.Lcd.fillTriangle(cx2, cy - eyeSize, cx2 + eyeSize, cy + eyeSize/2, cx2 - eyeSize, cy + eyeSize/2, eyeColor);
                    M5.Lcd.fillCircle(cx1, cy + eyeSize/4, eyeSize/3, BLACK);
                    M5.Lcd.fillCircle(cx2, cy + eyeSize/4, eyeSize/3, BLACK);
                    break;
                case 10: // Dizzy — concentric circles
                    for(int i=0; i<4; i++) {
                        M5.Lcd.drawCircle(cx1, cy, eyeSize - i*6, eyeColor);
                        M5.Lcd.drawCircle(cx2, cy, eyeSize - i*6, eyeColor);
                    }
                    M5.Lcd.fillCircle(cx1, cy, 4, RED);
                    M5.Lcd.fillCircle(cx2, cy, 4, RED);
                    break;
                case 11: // Cool — sunglasses
                    M5.Lcd.fillRect(cx1 - eyeSize, cy - eyeSize/2, eyeSize*2, eyeSize, BLACK);
                    M5.Lcd.fillRect(cx2 - eyeSize, cy - eyeSize/2, eyeSize*2, eyeSize, BLACK);
                    M5.Lcd.drawRect(cx1 - eyeSize, cy - eyeSize/2, eyeSize*2, eyeSize, eyeColor);
                    M5.Lcd.drawRect(cx2 - eyeSize, cy - eyeSize/2, eyeSize*2, eyeSize, eyeColor);
                    M5.Lcd.drawLine(cx1 + eyeSize, cy - eyeSize/2 + 5, cx2 - eyeSize, cy - eyeSize/2 + 5, eyeColor);
                    break;
            }
            isBlinking = true;
            nextBlink = millis() + random(blinkRate / 2, blinkRate); // Eyes open for random duration
        }
        lastEmotion = currentEmotion;
    }
}

// ═══════════════════════════════════════
// WiFi Init
// ═══════════════════════════════════════
void initWiFi() {
    M5.Lcd.fillScreen(BLACK);
    M5.Lcd.setCursor(0, 0);
    M5.Lcd.setTextSize(2);
    M5.Lcd.println("Connecting to WiFi...");

    WiFi.mode(WIFI_STA);
    wifiMulti.addAP("STARLINK.TAK", password);
    wifiMulti.addAP("TAK", password);

    while (wifiMulti.run() != WL_CONNECTED) {
        delay(500);
        M5.Lcd.print(".");
    }

    M5.Lcd.println("\nConnected!");
    M5.Lcd.print("IP: ");
    M5.Lcd.println(WiFi.localIP());
}

// ═══════════════════════════════════════
// Web Server Init
// ═══════════════════════════════════════
void initServer() {
    // Serve Web UI from SD Card
    server.serveStatic("/", SD, "/").setDefaultFile("index.html");

    // File Upload Handler (push web files to SD via WiFi)
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
            doc["temp"] = 0;
            doc["hum"] = 0;
            doc["pres"] = 0;
            doc["gas"] = 0;
        }
        doc["pitch"] = imu_pitch;
        doc["roll"] = imu_roll;
        doc["heap"] = ESP.getFreeHeap();
        doc["rssi"] = WiFi.RSSI();
        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    // ── GET /api/config ──
    server.on("/api/config", HTTP_GET, [](AsyncWebServerRequest *request){
        JsonDocument doc;
        doc["cam_ip"] = cam_ip;
        doc["trimL"] = motorTrimL;
        doc["trimR"] = motorTrimR;
        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    // ── POST /api/config ──
    server.on("/api/config", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        if (!deserializeJson(doc, data, len)) {
            if (doc.containsKey("trimL")) motorTrimL = doc["trimL"];
            if (doc.containsKey("trimR")) motorTrimR = doc["trimR"];
            request->send(200, "text/plain", "OK");
        } else {
            request->send(400, "text/plain", "Bad Request");
        }
    });

    // ── POST /api/motors ──
    // Receives speed (-100..100) and turn (-100..100)
    // Applies differential mix and drives RollerCAN motors + CH0 steering servo
    server.on("/api/motors", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, data, len);
        if (!error) {
            int speed = doc["speed"]; // -100 to 100
            int turn = doc["turn"];   // -100 to 100

            // Apply trims
            int trimL = doc["trimL"] | motorTrimL;
            int trimR = doc["trimR"] | motorTrimR;

            // Differential drive mix
            int m1 = speed + turn + trimL;
            int m2 = speed - turn + trimR;
            m1 = constrain(m1, -100, 100);
            m2 = constrain(m2, -100, 100);

            // Drive RollerCAN motors with proper protocol
            setMotorSpeeds(m1, m2);

            // CH0 steering servo — continuous rotation
            // turn -100..+100 → pulse 0..180 (90 = stop)
            int steer_pulse = map(turn, -100, 100, 0, 180);
            setServoAngle(0, steer_pulse);

            request->send(200, "text/plain", "OK");
            lastActivityTime = millis();
        } else {
            request->send(400, "text/plain", "Bad Request");
        }
    });

    // ── POST /api/servo ──
    // For individual servo control (continuous rotation)
    // Receives channel (0-7) and angle (0-180, 90=stop)
    server.on("/api/servo", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, data, len);
        if (!error) {
            int channel = doc["channel"];
            int angle = doc["angle"]; // 0-180, 90=stop
            setServoAngle(channel, angle);
            request->send(200, "text/plain", "OK");
            lastActivityTime = millis();
        } else {
            request->send(400, "text/plain", "Bad Request");
        }
    });

    // ── POST /api/persona ──
    // Accepts emotion (0-7), eyeColor (#hex), eyeSize, blinkRate
    server.on("/api/persona", HTTP_POST, [](AsyncWebServerRequest *request){
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        if (!deserializeJson(doc, data, len)) {
            currentEmotion = doc["emotion"] | 0;
            lastEmotion = -1; // force redraw

            if (doc.containsKey("eyeColor")) {
                const char* hex = doc["eyeColor"];
                eyeColor = hexToColor565(hex);
            }
            if (doc.containsKey("eyeSize")) {
                eyeSize = doc["eyeSize"] | 30;
            }
            if (doc.containsKey("blinkRate")) {
                blinkRate = doc["blinkRate"] | 3000;
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
            playSound(sound);
            request->send(200, "text/plain", "OK");
            lastActivityTime = millis();
        } else {
            request->send(400, "text/plain", "Bad Request");
        }
    });

    // ── GET /api/action ──
    server.on("/api/action", HTTP_GET, [](AsyncWebServerRequest *request){
        if (request->hasParam("cmd")) {
            String cmd = request->getParam("cmd")->value();
            if (cmd == "treat") {
                // Play eating sound, wiggle, happy face
                playSound("eat");
                setMotorSpeeds(50, -50);
                delay(150);
                setMotorSpeeds(-50, 50);
                delay(150);
                setMotorSpeeds(0, 0);
                currentEmotion = 1; // Happy
                lastEmotion = -1;
                lastActivityTime = millis();
                request->send(200, "text/plain", "Yummy");
                return;
            }
        }
        request->send(400, "text/plain", "Invalid Action");
    });

    // ── POST /api/record ──
    server.on("/api/record", HTTP_POST, [](AsyncWebServerRequest *request){
        if (audioBuffer == nullptr) {
            audioBuffer = (int16_t*)ps_malloc(audioBufferSize * sizeof(int16_t));
        }
        if (audioBuffer != nullptr) {
            M5.Speaker.tone(2000, 100); // Beep to indicate start
            delay(150);
            M5.Mic.record(audioBuffer, audioBufferSize, 16000);
            while (M5.Mic.isRecording()) {
                delay(10);
                M5.update();
            }
            recordedLength = audioBufferSize;
            M5.Speaker.tone(1000, 100); // Beep to indicate end
            request->send(200, "text/plain", "Recorded");
        } else {
            request->send(500, "text/plain", "Out of memory");
        }
    });

    // ── POST /api/playback ──
    server.on("/api/playback", HTTP_POST, [](AsyncWebServerRequest *request){
        float pitchMult = 1.0;
        if (request->hasParam("pitch")) {
            pitchMult = request->getParam("pitch")->value().toFloat();
            if (pitchMult < 0.5) pitchMult = 0.5;
            if (pitchMult > 2.0) pitchMult = 2.0;
        }
        if (audioBuffer != nullptr && recordedLength > 0) {
            M5.Speaker.playRaw(audioBuffer, recordedLength, 16000 * pitchMult);
            request->send(200, "text/plain", "Playing");
        } else {
            request->send(400, "text/plain", "No audio recorded");
        }
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
    cfg.internal_mic = false; // Disable mic to prevent I2S crash on CoreS3
    M5.begin(cfg);
    M5.Imu.begin();
    M5.Speaker.begin();
    M5.Speaker.setVolume(128);
    Wire.begin(2, 1); // CoreS3 PORT A I2C (SDA=2, SCL=1)

    initWiFi();

    SPI.begin(36, 35, 37, 4);
    if (!SD.begin(4, SPI, 25000000)) {
        M5.Lcd.setTextColor(RED);
        M5.Lcd.println("SD Card: NOT MOUNTED!");
        M5.Lcd.setTextColor(WHITE);
    } else {
        M5.Lcd.setTextColor(GREEN);
        M5.Lcd.println("SD Card: MOUNTED OK");
        M5.Lcd.setTextColor(WHITE);
    }

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

    // Initialize all servos to stop (90)
    for (int i = 0; i < 8; i++) {
        setServoAngle(i, 90);
    }
    M5.Lcd.println("Servos: STOP");

    initServer();

    // Startup chime
    M5.Speaker.tone(1000, 100);
    delay(120);
    M5.Speaker.tone(1500, 100);
    delay(120);
    M5.Speaker.tone(2000, 150);

    delay(3000);
}

// ═══════════════════════════════════════
// Loop
// ═══════════════════════════════════════
void loop() {
    M5.update();
    ArduinoOTA.handle();

    // IMU processing
    float ax, ay, az;
    M5.Imu.getAccel(&ax, &ay, &az);
    imu_pitch = atan2(ax, sqrt(ay * ay + az * az)) * 180.0 / PI;
    imu_roll = atan2(ay, az) * 180.0 / PI;

    // Gamification: Petting Detection
    float accMag = sqrt(ax * ax + ay * ay + az * az);
    static float lastAccMag = 1.0;
    if (abs(accMag - lastAccMag) > 0.2) { 
        if (!isPetting) {
            pettingStartTime = millis();
            isPetting = true;
        } else if (millis() - pettingStartTime > 2000) {
            playSound("purr");
            currentEmotion = 1; // Happy
            lastEmotion = -1;
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
            playSound("sneeze");
            currentEmotion = 6; // Curious
        } else if (quirk == 1) {
            playSound("whistle");
            currentEmotion = 1; // Happy
        } else {
            playSound("snore");
            currentEmotion = 3; // Sleepy
        }
        lastEmotion = -1;
        lastActivityTime = millis();
        nextQuirkTime = random(20000, 45000);
    }

    // Touch: cycle emotions on tap
    if (M5.Touch.getCount() > 0) {
        auto t = M5.Touch.getDetail();
        if (t.wasClicked()) {
            currentEmotion = (currentEmotion + 1) % 12;
            lastEmotion = -1;
        }
    }

    // Persona rendering
    updatePersona();

    delay(10);
}
