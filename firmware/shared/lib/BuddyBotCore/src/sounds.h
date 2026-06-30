#pragma once

#include <Arduino.h>

// ═══════════════════════════════════════
// BuddyBot Sound System
// Plays WAV files from /sounds/ on SD card
// Falls back to tone() if WAV not found
// ═══════════════════════════════════════

void initSoundPlayer();
void playSound(const char* name);       // Play /sounds/<name>.wav, fallback to tone
void playWavFile(const char* path);     // Play arbitrary WAV file from SD
void playSoundAsync(const char* name);  // Non-blocking version using FreeRTOS task
void stopSound();                        // Stop current playback
