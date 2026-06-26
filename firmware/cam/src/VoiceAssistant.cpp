#include "VoiceAssistant.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <M5EchoBase.h>

// ==========================================
// CONFIGURATION
// ==========================================
// If connected to Pi Zero Hotspot, IP is usually 192.168.4.1 or 10.42.0.1
const char* PI_SERVER_URL = "http://10.42.0.1:8000/api/voice"; 
const int BUTTON_PIN = 41;

#if (ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0))
M5EchoBase echobase;
#else
M5EchoBase echobase(I2S_NUM_0);
#endif

// PCM Audio Configuration (24kHz 16-bit mono)
const uint32_t SAMPLE_RATE = 24000;
const uint32_t MAX_RECORD_SEC = 5;
const uint32_t AUDIO_DATA_SIZE = MAX_RECORD_SEC * SAMPLE_RATE * 2; 

uint8_t* audioBuffer = nullptr;
uint8_t* playbackBuffer = nullptr;

// Helper to write WAV header
void writeWavHeader(uint8_t* buffer, uint32_t dataSize, uint32_t sampleRate) {
    uint32_t header[11];
    header[0] = 0x46464952; // "RIFF"
    header[1] = dataSize + 36;
    header[2] = 0x45564157; // "WAVE"
    header[3] = 0x20746d66; // "fmt "
    header[4] = 16;
    header[5] = 0x00010001; // PCM, 1 channel
    header[6] = sampleRate;
    header[7] = sampleRate * 2; // byte rate
    header[8] = 0x00100002; // block align, 16-bit
    header[9] = 0x61746164; // "data"
    header[10] = dataSize;
    memcpy(buffer, header, 44);
}

void initVoiceAssistant() {
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    
    // Initialize EchoBase (Sample Rate, SDA, SCL, DIN, WS, DOUT, BCK, Wire)
    Wire.begin(38, 39, 100000U);
    if (!echobase.init(SAMPLE_RATE, 38, 39, 7, 6, 5, 8, Wire)) {
        Serial.println("Failed to initialize EchoBase!");
    } else {
        echobase.setSpeakerVolume(80);
        echobase.setMicGain(ES8311_MIC_GAIN_12DB); // Boost mic gain
        Serial.println("EchoBase Initialized.");
    }

    // Allocate 5 seconds for recording
    audioBuffer = (uint8_t*)ps_malloc(AUDIO_DATA_SIZE + 44);
    // Allocate 30 seconds for playback (30 * 48000 = 1.4MB)
    playbackBuffer = (uint8_t*)ps_malloc(30 * SAMPLE_RATE * 2);

    if (!audioBuffer || !playbackBuffer) {
        Serial.println("Failed to allocate audio buffers in PSRAM!");
    }
}

void sendToPi(uint8_t* payload, size_t payloadSize) {
    HTTPClient http;
    http.begin(PI_SERVER_URL);
    http.addHeader("Content-Type", "audio/wav");
    
    Serial.println("Sending audio to Pi Server...");
    int httpCode = http.POST(payload, payloadSize);
    
    if (httpCode == 200) {
        WiFiClient* stream = http.getStreamPtr();
        int len = http.getSize();
        if (len > 0 && playbackBuffer) {
            // Read stream into PSRAM playback buffer
            int readBytes = 0;
            int max_size = 30 * SAMPLE_RATE * 2;
            while(http.connected() && (len > 0 || len == -1)) {
                size_t size = stream->available();
                if(size) {
                    if (readBytes + size > max_size) {
                        size = max_size - readBytes; // Cap at max buffer
                    }
                    int c = stream->readBytes(playbackBuffer + readBytes, size);
                    readBytes += c;
                    if(len > 0) len -= c;
                }
                delay(1);
            }
            Serial.printf("Received %d bytes of PCM from Pi. Playing...\n", readBytes);
            echobase.setMute(false);
            echobase.play(playbackBuffer, readBytes);
        }
    } else {
        Serial.printf("Server failed: %d\n", httpCode);
        Serial.println(http.getString());
    }
    http.end();
}

void handleVoiceAssistant() {
    if (!audioBuffer) return;

    if (digitalRead(BUTTON_PIN) == LOW) {
        Serial.println("Button pressed. Start recording...");
        
        // Add WAV header
        writeWavHeader(audioBuffer, AUDIO_DATA_SIZE, SAMPLE_RATE);
        
        // Record
        echobase.setMute(false);
        echobase.record(audioBuffer + 44, AUDIO_DATA_SIZE); // Records blocking for MAX_RECORD_SEC
        
        Serial.println("Recording finished. Waiting for button release...");
        
        // Wait for button release
        while(digitalRead(BUTTON_PIN) == LOW) delay(10);
        
        // Send to Pi 5 Brain
        sendToPi(audioBuffer, AUDIO_DATA_SIZE + 44);
    }
}
