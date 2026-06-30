#include <Arduino.h>
#include <Wire.h>
#include <ESP32Servo.h>
#include "motor.h"
#include "config.h"

extern Servo gpioServoL;
extern Servo gpioServoR;
// RollerCAN I2C Protocol
// ═══════════════════════════════════════
const uint8_t ROLLER_M1_ADDR = 0x64;
const uint8_t ROLLER_M2_ADDR = 0x65;

// ═══════════════════════════════════════
// 8-Channel Servo Hat I2C Protocol
// ═══════════════════════════════════════
// 8-Channel Servo Hat I2C Protocol (Unit 8Servos uses 0x25)
extern const uint8_t SERVO_HAT_ADDR = 0x25;

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

// Forward Declarations
void setServoAngle(uint8_t channel, uint8_t angle);

// Motor speed with inversion from config
void setMotorSpeeds(int speedPctM1, int speedPctM2) {
    if (buddyConfig.motorInvertL) speedPctM1 = -speedPctM1;
    if (buddyConfig.motorInvertR) speedPctM2 = -speedPctM2;
    
    if (buddyConfig.driveType == 0) {
        // I2C M5Motors
        int32_t rpm100_m1 = (int32_t)speedPctM1 * buddyConfig.motorMaxRPM;
        int32_t rpm100_m2 = (int32_t)speedPctM2 * buddyConfig.motorMaxRPM;
        rollerSetSpeed(ROLLER_M1_ADDR, rpm100_m1);
        rollerSetSpeed(ROLLER_M2_ADDR, rpm100_m2);
    } 
    else if (buddyConfig.driveType == 1) {
        // 8Servos Unit (Continuous Rotation)
        int angleL = 90 + buddyConfig.driveCenterOffsetL + map(speedPctM1, -100, 100, -90, 90);
        int angleR = 90 + buddyConfig.driveCenterOffsetR + map(speedPctM2, -100, 100, -90, 90);
        angleL = constrain(angleL, 0, 180);
        angleR = constrain(angleR, 0, 180);
        setServoAngle(buddyConfig.driveChannelL, angleL);
        setServoAngle(buddyConfig.driveChannelR, angleR);
    }
    else if (buddyConfig.driveType == 2) {
        // GPIO Servos (Optimized for precision continuous rotation)
        static int lastFreqL = -1;
        static int lastPinL = -1;
        static int lastFreqR = -1;
        static int lastPinR = -1;

        if (!gpioServoL.attached() || lastFreqL != buddyConfig.pwmFreq || lastPinL != buddyConfig.drivePinL1) {
            if (gpioServoL.attached()) gpioServoL.detach();
            ESP32PWM::allocateTimer(0);
            gpioServoL.setPeriodHertz(buddyConfig.pwmFreq);
            gpioServoL.attach(buddyConfig.drivePinL1, buddyConfig.pwmMin, buddyConfig.pwmMax);
            lastFreqL = buddyConfig.pwmFreq;
            lastPinL = buddyConfig.drivePinL1;
        }
        if (!gpioServoR.attached() || lastFreqR != buddyConfig.pwmFreq || lastPinR != buddyConfig.drivePinR1) {
            if (gpioServoR.attached()) gpioServoR.detach();
            ESP32PWM::allocateTimer(1);
            gpioServoR.setPeriodHertz(buddyConfig.pwmFreq);
            gpioServoR.attach(buddyConfig.drivePinR1, buddyConfig.pwmMin, buddyConfig.pwmMax);
            lastFreqR = buddyConfig.pwmFreq;
            lastPinR = buddyConfig.drivePinR1;
        }

        int centerBaseL = (buddyConfig.pwmMin + buddyConfig.pwmMax) / 2;
        int centerBaseR = (buddyConfig.pwmMin + buddyConfig.pwmMax) / 2;
        
        // Scale legacy angle offsets (~11us per degree)
        int centerPulseL = centerBaseL + (buddyConfig.driveCenterOffsetL * 11);
        int centerPulseR = centerBaseR + (buddyConfig.driveCenterOffsetR * 11);

        int pulseL;
        if (speedPctM1 >= 0) {
            pulseL = map(speedPctM1, 0, 100, centerPulseL, buddyConfig.pwmMax);
        } else {
            pulseL = map(speedPctM1, -100, 0, buddyConfig.pwmMin, centerPulseL);
        }
        
        int pulseR;
        if (speedPctM2 >= 0) {
            pulseR = map(speedPctM2, 0, 100, centerPulseR, buddyConfig.pwmMax);
        } else {
            pulseR = map(speedPctM2, -100, 0, buddyConfig.pwmMin, centerPulseR);
        }

        gpioServoL.writeMicroseconds(pulseL);
        gpioServoR.writeMicroseconds(pulseR);
    }
    else if (buddyConfig.driveType == 3) {
        // GPIO H-Bridge (e.g. L298N)
        // Uses L1, L2, R1, R2. Map -100..100 to PWM 0..255
        static bool hbridge_init = false;
        if (!hbridge_init) {
            pinMode(buddyConfig.drivePinL1, OUTPUT);
            pinMode(buddyConfig.drivePinL2, OUTPUT);
            pinMode(buddyConfig.drivePinR1, OUTPUT);
            pinMode(buddyConfig.drivePinR2, OUTPUT);
            hbridge_init = true;
        }
        
        int pwm_m1 = map(abs(speedPctM1), 0, 100, 0, 255);
        int pwm_m2 = map(abs(speedPctM2), 0, 100, 0, 255);
        
        if (speedPctM1 > 0) {
            analogWrite(buddyConfig.drivePinL1, pwm_m1);
            analogWrite(buddyConfig.drivePinL2, 0);
        } else if (speedPctM1 < 0) {
            analogWrite(buddyConfig.drivePinL1, 0);
            analogWrite(buddyConfig.drivePinL2, pwm_m1);
        } else {
            analogWrite(buddyConfig.drivePinL1, 0);
            analogWrite(buddyConfig.drivePinL2, 0);
        }
        
        if (speedPctM2 > 0) {
            analogWrite(buddyConfig.drivePinR1, pwm_m2);
            analogWrite(buddyConfig.drivePinR2, 0);
        } else if (speedPctM2 < 0) {
            analogWrite(buddyConfig.drivePinR1, 0);
            analogWrite(buddyConfig.drivePinR2, pwm_m2);
        } else {
            analogWrite(buddyConfig.drivePinR1, 0);
            analogWrite(buddyConfig.drivePinR2, 0);
        }
    }
    else if (buddyConfig.driveType == 4) {
        // TTL Serial (Feetech STS)
        static bool ttl_init = false;
        if (!ttl_init) {
            Serial2.begin(1000000, SERIAL_8N1, buddyConfig.ttlServoRx, buddyConfig.ttlServoTx);
            ttl_init = true;
        }
        
        auto writeStsSpeed = [](int id, int speedPct) {
            int speed_abs = abs(speedPct) * 40; // 0..100 -> 0..4000
            if (speed_abs > 4000) speed_abs = 4000;
            // For wheel mode, bit 10 or bit 15 is direction depending on STS/SCS. Usually Bit 15.
            if (speedPct < 0) speed_abs |= (1<<15); 
            
            uint8_t packet[9];
            packet[0] = 0xFF;
            packet[1] = 0xFF;
            packet[2] = id;
            packet[3] = 5; // Length
            packet[4] = 0x03; // Write
            packet[5] = 0x2E; // Address 46 (Goal Speed)
            packet[6] = speed_abs & 0xFF;
            packet[7] = (speed_abs >> 8) & 0xFF;
            
            uint8_t checksum = 0;
            for(int i=2; i<8; i++) checksum += packet[i];
            packet[8] = ~checksum;
            
            Serial2.write(packet, 9);
        };
        
        writeStsSpeed(buddyConfig.ttlServoLeftId, speedPctM1);
        writeStsSpeed(buddyConfig.ttlServoRightId, speedPctM2);
    }
}

// ═══════════════════════════════════════
// 8-Servo Hat Control
// ═══════════════════════════════════════
void setServoAngle(uint8_t channel, uint8_t angle) {
    if (channel > 7) return;
    if (buddyConfig.servoInvert[channel]) {
        angle = 180 - angle;
    }
    
    Wire.beginTransmission(SERVO_HAT_ADDR);
    Wire.write(0x50 + channel); // Servo Angle 8-bit Register
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
