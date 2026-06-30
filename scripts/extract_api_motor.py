import os

path = "c:/Users/Slaff/BuddyBotM5/firmware/core/src/main.cpp"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

motor_lines = []
api_lines = []
in_motor = False
in_api = False

for line in lines:
    if 'RollerCAN I2C Protocol' in line:
        in_motor = True
    if 'void initServer()' in line:
        in_motor = False
        in_api = True
    if 'void setup()' in line or 'void loop()' in line:
        in_api = False
        
    if in_motor:
        motor_lines.append(line)
    if in_api:
        api_lines.append(line)

motor_code = "".join(motor_lines)
api_code = "".join(api_lines)

with open("c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/motor.cpp", 'w', encoding='utf-8') as f:
    f.write('#include <Arduino.h>\n#include <Wire.h>\n#include <ESP32Servo.h>\n#include "motor.h"\n#include "config.h"\n\n')
    f.write("extern Servo gpioServoL;\nextern Servo gpioServoR;\n")
    f.write(motor_code)

with open("c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/api.cpp", 'w', encoding='utf-8') as f:
    f.write('#include <Arduino.h>\n#include <ArduinoJson.h>\n#include <LittleFS.h>\n#include <ESPAsyncWebServer.h>\n#include <M5Unified.h>\n#include <Update.h>\n')
    f.write('#include "api.h"\n#include "config.h"\n#include "motor.h"\n#include "persona.h"\n#include "sounds.h"\n\n')
    f.write("extern float target_speed;\nextern float target_turn;\nextern float target_m1;\nextern float target_m2;\nextern float yaw_target;\nextern bool heading_locked;\nextern float imu_yaw;\nextern unsigned long lastActivityTime;\nextern AsyncWebServer server;\n\n")
    f.write(api_code)

with open("c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/api.h", 'w', encoding='utf-8') as f:
    f.write('#pragma once\nvoid initServer();\n')

with open("c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/motor.h", 'w', encoding='utf-8') as f:
    f.write('#pragma once\n#include <Arduino.h>\n')
    f.write('void initMotors();\nvoid setMotorSpeeds(int speedPctM1, int speedPctM2);\nvoid setServoAngle(uint8_t channel, uint8_t angle);\n')

print(f"Extracted Motor ({len(motor_code)}) and Server ({len(api_code)})")
