# 🤖 BuddyBot: The Multimodal AI Companion

BuddyBot is an incredibly complex, multi-MCU robotics project built on the M5Stack CoreS3. It features an expressive digital persona, an RPG leveling system, autonomous computer vision (CV) routines via a Raspberry Pi, and Gemini 2.5 Flash for multimodal vision and intelligence.

## 🚀 The 6 Phases of BuddyBot

This project was developed incrementally across 6 major phases:

### Phase 1: Gamepad & RPG System 🎮⚔️
- **Web FPV Dashboard**: A premium UI served via LittleFS on the CoreS3, acting as the main interface.
- **Drive Mode**: Connect a Bluetooth gamepad to steer the motors and actuate the pan/tilt camera servos.
- **RPG Progression**: BuddyBot earns XP by playing games or completing actions. Leveling up changes its mood and unlocks new reactions!

### Phase 2: The AI Brain 🧠
- **Multimodal Vision**: Utilizing **Gemini 2.5 Flash**, BuddyBot can look through the camera and describe what it sees in the world.
- **Voice Macros**: Send voice commands like "dance", "explore", or "stop" to trigger physical hardware actions.

### Phase 3: Applied Computer Vision 🎥
- **Auto-Navigation**: A Python backend (Raspberry Pi) processes the ESP32 camera stream to track and steer towards bright red objects using Proportional steering control.
- **Fall Prevention**: Uses OpenCV Canny Edge detection on the bottom 30% of the camera feed to spot drop-offs (like a table edge) and triggers an emergency stop!

### Phase 4: Sensory Intelligence 🌡️💥
- **Smoke & Fire Alarm**: Polls the built-in CoreS3 BME680 sensor. If the temperature exceeds safe limits or gas resistance plummets, BuddyBot sounds a siren and looks terrified.
- **Impact Detection**: Monitors the internal IMU (Accelerometer) for G-force spikes. Bumping BuddyBot hard causes it to say "ouch", get angry, and cancel any petting actions.

### Phase 5: Refinement & Tuning 🎛️
- **Dynamic Calibration**: All hardcoded sensor and CV thresholds are exposed in the Web UI.
- Adjust the **Impact Force** sensitivity, **Fire Temp** trigger, **CV Fall Edge Density**, and **CV Tracking Area** on the fly without recompiling firmware!

### Phase 6: Final Polish & Web OTA 🌐
- **Reboot Remotely**: Reboot the ESP32 directly from the Web UI.
- **Over-The-Air (OTA) Updates**: You no longer need a USB cable to update the firmware.

---

## 🛠️ Architecture

BuddyBot operates on a distributed architecture:
1. **M5Stack CoreS3 (ESP32-S3)**: The heart of the robot. Runs the `ESPAsyncWebServer`, handles the physical sensors (BME680, IMU), drives the AW9523 Motor/Servo drivers, and displays the RoboEyes persona.
2. **Raspberry Pi (Python Server)**: The "Visual Cortex". Runs `brain.py` to process the camera stream using OpenCV, and handles the heavy lifting of calling the Gemini Vision API.
3. **M5 Camera**: Streams MJPEG to the web UI and the Python server.

## 📡 Networking & IPs

- **SSID**: `STARLINK.TAK`
- **Password**: `Slaff181188`
- **CoreS3 Web UI**: `http://10.140.12.80/`
- **Camera IP**: `10.140.12.137`
- **RasPi Server**: `10.140.12.57:8000`

---

## ⚡ How to Flash Over-The-Air (Web OTA)

You can now flash fresh `.bin` firmware files and `littlefs.bin` filesystem images completely wirelessly!

1. Build your firmware locally (`pio run` or `pio run -t buildfs`).
2. Open your web browser and navigate to: `http://10.140.12.80/update`
3. You will see the **BuddyBot Firmware & FS Update** page.
4. Click **Choose File** and select your compiled `.bin` file:
   - For firmware, select `.pio/build/m5stack-cores3/firmware.bin`.
   - For the filesystem (UI files), select `.pio/build/m5stack-cores3/littlefs.bin`.
5. Click **Upload & Flash**. The system will automatically detect whether it is a firmware or filesystem image and flash it to the correct partition.
6. The CoreS3 will reboot automatically once finished!

---
*Created by Slaff & Antigravity IDE.*
