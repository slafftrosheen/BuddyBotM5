import os
import subprocess
import requests
import json
import base64
from fastapi import FastAPI, Request, Response
from gtts import gTTS
import uvicorn

# ==========================================
# CONFIGURATION
# ==========================================
GEMINI_API_KEY = "AIzaSyC2rJzys_Ab-7eXvGrqhUkoVDbRrEF9CYY"

app = FastAPI()

def call_gemini(audio_path: str) -> str:
    # Read the audio file
    with open(audio_path, "rb") as f:
        audio_data = f.read()
        
    audio_base64 = base64.b64encode(audio_data).decode("utf-8")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    headers = {"Content-Type": "application/json"}
    
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": "You are BuddyBot, a cute and helpful desktop companion robot. Keep your response extremely short (1-2 sentences). Respond to the user's audio."
                    },
                    {
                        "inline_data": {
                            "mime_type": "audio/wav",
                            "data": audio_base64
                        }
                    }
                ]
            }
        ]
    }
    
    print("Calling Gemini API...")
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        data = response.json()
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return text.strip()
        except KeyError:
            return "I couldn't understand that."
    else:
        print(f"Gemini API Error: {response.text}")
        return "I'm having trouble thinking right now."

def text_to_pcm(text: str) -> bytes:
    print(f"Generating TTS for: {text}")
    # Use Google TTS
    tts = gTTS(text=text, lang="en", tld="com")
    mp3_path = "temp.mp3"
    pcm_path = "temp.pcm"
    tts.save(mp3_path)
    
    # Convert MP3 to 24kHz 16-bit Mono PCM (which the ESP32 expects)
    if os.path.exists(pcm_path):
        os.remove(pcm_path)
        
    subprocess.run([
        "ffmpeg", "-i", mp3_path, 
        "-f", "s16le",       # Signed 16-bit little-endian
        "-ac", "1",          # 1 channel (mono)
        "-ar", "24000",      # 24kHz sample rate
        pcm_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    with open(pcm_path, "rb") as f:
        pcm_data = f.read()
        
    return pcm_data

@app.post("/api/voice")
async def handle_voice(request: Request):
    # Receive the raw WAV audio from the ESP32
    audio_data = await request.body()
    print(f"Received {len(audio_data)} bytes of audio.")
    
    # Save the received audio
    wav_path = "received.wav"
    with open(wav_path, "wb") as f:
        f.write(audio_data)
        
    # Get text response from Gemini
    response_text = call_gemini(wav_path)
    print(f"BuddyBot says: {response_text}")
    
    # Generate PCM audio
    pcm_audio = text_to_pcm(response_text)
    
    # Send PCM directly back to ESP32
    return Response(content=pcm_audio, media_type="audio/pcm")

if __name__ == "__main__":
    print("BuddyBot Brain running on port 8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
