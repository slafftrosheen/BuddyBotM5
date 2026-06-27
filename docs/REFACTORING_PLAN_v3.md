# BuddyBot v3.0 — Deep Refactoring Plan

## Current State Analysis

After thoroughly reviewing every file in the repository, here is what we have today:

| Component | File | Lines | Issues Identified |
|---|---|---|---|
| Core Firmware | `firmware/core/src/main.cpp` | 717 | Monolithic. No motor inversion. Sounds are `tone()` beeps. Config is hardcoded. Persona has no mouth and no animation. |
| Cam Firmware | `firmware/cam/src/main.cpp` | 193 | Clean. Voice assistant integrated. |
| Voice Assistant | `firmware/cam/src/VoiceAssistant.cpp` | 141 | Functional. mDNS discovery works. |
| Pi Brain | `server/brain.py` | 108 | Minimal. Only handles voice pipeline. |
| Web UI HTML | `web/index.html` | 386 | Everything on one page. Military/tactical theme not kid-friendly. Still has OpenAI text chatbot UI. |
| Web UI Logic | `web/app.js` | 782 | Monolithic. Motor commands have no inversion. |
| Chatbot | `web/chatbot.js` | 259 | **Entire file should be removed** — text chatbot with OpenAI key input. |
| Gamification | `web/gamification.js` | 734 | Heavy. CV features reference cross-origin camera. DJ pad maps to beep sounds. |
| Styling | `web/style.css` | 713 | Dark military aesthetic. Not kid-friendly. |

---

## User Requirements Mapped to Changes

| # | Requirement | Impact |
|---|---|---|
| 1 | RollerCAN motor inversion toggle | Firmware + Web UI Config |
| 2 | Tabbed UI | Complete HTML/CSS/JS restructure |
| 3 | Kid-friendly theme (age 7-10) | CSS rewrite, new color palette, friendly fonts |
| 4 | Animated persona with mouth | Firmware persona engine rewrite (sprite-based from SD card) |
| 5 | Audio pipeline only, no text chatbot | Delete `chatbot.js`, remove chatbot overlay from HTML |
| 6 | Real sound files on SD card | Firmware WAV playback, generate sound assets |
| 7 | Leverage Pi Zero capabilities | Expand `brain.py` to handle CV, sound generation, AI routing |
| 8 | Proper config/env file | New `/api/config` endpoints, `config.json` on SD card |

---

## Proposed Changes

### Component 1: Firmware Core (`firmware/core/src/main.cpp`)

This 717-line monolith needs to be split into focused modules for maintainability.

---

#### [NEW] `firmware/core/src/config.h` + `config.cpp`
Centralized configuration system that persists to SD card as `/config.json`.

**Data Structure:**
```cpp
struct BuddyConfig {
    // Network
    char wifi_ssid[3][32];    // Up to 3 SSIDs
    char wifi_pass[3][64];
    char cam_ip[20];
    char pi_hostname[32];     // "buddybrain"
    
    // Motors  
    int motorTrimL;           // -20 to +20
    int motorTrimR;           // -20 to +20
    bool motorInvertL;        // NEW: invert left motor direction
    bool motorInvertR;        // NEW: invert right motor direction
    int motorMaxRPM;          // default 3000
    
    // Servos
    bool servoInvert[8];      // per-channel inversion
    
    // Persona
    char eyeColorHex[8];      // "#00f3ff"
    int eyeSize;              // 10-50
    int blinkRate;            // ms
    
    // API Keys
    char geminiApiKey[64];    // Gemini key, editable from UI
    
    // Build Tier
    // 0=Lite, 1=Pro, 2=Max (auto-detected or set manually)
    int buildTier;
};
```

**Functions:**
- `void loadConfig()` — Read `/config.json` from SD, populate struct, apply defaults if missing.
- `void saveConfig()` — Serialize struct to JSON, write to `/config.json` on SD.
- `String getConfigJson()` — Return current config as JSON string (for API response).
- `bool applyConfig(const char* json, size_t len)` — Parse incoming JSON, update struct, save.

---

#### [MODIFY] `firmware/core/src/main.cpp` — Motor Control
Currently `setMotorSpeeds()` takes a percentage and maps directly to RPM. No inversion.

**Change:** Apply `config.motorInvertL` / `config.motorInvertR` before writing to I2C.

```cpp
void setMotorSpeeds(int speedPctM1, int speedPctM2) {
    if (config.motorInvertL) speedPctM1 = -speedPctM1;
    if (config.motorInvertR) speedPctM2 = -speedPctM2;
    int32_t rpm100_m1 = (int32_t)speedPctM1 * config.motorMaxRPM;
    int32_t rpm100_m2 = (int32_t)speedPctM2 * config.motorMaxRPM;
    rollerSetSpeed(ROLLER_M1_ADDR, rpm100_m1);
    rollerSetSpeed(ROLLER_M2_ADDR, rpm100_m2);
}
```

---

#### [NEW] `firmware/core/src/sounds.h` + `sounds.cpp`
Replace all `M5.Speaker.tone()` calls with WAV file playback from SD card.

**Sound file location:** `/sounds/*.wav` on SD card (16-bit, 16kHz mono, small files ~5-50KB each).

**Sound manifest:**
| Filename | Description | Used By |
|---|---|---|
| `beep.wav` | Short chirp | General UI feedback |
| `siren.wav` | Alert klaxon | Guard mode, Simon fail |
| `laugh.wav` | Child-friendly giggle | Entertainment |
| `horn.wav` | Goofy horn honk | Fun button |
| `r2d2.wav` | Droid chirps | Character flavor |
| `melody.wav` | Happy jingle | Level up celebration |
| `purr.wav` | Content hum | Petting reaction |
| `sneeze.wav` | Cartoon sneeze | Idle quirk |
| `whistle.wav` | Cheerful whistle | Idle quirk |
| `snore.wav` | Gentle snore | Sleep mode |
| `eat.wav` | Chomping/crunch | Treat action |
| `kick.wav` | Bass drum hit | DJ Pad |
| `hihat.wav` | Hi-hat cymbal | DJ Pad |
| `snare.wav` | Snare hit | DJ Pad |
| `scratch.wav` | Record scratch | DJ Pad |
| `levelup.wav` | Fanfare | XP level up |
| `startup.wav` | Boot chime | Boot sequence |

**Functions:**
- `void initSoundPlayer()` — Verify `/sounds/` dir exists on SD.
- `void playWavFile(const char* filename)` — Read WAV from SD, play via `M5.Speaker.playRaw()`. Non-blocking using a FreeRTOS task.
- `void playTone(int freq, int ms)` — Fallback if WAV file is missing.
- `void playSound(const char* name)` — Wrapper that tries WAV first, falls back to tone.

---

#### [REWRITE] Persona Engine — Sprite-Based with Mouth and Animation

**Architecture:**
- Each emotion has a folder on SD: `/faces/happy/`, `/faces/sad/`, etc.
- Each folder contains BMP sprites for animation frames.
- An animation state machine composites sprites onto the display.
- Mouth animates during audio playback.

**Sprite layout on screen (320×240 CoreS3 display):**
```
┌──────────────────────────┐
│                          │
│    ◉  ◉      ← Eyes     │  Y: 60-140
│                          │
│      ◡       ← Mouth    │  Y: 160-200
│                          │
└──────────────────────────┘
```

**State Machine:**
```
IDLE → random blink every 2-5s
     → random idle animation (look left, look right, yawn)
SPEAKING → mouth toggles open/closed at ~8Hz
EMOTING → play emotion transition
```

**Functions:**
- `void initPersona()` — Load default sprites from SD into PSRAM cache.
- `void setEmotion(int emotion)` — Change emotion, trigger transition animation.
- `void updatePersona()` — Called every loop iteration. Handles blink timing, mouth animation, idle behaviors.
- `void setMouthState(bool open)` — Toggle mouth for speech sync.

**Emotion set (12 total):**
| ID | Name | Eyes | Mouth | Special |
|---|---|---|---|---|
| 0 | Neutral | Round, open | Flat line | — |
| 1 | Happy | Half-moon (curved up) | Wide smile | Sparkle particles |
| 2 | Angry | Slanted down-inward | Frown/teeth | Red tint overlay |
| 3 | Sleepy | Heavy-lidded | Open yawn | Floating Z's |
| 4 | Excited | Wide star-shaped | Big O | Bouncing animation |
| 5 | Sad | Droopy | Wobble frown | Tear drop |
| 6 | Curious | One big, one small | Small O | Question mark |
| 7 | Alert | Diamond | Dash | Flashing border |
| 8 | Love | Heart-shaped | Kiss/smile | Floating hearts |
| 9 | Shock | Lightning bolt | Wide O | Screen shake |
| 10 | Dizzy | Spiral | Squiggly | Spinning |
| 11 | Cool | Rectangle (sunglasses) | Smirk | — |

> All face sprites will be generated using AI image generation. Each will be a cute, cartoon-style robot face on a pure black background, sized at 320×240 pixels.

---

### Component 2: Web UI — Complete Restructure

#### Design Direction: Kid-Friendly (Age 7-10)

The current UI is a dark military "Tactical HUD" with monospace fonts, scanline overlays, and jargon like "OPTICAL SENSOR" and "TELEMETRY". A 7-year-old would find this intimidating. The new design should feel like a **video game controller for your robot friend**.

**Design pillars:**
- Bright, vibrant colors on dark background (gaming UI feel)
- Rounded corners, playful fonts (Fredoka, Nunito, or Baloo 2)
- Large touch-friendly buttons with emoji and clear labels
- Tab-based navigation instead of endless scroll
- Animated transitions between tabs

**Tab Structure:**

| Tab | Icon | Contents | Available In |
|---|---|---|---|
| 🏠 Home | Home icon | Camera feed, connection status, BuddyBot avatar, voice button | All tiers |
| 🕹️ Drive | Joystick icon | Joystick, throttle gauge, speed readout | Lite+ |
| 🎮 Play | Game controller | Simon Says, DJ Pad, Parrot, Color Game, Treat button | Lite+ |
| 🤖 Buddy | Robot face | Emotion picker, vitals (XP/HP/Hunger/Energy), level badge | Lite+ |
| 🔧 Hardware | Wrench | Servo array, arm macros, motor trim | Pro+ |
| 📡 AI Lab | Brain icon | Voice assistant status, face tracking, auto-nav, YOLO, sentry patrol | Max only |
| ⚙️ Settings | Gear | WiFi config, API keys, motor inversion, cam flip, theme, build tier, reboot | All tiers |

**Tab implementation:**
- Bottom navigation bar (mobile-first, like an app)
- Tabs are `<div>` sections, shown/hidden via JS
- Active tab highlighted with accent color
- Tabs auto-hide based on build tier from `/api/config`

---

#### [DELETE] `web/chatbot.js`
Entire file deleted. Text-based chatbot replaced by audio pipeline through Pi Zero.

#### [REWRITE] `web/style.css`
Complete theme overhaul from military tactical to kid-friendly gaming.

#### [REWRITE] `web/index.html` + JS files split:

| New File | Responsibility |
|---|---|
| `app.js` | Tab controller, telemetry polling, connection status, config loading |
| `drive.js` | Joystick, motor commands, throttle gauge |
| `play.js` | Simon Says, DJ Pad, Parrot, Color Game, treat |
| `buddy.js` | Emotion picker, XP/vitals system, level-up |
| `hardware.js` | Servo array, arm macros |
| `ai.js` | Voice assistant trigger, face tracking, auto-nav, sentry, YOLO |
| `settings.js` | Config form, save/load, reboot |

---

### Component 3: Pi Zero Brain (`server/brain.py`)

#### [REWRITE] `server/brain.py`

**New endpoints:**

| Endpoint | Method | Description |
|---|---|---|
| `/api/voice` | POST | Receive WAV, send to Gemini, return PCM audio |
| `/api/tts` | POST | Text-to-speech. Accepts `{"text": "hello"}`, returns PCM |
| `/api/chat` | POST | Text chat with Gemini (for internal use by CV features) |
| `/api/detect` | POST | Receive JPEG frame, run object detection, return JSON results |
| `/api/health` | GET | Return Pi Zero status (CPU temp, memory, uptime) |

#### [NEW] `server/config.env`
```env
GEMINI_API_KEY=AIzaSyC2rJzys_Ab-7eXvGrqhUkoVDbRrEF9CYY
TTS_ENGINE=gtts
TTS_VOICE=en
PI_PORT=8000
BUDDYBOT_PERSONALITY=You are BuddyBot, a fun and friendly robot companion for kids.
```

---

### Component 4: Three-Tier Build System

#### [MODIFY] `firmware/core/platformio.ini`

```ini
[env:lite]
board = m5stack-cores3
build_flags = -DBUDDY_TIER_LITE

[env:pro]  
board = m5stack-cores3
build_flags = -DBUDDY_TIER_PRO

[env:max]
board = m5stack-cores3
build_flags = -DBUDDY_TIER_MAX
```

---

### Component 5: SD Card File Structure

```
/
├── config.json
├── index.html
├── style.css
├── app.js, drive.js, play.js, buddy.js, hardware.js, ai.js, settings.js
├── sounds/
│   ├── beep.wav, siren.wav, laugh.wav, horn.wav, r2d2.wav
│   ├── melody.wav, purr.wav, sneeze.wav, whistle.wav, snore.wav
│   ├── eat.wav, kick.wav, hihat.wav, snare.wav, scratch.wav
│   ├── levelup.wav, startup.wav
└── faces/
    ├── neutral/, happy/, angry/, sleepy/, excited/, sad/
    ├── curious/, alert/, love/, shock/, dizzy/, cool/
```

---

## Execution Order

| Phase | Work | Est. Complexity |
|---|---|---|
| **Phase A** | Config system (`config.h/cpp`, API endpoints, `config.json`) | Medium |
| **Phase B** | Motor inversion + tier flags in `platformio.ini` | Small |
| **Phase C** | Sound system (`sounds.h/cpp`, WAV playback, generate WAV assets) | Medium |
| **Phase D** | Persona rewrite (sprite-based, mouth, animation, generate face sprites) | Large |
| **Phase E** | Web UI restructure (tabbed layout, kid-friendly CSS, split JS, delete chatbot) | Large |
| **Phase F** | Pi Zero brain expansion (detection endpoint, config.env, CORS, health) | Medium |
| **Phase G** | Integration testing, deploy scripts update, reflash all devices | Medium |
| **Phase H** | Push to git, update README | Small |
