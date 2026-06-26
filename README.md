# BuddyBotM5

Pet-alike bot built using Lego Technic parts and M5Stack electronics.

## System Architecture

BuddyBot consists of two main processing units connected over WiFi:
* **Brain (M5Stack CoreS3 SE)**: Handles motor control, servo control, persona rendering, web serving, and telemetry.
* **Eye (M5Stack ATOM S3R CAM)**: Streams live MJPEG video from a GC0308 sensor over the local network.

Both units communicate over a unified WiFi network (SSID: `STARLINK.TAK` or `TAK`).

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
