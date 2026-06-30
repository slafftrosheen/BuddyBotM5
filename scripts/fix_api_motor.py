import os

motor_path = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/motor.cpp"
with open(motor_path, 'r', encoding='utf-8') as f:
    motor_lines = f.readlines()

new_motor_lines = []
skip = False
for line in motor_lines:
    if 'void initWiFi()' in line:
        skip = True
    if skip and 'void initServer()' in line:
        skip = False
    if not skip:
        new_motor_lines.append(line)

with open(motor_path, 'w', encoding='utf-8') as f:
    f.writelines(new_motor_lines)

api_path = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/api.cpp"
with open(api_path, 'r', encoding='utf-8') as f:
    api_data = f.read()

# Add missing externs
if 'extern Adafruit_BME680 bme;' not in api_data:
    api_data = api_data.replace('extern AsyncWebServer server;', 'extern AsyncWebServer server;\n#include "Adafruit_BME680.h"\nextern Adafruit_BME680 bme;\nextern float imu_pitch;\nextern float imu_roll;\n')

# Add hexToColor565
hex_func = """
uint16_t hexToColor565(String hex) {
    long num = strtol(&hex[1], NULL, 16);
    uint8_t r = num >> 16;
    uint8_t g = (num >> 8) & 0xFF;
    uint8_t b = num & 0xFF;
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}
"""
if 'hexToColor565' not in api_data[:1000]:
    api_data = api_data.replace('void initServer()', hex_func + '\nvoid initServer()')

# Replace CoreS3 with M5
api_data = api_data.replace('CoreS3.', 'M5.')

with open(api_path, 'w', encoding='utf-8') as f:
    f.write(api_data)

print("Fixed api.cpp and motor.cpp")
