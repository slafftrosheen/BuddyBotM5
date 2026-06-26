# BuddyBotM5

Pet-alike bot built using Lego Technic parts and M5Stack electronics.

## System Architecture

BuddyBot utilizes a distributed 3-tier architecture connected over WiFi:
1. **The Body (M5Stack CoreS3 SE)**: Handles motor control, servo control, web serving (Tactical UI), telemetry (BME680, IMU), and rendering the Persona Engine.
2. **The Eye/Ear/Mouth (M5Stack ATOM S3R CAM + EchoBase)**: Streams live MJPEG video from a GC0308 sensor over the local network and handles raw audio recording and playback via I2S.
3. **The Brain (Raspberry Pi Zero 2W)**: Runs a local Python server. Hosts the intelligence logic, routing audio from the ESP32 to the Gemini API (`gemini-1.5-flash`), generating responses using local Text-to-Speech (gTTS/Piper), and streaming PCM audio back to the robot.

### Network Topology (Portability)
To make BuddyBot completely portable away from home, the **Pi Zero 2W** broadcasts a WiFi Hotspot (SSID: `BuddyBot-Brain`, Password: `BuddyBot123`). Both the CoreS3 and the ATOM CAM are programmed to automatically connect to this hotspot if available, or fall back to your home router (`STARLINK.TAK` / `TAK`).

## Tactical Web UI

The entire robot is controlled via a responsive, military-style Tactical HUD hosted directly on the CoreS3's SD card. Access it by navigating to the CoreS3's IP address (default `http://10.140.12.80`) in any modern browser.

### Features
* **Live Camera Feed**: Streaming from the ATOM CAM with an animated crosshair and tactical overlays.
* **Drive System**: A responsive on-screen joystick that translates 360-degree input into differential drive logic.
* **Steering Servo Linkage**: The X-axis of the joystick automatically maps to Servo Channel 0 to steer the wheels while driving.
* **Telemetry Array**: Live readouts of temperature, humidity, atmospheric pressure, gas resistance (BME680), and IMU pitch/roll.
* **Persona Engine**: 8 dynamic emotion states rendered on the CoreS3 display (Neutral, Happy, Angry, Sleepy, Excited, Sad, Curious, Alert). You can customize eye color, size, and blink rate live.
* **Servo Array Control**: 8 individual sliders for continuous rotation servos with inversion toggles to reverse rotation direction.
* **Entertainment Modes**: Sound effects (siren, R2D2, etc.), Dance Mode (choreographed movement), and Auto-Wander.
* **System Settings**: Save motor trim offsets, invert camera feeds, and reboot the system remotely.

## Hardware Control Protocols

* **Drive Motors (RollerCAN on I2C 0x64/0x65)**:
  Controlled via I2C Speed Mode (Register `0x00` set to `0x01` output / `0x01` mode). Speed values (-3000 to +3000 RPM) are written as 32-bit Little-Endian integers to register `0x40`.
* **8-Channel Servo Array (I2C 0x38)**:
  Channels 0-7 are addressed directly. For the continuous rotation servos used on BuddyBot, a pulse of `90` is full stop, `0` is full speed one way, and `180` is full speed the opposite way.
* **Environment Sensor (BME680 on I2C 0x76)**:
  Provides environmental data for the HUD.

## Development & Deployment

Both the CoreS3 and the ATOM CAM support Over-The-Air (OTA) updates.

### Deploying the Web UI
Whenever you make changes to the HTML/CSS/JS files in the `web/` directory, push them to the CoreS3's SD card using the provided Python script:
```bash
python deploy_web.py <CORES3_IP>
```

### Flashing Firmware
Use PlatformIO to build and flash the firmware. For OTA updates, add `--upload-port <IP_ADDRESS>` to your build command.
```bash
pio run -t upload --upload-port 10.140.12.80   # CoreS3
pio run -t upload --upload-port 10.140.12.137  # ATOM CAM
```

## Setup: Pi Zero 2W (The Brain)

To give BuddyBot its intelligence and natural voice, you need to set up the Pi Zero 2W:

### 1. Enable WiFi Hotspot
On your Pi Zero 2W (running Raspberry Pi OS), use `nmcli` to create the hotspot:
```bash
sudo nmcli dev wifi hotspot ifname wlan0 ssid BuddyBot-Brain password BuddyBot123
```
*Note: By default, NetworkManager hotspots assign the IP `10.42.0.1` to the Pi.*

### 2. Run the AI Server
Copy the `server/` directory from this repository to your Pi Zero 2W.
```bash
# Install ffmpeg (required for audio format conversion)
sudo apt update && sudo apt install ffmpeg

# Install python dependencies
pip install -r requirements.txt

# Run the server
python brain.py
```
*Make sure `PI_SERVER_URL` in `firmware/cam/src/VoiceAssistant.cpp` matches your Pi's hotspot IP address (`http://10.42.0.1:8000/api/voice`) before flashing the ATOM CAM.*
