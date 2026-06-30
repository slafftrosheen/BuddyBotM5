import os

path = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/persona.cpp"
with open(path, 'r', encoding='utf-8') as f:
    data = f.read()

if 'extern float imu_pitch;' not in data:
    data = data.replace('#include "config.h"', '#include "config.h"\n\nextern float imu_pitch;\nextern float imu_roll;\n')
    
    imu_logic = """
    // Handle IMU-based personas if we are not actively doing something else
    if (currentEmotion == EMO_NORMAL || currentEmotion == EMO_SAD || currentEmotion == EMO_WONDER) {
        if (imu_pitch < -60.0) {
            setEmotion(EMO_SAD); // Face planted / Face down
        } else if (imu_pitch > 60.0) {
            setEmotion(EMO_WONDER); // Looking up at the sky
        } else if (abs(imu_roll) > 130.0) {
            setEmotion(EMO_DIZZY); // Upside down
        } else {
            setEmotion(EMO_NORMAL);
        }
    }
    """
    data = data.replace('// Handle talking animation', imu_logic + '\n    // Handle talking animation')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)

print("Injected IMU personas")
