import sys

path_h = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/motor.h"
with open(path_h, 'r', encoding='utf-8') as f:
    h_data = f.read()

if 'SERVO_HAT_ADDR' not in h_data:
    h_data += "\nextern const uint8_t SERVO_HAT_ADDR;\n"
    with open(path_h, 'w', encoding='utf-8') as f:
        f.write(h_data)

print("Updated motor.h")
