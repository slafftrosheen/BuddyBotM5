# BuddyBotM5

Pet-alike bot built using Lego Technic parts and M5Stack electronics.

## System Architecture

BuddyBot utilizes a distributed 3-tier architecture connected over WiFi:
1. **The Body (M5Stack CoreS3 SE)**: Handles motor control, servo control, web serving (Gamified UI), telemetry (BME680, IMU), and rendering the Persona Engine.
2. **The Eye/Ear/Mouth (M5Stack ATOM S3R CAM + EchoBase)**: Streams live MJPEG video from a GC0308 sensor over the local network and handles raw audio recording and playback via I2S.
3. **The Brain (Raspberry Pi)**: Runs a local Python server. Hosts the intelligence logic, routing audio from the ESP32 to the Gemini API (`gemini-2.0-flash`), generating responses using local Text-to-Speech (gTTS/Piper), and streaming PCM audio back to the robot.

## Bill of Materials (BOM)
* **Compute**: M5Stack CoreS3 SE
* **Sensors**: M5Stack ENV.III (BME680), IMU (built into CoreS3)
* **Vision/Audio**: M5Stack ATOM S3R CAM, M5Stack EchoBase
* **Actuation**: 2x I2C Motors (RollerCAN), 8-Channel Servo Array module (for robot arm/gimbal)
* **Chassis**: Lego Technic compatible parts

## Quick Start & Setup

### 1. Prepare the SD Card (CoreS3)
1. Format a MicroSD card to FAT32.
2. Run `python generate_sounds.py` to generate the `.wav` files. Copy the resulting `sounds/` folder to the root of your SD card.
3. Create a `config.json` file in the root directory and add your WiFi credentials (see **Configure WiFi** below).
4. Insert the SD card into the CoreS3.

### 2. Manually Copy UI to SD Card (Crucial for Setup)
Since the Web UI is served from the CoreS3's SD Card, the robot cannot serve the setup page on its Hotspot unless the files are present.
1. Remove the SD Card from the CoreS3 and insert it into your computer.
2. Copy all files from the `web/` directory in this repository to the root of the SD Card.
   - Example: Your SD card should have `index.html`, `style.css`, `app.js`, etc., directly in the main folder.
3. Put the SD Card back into the CoreS3.

### 3. Flash the Firmware
Use PlatformIO to build and flash the firmware to both M5Stack devices:
```bash
# Flash the CoreS3 Body
cd firmware/core
pio run -t upload
```

**Flashing the ATOM CAM Head:**
> [!IMPORTANT]
> Since the ATOM CAM does not have its own Web UI, you must edit `firmware/cam/src/main.cpp` to set your `WIFI_SSID` and `WIFI_PASS` before flashing.
> 
> **If mDNS (`.local`) does not work on your network:** Open `firmware/cam/src/VoiceAssistant.cpp` and enter your Raspberry Pi's actual IP address into the `PI_STATIC_IP` variable (around line 14) so the robot's voice assistant can find the AI server.

```bash
cd ../cam
pio run -t upload
```

### 4. Configure WiFi
WiFi credentials and hardware settings are stored dynamically in `/config.json` on the SD card (for the CoreS3 body). 

Create a `config.json` file on the root of your SD card with the following structure:
```json
{
  "wifi_ssid1": "YOUR_WIFI_SSID",
  "wifi_pass1": "YOUR_WIFI_PASSWORD"
}
```

The ATOM CAM still uses hardcoded credentials in `firmware/cam/src/main.cpp`. You will need to edit it before flashing the camera.

### 5. Setup The Brain (Raspberry Pi)
To give BuddyBot its intelligence and natural voice, you need to set up the Raspberry Pi server. Both the robot and the Pi must be on the same WiFi network.

1. **Set the Hostname (Required for mDNS)**
   The ATOM CAM uses mDNS to find the Pi on the network automatically. Change your Pi's hostname to `buddybrain`:
   ```bash
   sudo raspi-config
   # Go to System Options -> Hostname -> Change it to: buddybrain
   # Reboot the Pi
   ```
2. **Configure the AI Server**
   Copy the `server/` directory from this repository to your Pi.
   ```bash
   # Install ffmpeg (for audio format conversion), venv, and pyaudio build dependencies
   sudo apt update && sudo apt install -y ffmpeg mpg123 python3-venv python3-dev portaudio19-dev
   
   # Navigate to the server folder
   cd server
   
   # Create and activate a Python virtual environment
   python3 -m venv venv
   source venv/bin/activate
   
   # Install python dependencies
   pip install -r requirements.txt
   ```
3. **Set your Gemini API Key**
   Edit the `server/config.env` file and add your Google Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. **Run the AI Server (Manual Start)**
   ```bash
   # Make sure the venv is active first
   source venv/bin/activate
   python brain.py
   ```
   *The ATOM CAM will automatically search for `http://buddybrain.local:8000/api/voice` when you press its button.*

5. **Start on Boot (systemd)**
   To make the Brain server run automatically in the background when the Pi boots up:
   ```bash
   # Create a new service file
   sudo nano /etc/systemd/system/buddybrain.service
   ```
   Paste the following (adjust the path `/home/pi/BuddyBotM5/server` to match where you copied the folder):
   ```ini
   [Unit]
   Description=BuddyBot Brain Server
   After=network.target

   [Service]
   Type=simple
   User=pi
   WorkingDirectory=/home/pi/BuddyBotM5/server
   ExecStart=/home/pi/BuddyBotM5/server/venv/bin/python brain.py
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```
   Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`), then enable the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable buddybrain.service
   sudo systemctl start buddybrain.service
   ```

## Gamified Web UI
The robot is controlled via a responsive, Gamified Web UI hosted directly on the CoreS3's SD card. Access it by navigating to `http://buddy.local` in any modern browser.

> [!WARNING]
> **mDNS Issues on Windows/Android**
> Windows and some Android devices do not natively support `.local` (mDNS) addresses without installing Apple Bonjour. If `http://buddy.local` or the camera feed fails to load:
> 1. Find the direct IP address of the CoreS3 and the ESP32-CAM (either check your router's DHCP connected devices list, or watch the Serial Monitor when the devices boot up).
> 2. Navigate directly to the CoreS3's IP (e.g. `http://192.168.1.55`).
> 3. Go to the **Settings** tab in the Web UI.
> 4. Enter the actual IP of the Camera (e.g. `192.168.1.56`) in the "Camera IP" field.
> 5. Make sure to toggle **Enable Camera**, **Enable Servos**, and **Enable AI Server (Pi)** as needed. Enter the IP of your Raspberry Pi into the "AI Server (Pi) IP" field.
> 6. Click **Save Config**.

### Features
* **Live Camera Feed**: Streaming from the ATOM CAM directly within the interface. (Configure the Camera IP in the Settings tab if the stream doesn't load automatically on Windows/Android).
* **Drive System**: A responsive on-screen joystick that translates 360-degree input into Differential Drive logic (tank steering). If your motors drive backwards when pushing forward, you can invert them instantly in the Settings tab!
* **Telemetry Array**: Live readouts of temperature, humidity, atmospheric pressure, gas resistance (BME680), and IMU pitch/roll.
* **Persona Engine**: Dynamic emotion states rendered on the CoreS3 display (Neutral, Happy, Angry, Sleepy, Excited, Sad, Curious, Alert, Love, Shocked, Dizzy, Cool). Customize eye color, size, and blink rate live.
* **Servo Array Control**: 8 individual sliders for continuous rotation servos with inversion toggles.
* **Entertainment Modes**: Sound effects (siren, R2D2, etc.), Dance Mode (choreographed movement), and Auto-Wander.

## Development
Whenever you make changes to the HTML/CSS/JS files in the `web/` directory, you can push them over-the-air to the CoreS3's SD card using the provided script:
```bash
python deploy_web.py buddy.local
```
