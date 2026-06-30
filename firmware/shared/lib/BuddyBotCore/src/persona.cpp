#include "persona.h"
#include "config.h"

extern float imu_pitch;
extern float imu_roll;


BuddyPersona persona;

BuddyPersona::BuddyPersona() {
    currentEmotion = EMO_NORMAL;
    isTalking = false;
    lastTalkToggleTime = 0;
    talkingState = false;
}

void BuddyPersona::applyConfig() {
    roboEyes.eyeLwidthDefault = buddyConfig.eyeSizeX;
    roboEyes.eyeLheightDefault = buddyConfig.eyeSizeY;
    roboEyes.eyeRwidthDefault = buddyConfig.eyeSizeX;
    roboEyes.eyeRheightDefault = buddyConfig.eyeSizeY;
    roboEyes.frameInterval = 1000 / (buddyConfig.eyeFps > 0 ? buddyConfig.eyeFps : 60);
    roboEyes.colorMain = buddyConfig.eyeColorMain;
    roboEyes.colorBg = buddyConfig.eyeColorBg;
    roboEyes.blinkInterval = buddyConfig.blinkRate / 1000;
    
    roboEyes.hasCheeks = buddyConfig.hasCheeks;
    roboEyes.cheekColor = buddyConfig.cheekColor;
    roboEyes.mouthType = buddyConfig.mouthType;
    roboEyes.mouthColor = buddyConfig.mouthColor;
    roboEyes.mouthSizeX = buddyConfig.mouthSizeX;
    roboEyes.mouthSizeY = buddyConfig.mouthSizeY;

    roboEyes.setPersona(buddyConfig.personaType);
}

void BuddyPersona::begin() {
    // Dynamically apply config sizing/fps
    applyConfig();

    // RoboEyes needs to be started. It uses LovyanGFX directly.
    roboEyes.begin(&M5.Display, M5.Display.width(), M5.Display.height(), 50);
    
    // Enable auto-blinking and idle looking around for a lifelike feel
    roboEyes.autoblinker = 1;
    roboEyes.idle = 1;
    
    setEmotion(EMO_NORMAL);
    roboEyes.setPersona(buddyConfig.personaType);
}

void BuddyPersona::setEmotion(EmotionState newEmotion) {
    if (currentEmotion == newEmotion) return;
    currentEmotion = newEmotion;
    
    // Reset all emotion flags first
    roboEyes.tired = 0;
    roboEyes.angry = 0;
    roboEyes.happy = 0;
    roboEyes.curious = 0;
    roboEyes.cyclops = 0;
    roboEyes.confused = 0;
    roboEyes.laugh = 0;
    roboEyes.hFlicker = 0;
    roboEyes.vFlicker = 0;
    roboEyes.autoblinker = 1;
    roboEyes.open(true, true);
    
    // Reset to defaults
    roboEyes.eyelidsTiredHeight = roboEyes.eyeLheightDefault;
    roboEyes.vFlickerAmplitude = 5;
    roboEyes.hFlickerAmplitude = 5;
    
    // Map BuddyBot states to RoboEyes flags
    switch(currentEmotion) {
        case EMO_NORMAL:
            break;
        case EMO_HAPPY:
            roboEyes.happy = 1;
            break;
        case EMO_ANGRY:
            roboEyes.angry = 1;
            break;
        case EMO_SAD:
            roboEyes.tired = 1;
            roboEyes.eyelidsTiredHeight = roboEyes.eyeLheightDefault / 2;
            break;
        case EMO_SLEEPY:
            roboEyes.tired = 1;
            roboEyes.autoblinker = 0;
            roboEyes.close();
            break;
        case EMO_DOUBTFUL:
            roboEyes.curious = 1;
            break;
        case EMO_COLD:
            roboEyes.hFlicker = 1;
            break;
        case EMO_HOT:
            roboEyes.tired = 1;
            roboEyes.vFlicker = 1;
            roboEyes.vFlickerAmplitude = 2;
            break;
        case EMO_EXCITED:
            roboEyes.laugh = 1;
            roboEyes.vFlicker = 1;
            roboEyes.vFlickerAmplitude = 10;
            break;
        case EMO_WONDER:
            roboEyes.curious = 1;
            roboEyes.happy = 1;
            break;
        case EMO_SHOCKED:
        case EMO_DIZZY:
            roboEyes.hFlicker = 1;
            roboEyes.hFlickerAmplitude = 5;
            roboEyes.curious = 1;
            break;
        case EMO_CYCLOPS:
            roboEyes.cyclops = 1;
            break;
    }
}

void BuddyPersona::startTalking() {
    isTalking = true;
}

void BuddyPersona::stopTalking() {
    isTalking = false;
    if (talkingState) {
        roboEyes.vFlicker = 0;
        talkingState = false;
    }
}

void BuddyPersona::update() {
    // Apply dynamic config variables to preview in UI instantly
    roboEyes.eyeLwidthDefault = buddyConfig.eyeSizeX;
    roboEyes.eyeLheightDefault = buddyConfig.eyeSizeY;
    roboEyes.eyeRwidthDefault = buddyConfig.eyeSizeX;
    roboEyes.eyeRheightDefault = buddyConfig.eyeSizeY;
    roboEyes.frameInterval = 1000 / (buddyConfig.eyeFps > 0 ? buddyConfig.eyeFps : 60);
    roboEyes.colorMain = buddyConfig.eyeColorMain;
    roboEyes.colorBg = buddyConfig.eyeColorBg;
    roboEyes.blinkInterval = buddyConfig.blinkRate / 1000;
    
    roboEyes.hasCheeks = buddyConfig.hasCheeks;
    roboEyes.cheekColor = buddyConfig.cheekColor;
    roboEyes.mouthType = buddyConfig.mouthType;
    roboEyes.mouthColor = buddyConfig.mouthColor;
    roboEyes.mouthSizeX = buddyConfig.mouthSizeX;
    roboEyes.mouthSizeY = buddyConfig.mouthSizeY;

    roboEyes.setPersona(buddyConfig.personaType);

    
    // Handle IMU-based personas if we are not actively doing something else
    if (currentEmotion == EMO_NORMAL || currentEmotion == EMO_SAD || currentEmotion == EMO_WONDER) {
        if (imu_pitch < -60.0) {
            setEmotion(EMO_SAD); // Face planted / Face down
        } else if (imu_pitch > 60.0) {
            setEmotion(EMO_WONDER); // Looking up at the sky
        } else if (abs(imu_roll) > 130.0) {
            setEmotion(EMO_DIZZY); // Upside down
        } else {
            setEmotion(EMO_NORMAL);
        }
    }
    
    // Handle talking animation
    if (isTalking) {
        if (millis() - lastTalkToggleTime > 100) {
            talkingState = !talkingState;
            lastTalkToggleTime = millis();
            
            if (talkingState) {
                roboEyes.vFlicker = 1;
                roboEyes.vFlickerAmplitude = 4;
            } else {
                roboEyes.vFlicker = 0;
            }
        }
    }
    
    // Process blinking and emotion animation
    roboEyes.mouthOpenState = talkingState ? 8 : 0;
    roboEyes.update();
}
