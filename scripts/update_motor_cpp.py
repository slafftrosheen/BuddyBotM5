import sys

path_cpp = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/motor.cpp"
with open(path_cpp, 'r', encoding='utf-8') as f:
    cpp_data = f.read()

cpp_data = cpp_data.replace('const uint8_t SERVO_HAT_ADDR = 0x25;', 'extern const uint8_t SERVO_HAT_ADDR = 0x25;')

with open(path_cpp, 'w', encoding='utf-8') as f:
    f.write(cpp_data)

print("Updated motor.cpp")
