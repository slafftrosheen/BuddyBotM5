#pragma once
#include "AudioOutput.h"
#include <M5Unified.h>

class AudioOutputM5Speaker : public AudioOutput {
  public:
    AudioOutputM5Speaker(m5::Speaker_Class* m5sound, uint8_t virtual_sound_channel = 0) {
      _m5sound = m5sound;
      _virtual_ch = virtual_sound_channel;
    }
    virtual ~AudioOutputM5Speaker(void) {};
    virtual bool begin() override { return true; }
    virtual bool ConsumeSample(int16_t sample[2]) override {
      int16_t s[2] = { sample[0], sample[1] };
      while (_m5sound->playRaw(s, 2, hertz, true, 1, _virtual_ch) == 0) {
          delay(1);
      }
      return true;
    }
    virtual bool stop() override { _m5sound->stop(_virtual_ch); return true; }
  protected:
    m5::Speaker_Class* _m5sound;
    uint8_t _virtual_ch;
};
