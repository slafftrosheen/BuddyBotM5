# BuddyBotM5

Pet-alike bot built using Lego Technic parts and M5Stack electronics.

## System Architecture

BuddyBot utilizes a distributed 3-tier architecture connected over WiFi:
1. **The Body (M5Stack CoreS3 SE)**: Handles motor control, servo control, web serving (Tactical UI), telemetry (BME680, IMU), and rendering the Persona Engine.
2. **The Eye/Ear/Mouth (M5Stack ATOM S3R CAM + EchoBase)**: Streams live MJPEG video from a GC0308 sensor over the local network and handles raw audio recording and playback via I2S.
3. **The Brain (Raspberry Pi Zero 2W)**: Runs a local Python server. Hosts the intelligence logic, routing audio from the ESP32 to the Gemini API (`gemini-1.5-flash`), generating responses using local Text-to-Speech (gTTS/Piper), and streaming PCM audio back to the robot.

### Network Topology (Portability)
To make BuddyBot completely portable away from home, the entire robot (CoreS3, ATOM CAM, and Pi Zero 2W) is programmed to connect to your phone's mobile hotspot (`STARLINK.TAK` or `TAK`). 
Because your phone assigns a random IP address to the components every time, the entire system uses **mDNS** to dynamically communicate. The UI works out of the box using `buddy.local`, `buddycam.local`, and `buddybrain.local`.

## Gamified Web UI

The entire robot is controlled via a responsive, Gamified Web UI hosted directly on the CoreS3's SD card. Access it by navigating to `http://buddy.local` in any modern browser. Note: Ensure your device supports mDNS resolution (most modern OSes do automatically).

### Features
* **Live Camera Feed**: Streaming from the ATOM CAM directly within the interface (Pro and Max tiers only).
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
python deploy_web.py buddy.local
```

### Flashing Firmware
Use PlatformIO to build and flash the firmware. For OTA updates, the system uses mDNS.
```bash
pio run -t upload --upload-port buddy.local      # CoreS3
pio run -t upload --upload-port buddycam.local   # ATOM CAM
```

## Setup: Pi Zero 2W (The Brain)

To give BuddyBot its intelligence and natural voice, you need to set up the Pi Zero 2W:

### 1. Set the Hostname (Required for mDNS)
Because the Pi Zero connects to your phone's hotspot (`TAK`), its IP address will constantly change. The ATOM CAM uses mDNS to find it. 
You must change your Pi Zero's hostname to `buddybrain`:
```bash
# 1. Open the config tool
sudo raspi-config
# 2. Go to System Options -> Hostname
# 3. Change it to: buddybrain
# 4. Reboot the Pi Zero
```

### 2. Connect to the Phone Hotspot
Ensure your Pi Zero 2W is connected to your phone's hotspot (`TAK` or `STARLINK.TAK`), just like the CoreS3 and ATOM CAM.

### 3. Run the AI Server
Copy the `server/` directory from this repository to your Pi Zero 2W.
```bash
# Install ffmpeg (required for audio format conversion)
sudo apt update && sudo apt install ffmpeg

# Install python dependencies
pip install -r requirements.txt

# Run the server
python brain.py
```
*The ATOM CAM will automatically search for `http://buddybrain.local:8000/api/voice` when you press the button.*
