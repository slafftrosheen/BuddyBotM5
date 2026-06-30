#include <Arduino.h>
#include <LittleFS.h>
#include <M5Cardputer.h>
#include <M5Unified.h>
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
#include "motor.h"
#include "api.h"
#include <ESP32Servo.h>

Servo gpioServoL;
Servo gpioServoR;

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
void setup() {
    auto cfg = M5.config();
    cfg.internal_mic = false;
    M5.begin(cfg); // Use M5.begin() instead of M5.begin() to properly initialize AW9523 on CoreS3! // Use M5.begin() instead of M5.begin() to properly initialize AW9523 on CoreS3!

    int sda = M5.Ex_I2C.getSDA();
    int scl = M5.Ex_I2C.getSCL();
    Wire.begin(sda, scl);

    // Check 8Servos Unit availability
    Wire.beginTransmission(SERVO_HAT_ADDR);
    buddyConfig.hasServo = (Wire.endTransmission() == 0);
    
    if (buddyConfig.hasServo) {
        // Initialize Unit 8Servos mode registers to SERVO_CTL_MODE (0x03)
        for (int i = 0; i < 8; i++) {
            Wire.beginTransmission(SERVO_HAT_ADDR);
            Wire.write(0x00 + i); // Mode Register for channel
            Wire.write(0x03);     // SERVO_CTL_MODE
            Wire.endTransmission();
            delay(10);
        }
    }

    // Initialize LittleFS for Web UI
    if (!LittleFS.begin(true)) {
        M5.Display.println("LittleFS Mount FAILED");
    } else {
        M5.Display.println("LittleFS: MOUNTED OK");
    }

    // Load config from LittleFS (or create defaults)
    configLoad();

    // Set screen rotation from config
    M5.Display.setRotation(buddyConfig.screenRotation);

    // Apply config values
    M5.Speaker.setVolume(buddyConfig.speakerVolume);

    // Initialize sound system
    initSoundPlayer();

    // Connect WiFi using config credentials
    initWiFi();

    // Initialize BME680
    if (!bme.begin(0x76)) {
        M5.Display.println("BME680: NOT FOUND");
    } else {
        bme.setTemperatureOversampling(BME680_OS_8X);
        bme.setHumidityOversampling(BME680_OS_2X);
        bme.setPressureOversampling(BME680_OS_4X);
        bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
        bme.setGasHeater(320, 150);
        M5.Display.println("BME680: OK");
    }

    // Initialize RollerCAN motors
    initMotors();
    M5.Display.println("Motors: INIT");

    // Initialize all servos to stop (90)
    for (int i = 0; i < 8; i++) {
        setServoAngle(i, 90);
    }
    M5.Display.println("Servos: STOP");

    M5.Display.printf("HW: Core%s%s\n", 
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
    M5.update();
    ArduinoOTA.handle();

    // ?? Cardputer Keyboard Processing ??
    M5Cardputer.update();
    if (M5Cardputer.Keyboard.isChange() && M5Cardputer.Keyboard.isPressed()) {
        Keyboard_Class::KeysState keys = M5Cardputer.Keyboard.keysState();
        if (keys.word.size() > 0) {
            char pressedKey = keys.word[0]; // first char
            
            // Look up in keybinds.json (Warning: blocking read, but fine for single keypress)
            if (LittleFS.exists("/keybinds.json")) {
                File f = LittleFS.open("/keybinds.json", FILE_READ);
                JsonDocument kbDoc;
                if (!deserializeJson(kbDoc, f)) {
                    JsonArray arr = kbDoc.to<JsonArray>();
                    for (JsonObject obj : arr) {
                        String k = obj["key"].as<String>();
                        if (k.length() > 0 && k.charAt(0) == pressedKey) {
                            String action = obj["action"].as<String>();
                            // Very basic local execution map
                            if (action.indexOf("treat") != -1) {
                                playSoundAsync("eat");
                                persona.setEmotion(EMO_HAPPY);
                            } else if (action.indexOf("sound=") != -1) {
                                int idx = action.indexOf("=");
                                playSoundAsync(action.substring(idx+1).c_str());
                            } else if (action.indexOf("speed=") != -1) {
                                // e.g., speed=50, speed=-50
                            }
                            break;
                        }
                    }
                }
                f.close();
            }
        }
    }

    // Sleep Schedule Check
    m5::rtc_datetime_t dt_rtc;
    bool is_sleeping = false;
    if (M5.Rtc.getDateTime(&dt_rtc)) {
        int cur_min = dt_rtc.time.hours * 60 + dt_rtc.time.minutes;
        int sleep_min = buddyConfig.sleepStartH * 60 + buddyConfig.sleepStartM;
        int wake_min = buddyConfig.wakeStartH * 60 + buddyConfig.wakeStartM;
        
        if (sleep_min < wake_min) {
            if (cur_min >= sleep_min && cur_min < wake_min) is_sleeping = true;
        } else {
            if (cur_min >= sleep_min || cur_min < wake_min) is_sleeping = true;
        }
    }
    
    if (is_sleeping) {
        M5.Display.setBrightness(1); // Dim screen
        target_speed = 0;
        target_turn = 0;
    } else {
        M5.Display.setBrightness(255);
    }

    // IMU processing
    unsigned long now = millis();
    float dt = (now - last_imu_time) / 1000.0;
    
    float ax = 0, ay = 0, az = 0;
    
    // Only retrieve IMU data if an IMU is present
    if (M5.Imu.isEnabled()) {
        auto imu_data = M5.Imu.getImuData();
        ax = imu_data.accel.x;
        ay = imu_data.accel.y;
        az = imu_data.accel.z;
        
        imu_pitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI;
        imu_roll = atan2(ay, az) * 180.0 / PI;
        
        float accel_mag = sqrt(ax*ax + ay*ay + az*az);
        if (accel_mag > 2.5) {
            static unsigned long lastShakeTime = 0;
            if (millis() - lastShakeTime > 2000) {
                persona.setEmotion(EMO_ANGRY);
                playSoundAsync("alert");
                lastShakeTime = millis();
                lastActivityTime = millis();
            }
        }
        
        // Approximate Yaw from Gyro (requires filtering for real use)
        if (last_imu_time > 0 && dt > 0) {
            imu_yaw += imu_data.gyro.z * dt; 
        }
    }
    last_imu_time = now;

    // ── Motor Control & Slew Rate Limiting ──
    float m1_req = target_m1;
    float m2_req = target_m2;

    // Flip/Stall Detection
    if (abs(imu_pitch) > 60.0 || abs(imu_roll) > 60.0) {
        m1_req = 0;
        m2_req = 0;
        target_m1 = 0;
        target_m2 = 0;
        
        static unsigned long lastFallTime = 0;
        if (millis() - lastFallTime > 3000) {
            playSoundAsync("dizzy");
            persona.setEmotion(EMO_DIZZY);
            lastActivityTime = millis();
            lastFallTime = millis();
        }
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
