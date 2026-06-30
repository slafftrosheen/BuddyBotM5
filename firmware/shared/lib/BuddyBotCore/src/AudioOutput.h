#pragma once
#include <Arduino.h>

class AudioOutput {
public:
    uint32_t hertz = 16000;
    AudioOutput() { };
    virtual ~AudioOutput() {};
    virtual bool SetRate(int hz) { hertz = hz; return true; }
    virtual bool SetChannels(int chan) { return true; }
    virtual bool SetGain(float f) { return true; }
    virtual bool begin() { return true; };
    virtual bool ConsumeSample(int16_t sample[2]) { return false; }
    virtual bool stop() { return true; }
};
