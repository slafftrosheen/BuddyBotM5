#include "persona.h"
#include "config.h"

BuddyPersona persona;

BuddyPersona::BuddyPersona() {
    currentEmotion = EMO_CHILL;
    targetEmotion = EMO_CHILL;
    isTalking = false;
    isBlinking = false;
    lastBlinkTime = 0;
    blinkDuration = 150; // ms
    nextBlinkDelay = 3000;
    lastTalkToggleTime = 0;
    talkMouthOpen = false;
}

void BuddyPersona::begin() {
    // Initial draw
    nextBlinkDelay = buddyConfig.blinkRate;
    if (nextBlinkDelay < 500) nextBlinkDelay = 3000;
    drawSprite();
}

void BuddyPersona::setEmotion(EmotionState newEmotion) {
    if (currentEmotion != newEmotion) {
        currentEmotion = newEmotion;
        targetEmotion = newEmotion;
        isBlinking = false; // Reset blink state on emotion change
        drawSprite();
    }
}

void BuddyPersona::startTalking() {
    isTalking = true;
    talkMouthOpen = true;
    lastTalkToggleTime = millis();
    drawSprite();
}

void BuddyPersona::stopTalking() {
    isTalking = false;
    talkMouthOpen = false;
    drawSprite();
}

String BuddyPersona::getEmotionFilename(EmotionState emo) {
    switch (emo) {
        case EMO_CHILL:   return "/sprites/chill";
        case EMO_HAPPY:   return "/sprites/happy";
        case EMO_GRUMPY:  return "/sprites/grumpy";
        case EMO_SLEEPY:  return "/sprites/sleepy";
        case EMO_EXCITED: return "/sprites/excited";
        case EMO_SAD:     return "/sprites/sad";
        case EMO_CURIOUS: return "/sprites/curious";
        case EMO_ALERT:   return "/sprites/alert";
        case EMO_LOVE:    return "/sprites/love";
        case EMO_SHOCKED: return "/sprites/shocked";
        case EMO_DIZZY:   return "/sprites/dizzy";
        case EMO_COOL:    return "/sprites/cool";
        default:          return "/sprites/chill";
    }
}

void BuddyPersona::drawSprite() {
    String filename = getEmotionFilename(currentEmotion);
    
    // Modify filename based on state
    if (isBlinking) {
        filename += "_blink";
    } else if (isTalking) {
        if (talkMouthOpen) {
            filename += "_talk_open";
        } else {
            filename += "_talk_close";
        }
    }
    
    filename += ".bmp"; // We use BMP for fast decoding on ESP32
    
    // Check if file exists to prevent black screen if missing
    if (SD.exists(filename)) {
        File file = SD.open(filename);
        if (file) {
            M5.Display.drawBmp(&file, 0, 0);
            file.close();
        }
    } else {
        // Fallback if sprite is missing: clear screen and print emotion name
        M5.Display.fillScreen(BLACK);
        M5.Display.setTextColor(WHITE, BLACK);
        M5.Display.setTextSize(2);
        M5.Display.setCursor(10, 10);
        M5.Display.printf("Missing: %s", filename.c_str());
    }
}

void BuddyPersona::update() {
    unsigned long now = millis();
    
    // Handle blinking
    if (!isBlinking && !isTalking) {
        if (now - lastBlinkTime > nextBlinkDelay) {
            isBlinking = true;
            lastBlinkTime = now;
            drawSprite();
        }
    } else if (isBlinking) {
        if (now - lastBlinkTime > blinkDuration) {
            isBlinking = false;
            lastBlinkTime = now;
            
            // Calculate next blink delay based on config with some randomness
            uint32_t baseRate = buddyConfig.blinkRate;
            if (baseRate < 500) baseRate = 3000;
            nextBlinkDelay = baseRate + random(-500, 1000);
            
            drawSprite();
        }
    }
    
    // Handle talking animation (mouth flapping)
    if (isTalking && !isBlinking) {
        if (now - lastTalkToggleTime > 150) { // Flap mouth every 150ms
            talkMouthOpen = !talkMouthOpen;
            lastTalkToggleTime = now;
            drawSprite();
        }
    }
}
