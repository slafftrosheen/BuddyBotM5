#include "voice.h"
#include <ESP8266SAM.h>
#include "AudioOutputM5Speaker.h"
#include "persona.h"

AudioOutputM5Speaker *out = nullptr;
ESP8266SAM *sam = nullptr;

String ttsQueue = "";

void initVoice() {
    out = new AudioOutputM5Speaker(&M5.Speaker, 0);
    sam = new ESP8266SAM;
}

void speakTTS(String text) {
    ttsQueue = text;
}

void updateVoice() {
    if (ttsQueue.length() > 0) {
        String toSpeak = ttsQueue;
        ttsQueue = "";
        
        persona.startTalking();
        sam->Say(out, toSpeak.c_str());
        persona.stopTalking();
    }
}
