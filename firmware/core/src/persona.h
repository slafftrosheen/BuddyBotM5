#ifndef BUDDY_PERSONA_H
#define BUDDY_PERSONA_H

#include <M5Unified.h>
#include <SD.h>

// Persona Emotion States
enum EmotionState {
    EMO_CHILL = 0,
    EMO_HAPPY,
    EMO_GRUMPY,
    EMO_SLEEPY,
    EMO_EXCITED,
    EMO_SAD,
    EMO_CURIOUS,
    EMO_ALERT,
    EMO_LOVE,
    EMO_SHOCKED,
    EMO_DIZZY,
    EMO_COOL
};

class BuddyPersona {
public:
    BuddyPersona();
    
    // Initialize the persona engine
    void begin();
    
    // Main update loop to handle blinking and animations
    void update();
    
    // Set the current emotion
    void setEmotion(EmotionState newEmotion);
    
    // Start talking animation (mouth moving)
    void startTalking();
    
    // Stop talking animation
    void stopTalking();

private:
    EmotionState currentEmotion;
    EmotionState targetEmotion;
    
    bool isTalking;
    bool isBlinking;
    
    unsigned long lastBlinkTime;
    unsigned long blinkDuration;
    unsigned long nextBlinkDelay;
    
    unsigned long lastTalkToggleTime;
    bool talkMouthOpen;
    
    // Draw the current sprite based on state
    void drawSprite();
    
    // Get the base filename for the current emotion
    String getEmotionFilename(EmotionState emo);
};

// Global instance
extern BuddyPersona persona;

#endif // BUDDY_PERSONA_H
