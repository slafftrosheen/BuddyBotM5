import os
import io
import time
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from gtts import gTTS

# Load config
load_dotenv('config.env')
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ROBOT_IP = os.getenv("ROBOT_IP", "buddy.local")

if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY":
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="BuddyBot Brain")

# CORS setup for Web UI on CoreS3
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    text: str

def trigger_bot_emotion(emotion_id):
    try:
        requests.post(f"http://{ROBOT_IP}/api/persona", json={"emotion": emotion_id}, timeout=1)
    except:
        pass

def trigger_bot_talking(is_talking):
    try:
        requests.post(f"http://{ROBOT_IP}/api/persona", json={"talking": is_talking}, timeout=1)
    except:
        pass

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "BuddyBot Brain", "ai_ready": bool(GEMINI_API_KEY)}

@app.post("/api/tts")
def text_to_speech(req: ChatRequest):
    """Generate audio and play it locally on the Pi Zero's speaker."""
    if not req.text:
        return {"error": "No text provided"}
    
    # We could send the audio back to ESP32, but for Max tier, Pi Zero plays it directly!
    tts = gTTS(text=req.text, lang='en', slow=False)
    tts.save("temp.mp3")
    
    # Trigger talking animation on bot
    trigger_bot_talking(True)
    
    # Play locally (requires mpg123 or similar on the Pi)
    os.system("mpg123 temp.mp3")
    
    # Stop talking animation
    trigger_bot_talking(False)
    
    return {"status": "played"}

@app.post("/api/voice")
async def process_voice(file: UploadFile = File(...)):
    """Receives a WAV file, converts to text, chats with Gemini, and plays audio."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
        return {"error": "AI not configured"}
        
    trigger_bot_emotion(6) # Curious (listening/thinking)
    
    import speech_recognition as sr
    recognizer = sr.Recognizer()
    
    audio_bytes = await file.read()
    audio_file = io.BytesIO(audio_bytes)
    
    try:
        with sr.AudioFile(audio_file) as source:
            audio_data = recognizer.record(source)
        text = recognizer.recognize_google(audio_data)
    except Exception as e:
        trigger_bot_emotion(5) # Sad
        return {"error": f"Could not understand audio: {str(e)}"}
        
    # Reuse chat logic which handles TTS
    return chat_with_gemini(ChatRequest(text=text))

@app.post("/api/chat")
def chat_with_gemini(req: ChatRequest):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
        return {"response": "My AI brain is not configured yet!"}
        
    trigger_bot_emotion(6) # Curious (thinking)
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(
            f"You are BuddyBot, a friendly robot companion for kids. Keep answers short, fun, and use emojis. The child says: {req.text}"
        )
        reply = response.text
        
        trigger_bot_emotion(1) # Happy
        
        # Optionally trigger TTS here automatically
        # text_to_speech(ChatRequest(text=reply))
        
        return {"response": reply}
    except Exception as e:
        trigger_bot_emotion(5) # Sad (error)
        return {"error": str(e)}

@app.post("/api/detect")
def yolo_detect():
    """
    Mock endpoint for YOLO detection.
    In a real scenario, this grabs a frame from buddycam.local, runs a tflite/onnx YOLO model,
    and returns bounding boxes.
    """
    return {
        "detections": [
            {"class": "person", "confidence": 0.95, "box": [10, 10, 100, 200]},
            {"class": "dog", "confidence": 0.88, "box": [150, 100, 300, 240]}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
