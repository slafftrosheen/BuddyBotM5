import os
import re

targets = ["core", "sticks3", "cardputer", "cardputer_adv"]
base_dir = r"c:\Users\Slaff\BuddyBotM5\firmware"

patch_code = """
    // Only retrieve IMU data if an IMU is present
    if (M5.Imu.isEnabled()) {
        auto imu_data = M5.Imu.getImuData();
        ax = imu_data.accel.x;
        ay = imu_data.accel.y;
        az = imu_data.accel.z;
        
        // Filter out StickC S3 zero-read noise
        if (ax == 0.0 && ay == 0.0 && az == 0.0) {
            ax = 0; ay = 0; az = 1.0; // Fake 1G down to prevent impact triggers
        } else {
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
    }
"""

old_petting = """    float accMag = sqrt(ax * ax + ay * ay + az * az);
    static float lastAccMag = 1.0;"""

new_petting = """    float accMag = sqrt(ax * ax + ay * ay + az * az);
    if (accMag == 0.0) accMag = 1.0; // Prevent false triggers
    static float lastAccMag = 1.0;"""

for target in targets:
    file_path = os.path.join(base_dir, target, "src", "main.cpp")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Replace IMU block
        pattern_imu = re.compile(r'// Only retrieve IMU data if an IMU is present.*?last_imu_time = now;', re.DOTALL)
        content = pattern_imu.sub(patch_code.strip() + "\n    last_imu_time = now;", content)

        # Replace petting block
        content = content.replace(old_petting, new_petting)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Patched {file_path}")
    else:
        print(f"Not found: {file_path}")
