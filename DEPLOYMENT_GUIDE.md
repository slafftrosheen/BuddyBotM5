# BuddyBotM5 Deployment Guide

This guide explains how to configure your BuddyBotM5 system with your own WiFi credentials for both the CoreS3 and ATOM CAM components.

## Prerequisites

Before deploying, ensure you have:
- The complete BuddyBotM5 repository
- PlatformIO installed for building and flashing firmware
- Python 3.x installed for generating media assets
- Access to both M5Stack devices (CoreS3 and ATOM CAM)

## WiFi Configuration Steps

### Step 1: Configure CoreS3 Firmware WiFi Credentials

The CoreS3 firmware has hardcoded WiFi credentials in `firmware/core/src/main.cpp`:

1. Open the file `firmware/core/src/main.cpp`
2. Locate the `initWiFi()` function (around line 140)
3. Modify these lines:
   ```cpp
   const char* ssid = "STARLINK.TAK";      // Change this to your WiFi SSID
   const char* password = "Slaff181188";  // Change this to your WiFi password
   ```
4. Replace with your own network credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";      // Your WiFi network name
   const char* password = "YOUR_WIFI_PASSWORD";  // Your WiFi password
   ```

### Step 2: Configure ATOM CAM Firmware WiFi Credentials

The ATOM CAM firmware also has hardcoded WiFi credentials in `firmware/cam/src/main.cpp`:

1. Open the file `firmware/cam/src/main.cpp`
2. Locate the WiFi configuration section (around lines 10-11)
3. Modify these lines:
   ```cpp
   #define WIFI_SSID "STARLINK.TAK"      // Change this to your WiFi SSID
   #define WIFI_PASS "Slaff181188"  // Change this to your WiFi password
   ```
4. Replace with your own network credentials:
   ```cpp
   #define WIFI_SSID "YOUR_WIFI_SSID";      // Your WiFi network name
   #define WIFI_PASS "YOUR_WIFI_PASSWORD";  // Your WiFi password
   ```

### Step 3: Flash Updated Firmware

After modifying the WiFi credentials in both firmware components:

1. Build and flash the CoreS3 firmware:
   ```bash
   cd firmware/core
   pio run -t upload
   ```

2. Build and flash the ATOM CAM firmware:
   ```bash
   cd ../cam
   pio run -t upload
   ```

## Additional Setup Requirements

### Raspberry Pi Brain Configuration

1. Ensure both devices are on the same WiFi network
2. Set your Raspberry Pi hostname to `buddybrain` for mDNS discovery
3. Configure the AI server with your Gemini API key in `server/config.env`
4. Start the brain server manually or set it up as a systemd service

### Web UI Setup

1. Ensure all web files are copied to the SD card (as described in README.md)
2. The CoreS3 will serve the web interface from its SD card
3. Access via `http://buddy.local` in any modern browser

## Troubleshooting

If your BuddyBot fails to connect to WiFi:
1. Verify the SSID and password are correctly entered
2. Ensure both devices are on the same network
3. Check that the Raspberry Pi is reachable from the M5Stack devices
4. Confirm the SD card has all required web files for the UI

## Notes

- The configuration system supports up to 3 WiFi networks as backup options (configurable in `config.h`)
- After flashing, both devices will automatically connect to your specified network
- The Brain server must be running on the same network as the M5Stack devices