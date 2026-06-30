import sys

path_h = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/config.h"
with open(path_h, 'r', encoding='utf-8') as f:
    h_data = f.read()
if 'int screenRotation;' not in h_data:
    h_data = h_data.replace('int driveCenterOffsetR;', 'int driveCenterOffsetR;\n    int screenRotation;')
    with open(path_h, 'w', encoding='utf-8') as f:
        f.write(h_data)

path_cpp = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/config.cpp"
with open(path_cpp, 'r', encoding='utf-8') as f:
    cpp_data = f.read()

if 'buddyConfig.screenRotation = doc["screenRotation"] | 1;' not in cpp_data:
    cpp_data = cpp_data.replace('buddyConfig.driveCenterOffsetR = doc["driveCenterOffsetR"] | 0;', 'buddyConfig.driveCenterOffsetR = doc["driveCenterOffsetR"] | 0;\n    buddyConfig.screenRotation = doc["screenRotation"] | 1;')
    cpp_data = cpp_data.replace('doc["driveCenterOffsetR"] = buddyConfig.driveCenterOffsetR;', 'doc["driveCenterOffsetR"] = buddyConfig.driveCenterOffsetR;\n    doc["screenRotation"] = buddyConfig.screenRotation;')
    with open(path_cpp, 'w', encoding='utf-8') as f:
        f.write(cpp_data)

print("Updated config for screenRotation")
