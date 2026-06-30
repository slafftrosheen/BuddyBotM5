#ifndef BUDDY_PERSONA_H
#define BUDDY_PERSONA_H

#include <M5Unified.h>
#include "M5Stack_RoboEyes.h"

// Persona Emotion States
enum EmotionState {
    EMO_NORMAL = 0,
    EMO_HAPPY,
    EMO_ANGRY,
    EMO_SAD,
    EMO_SLEEPY,
    EMO_DOUBTFUL,
    EMO_COLD,
    EMO_HOT,
    EMO_EXCITED,
    EMO_SHOCKED,
    EMO_WONDER,
    EMO_DIZZY,
    EMO_CYCLOPS
};

class BuddyPersona {
public:
    BuddyPersona();
    
    // Initialize the persona engine
    void begin();
    
    // Apply dynamic configuration without restarting
    void applyConfig();

    // Main update loop to handle animations
    void update();
    
    // Set the current emotion
    void setEmotion(EmotionState newEmotion);
    
    // Start talking animation
    void startTalking();
    
    // Stop talking animation
    void stopTalking();

private:
    EmotionState currentEmotion;
    RoboEyes roboEyes;
    bool isTalking;
    unsigned long lastTalkToggleTime;
    bool talkingState;
};

// Global instance
extern BuddyPersona persona;

#endif // BUDDY_PERSONA_H
