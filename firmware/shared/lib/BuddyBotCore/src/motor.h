#pragma once
#include <Arduino.h>
void initMotors();
void setMotorSpeeds(int speedPctM1, int speedPctM2);
void setServoAngle(uint8_t channel, uint8_t angle);

extern const uint8_t SERVO_HAT_ADDR;
