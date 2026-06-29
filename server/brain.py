import os
import time
import requests
import threading
import cv2
import numpy as np

cv_tracking_enabled = False
fall_prevention_enabled = False

fall_edge_density_threshold = 1500
track_min_area = 300
track_hsv_lower = [0, 120, 70]
track_hsv_upper = [10, 255, 255]

def cv_background_loop():
    global cv_tracking_enabled, fall_prevention_enabled
    
    global fall_edge_density_threshold, track_min_area, track_hsv_lower, track_hsv_upper
    # Red color thresholds (HSV)
    lower_red1 = np.array(track_hsv_lower)
    upper_red1 = np.array(track_hsv_upper)
    lower_red2 = np.array([170, 120, 70])
    upper_red2 = np.array([180, 255, 255])
    
    while True:
        time.sleep(0.1) # ~10 FPS max
        
        if not cv_tracking_enabled and not fall_prevention_enabled:
            time.sleep(0.5) # Sleep longer if disabled
            continue
            
        try:
            resp = requests.get(f"http://{os.getenv('CAM_IP', '192.168.8.189')}/capture", timeout=1)
            if resp.status_code != 200:
                continue
            
            nparr = np.frombuffer(resp.content, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                continue
                
            h, w, _ = frame.shape
            
            # --- FALL PREVENTION (Feature 7) ---
            if fall_prevention_enabled:
                # Grab bottom 30% of frame
                bottom_h = int(h * 0.3)
                floor_roi = frame[h-bottom_h:h, 0:w]
                
                # Convert to gray
                gray = cv2.cvtColor(floor_roi, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray, 50, 150)
                
                # Calculate edge density. A sudden spike often means a table edge or obstacle.
                edge_density = np.sum(edges) / 255.0
                
                if edge_density > fall_edge_density_threshold:
                    log.warning(f"FALL PREVENTED! Edge density: {edge_density}")
                    requests.post(f"http://{ROBOT_IP}/api/motors", json={"speed": -50, "turn": 0}, timeout=1)
                    time.sleep(0.5)
                    requests.post(f"http://{ROBOT_IP}/api/motors", json={"speed": 0, "turn": 0}, timeout=1)
                    trigger_bot_emotion(5) # Sad/Scared
                    
            # --- AUTO TRACKING (Feature 2) ---
            if cv_tracking_enabled:
                hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
                mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
                mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
                mask = mask1 + mask2
                
                contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    c = max(contours, key=cv2.contourArea)
                    area = cv2.contourArea(c)
                    if area > track_min_area:
                        x, y, w_box, h_box = cv2.boundingRect(c)
                        center_x = x + w_box/2
                        
                        # Proportional control for steering
                        error_x = (center_x - (w / 2)) / (w / 2)
                        turn = int(error_x * 80)
                        
                        # Proportional control for speed (target 30% of screen width)
                        target_width = w * 0.3
                        error_size = (target_width - w_box) / target_width
                        speed = int(error_size * 50)
                        
                        requests.post(f"http://{ROBOT_IP}/api/motors", json={"speed": speed, "turn": turn}, timeout=1)
                else:
                    # Stop if no target found
                    requests.post(f"http://{ROBOT_IP}/api/motors", json={"speed": 0, "turn": 0}, timeout=1)
                    
        except Exception as e:
            pass

# Start the background thread
threading.Thread(target=cv_background_loop, daemon=True).start()

import io
import time
import logging
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from gtts import gTTS

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
log = logging.getLogger('BuddyBrain')

# Load config
load_dotenv('config.env')
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ROBOT_IP = os.getenv("ROBOT_IP", "192.168.8.187")

client = None
if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY":
    client = genai.Client(api_key=GEMINI_API_KEY)

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
    except Exception as e:
        log.warning(f"Failed to set bot emotion {emotion_id}: {e}")

def trigger_bot_talking(is_talking):
    try:
        requests.post(f"http://{ROBOT_IP}/api/persona", json={"talking": is_talking}, timeout=1)
    except Exception as e:
        log.warning(f"Failed to set bot talking {is_talking}: {e}")

@app.get("/api/health")

class CVStateRequest(BaseModel):
    enabled: bool

@app.post("/api/cv/track")
def toggle_tracking(req: CVStateRequest):
    global cv_tracking_enabled
    cv_tracking_enabled = req.enabled
    return {"tracking": cv_tracking_enabled}

@app.post("/api/cv/fall")
def toggle_fall(req: CVStateRequest):
    global fall_prevention_enabled
    fall_prevention_enabled = req.enabled
    return {"fall_prevention": fall_prevention_enabled}


class CVTuningRequest(BaseModel):
    fall_edge_density_threshold: int = None
    track_min_area: int = None
    track_hsv_lower: list = None
    track_hsv_upper: list = None

@app.get("/api/cv/tune")
def get_cv_tuning():
    global fall_edge_density_threshold, track_min_area, track_hsv_lower, track_hsv_upper
    return {
        "fall_edge_density_threshold": fall_edge_density_threshold,
        "track_min_area": track_min_area,
        "track_hsv_lower": track_hsv_lower,
        "track_hsv_upper": track_hsv_upper
    }

@app.post("/api/cv/tune")
def set_cv_tuning(req: CVTuningRequest):
    global fall_edge_density_threshold, track_min_area, track_hsv_lower, track_hsv_upper
    if req.fall_edge_density_threshold is not None:
        fall_edge_density_threshold = req.fall_edge_density_threshold
    if req.track_min_area is not None:
        track_min_area = req.track_min_area
    if req.track_hsv_lower is not None:
        track_hsv_lower = req.track_hsv_lower
    if req.track_hsv_upper is not None:
        track_hsv_upper = req.track_hsv_upper
    return get_cv_tuning()

@app.post("/api/detect")
def yolo_detect():
    """YOLO Vision logic via Haar Cascades for speed on Raspberry Pi."""
    try:
        resp = requests.get(f"http://{os.getenv('CAM_IP', '192.168.8.189')}/capture", timeout=2)
        if resp.status_code != 200:
            return {"detections": []}
            
        nparr = np.frombuffer(resp.content, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"detections": []}
            
        h, w, _ = frame.shape
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        detections = []
        for (fx, fy, fw, fh) in faces:
            detections.append({
                "label": "Person",
                "confidence": 0.88,
                "x": (fx / w) * 100,
                "y": (fy / h) * 100,
                "w": (fw / w) * 100,
                "h": (fh / h) * 100
            })
            
        return {"detections": detections}
    except Exception as e:
        log.error(f"Detect API Error: {e}")
        return {"detections": []}

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
        

    # ── Voice Macros (Feature 8) ──
    text_lower = text.lower()
    
    # 1. Dance Macro
    if "dance" in text_lower:
        trigger_bot_emotion(1) # Happy
        requests.post(f"http://{ROBOT_IP}/api/motors", json={"speed": 0, "turn": 100}, timeout=1) # Spin
        time.sleep(0.5)
        requests.post(f"http://{ROBOT_IP}/api/motors", json={"speed": 0, "turn": -100}, timeout=1) # Spin back
        time.sleep(0.5)
        requests.post(f"http://{ROBOT_IP}/api/motors", json={"speed": 0, "turn": 0}, timeout=1) # Stop
        tts = gTTS(text="Let's dance!", lang='en', slow=False)
        tts.save("macro.mp3")
        trigger_bot_talking(True)
        os.system("mpg123 macro.mp3")
        trigger_bot_talking(False)
        return {"response": "Executed dance macro!"}

    # 2. Explore Macro
    if "explore" in text_lower or "wander" in text_lower:
        trigger_bot_emotion(6) # Curious
        requests.post(f"http://{ROBOT_IP}/api/motors", json={"speed": 40, "turn": 0}, timeout=1) # Forward
        tts = gTTS(text="I love exploring!", lang='en', slow=False)
        tts.save("macro.mp3")
        trigger_bot_talking(True)
        os.system("mpg123 macro.mp3")
        trigger_bot_talking(False)
        return {"response": "Executed explore macro!"}

    # 3. Stop Macro
    if "stop" in text_lower or "halt" in text_lower:
        trigger_bot_emotion(0) # Neutral
        requests.post(f"http://{ROBOT_IP}/api/motors", json={"speed": 0, "turn": 0}, timeout=1)
        tts = gTTS(text="Stopping right now.", lang='en', slow=False)
        tts.save("macro.mp3")
        trigger_bot_talking(True)
        os.system("mpg123 macro.mp3")
        trigger_bot_talking(False)
        return {"response": "Executed stop macro!"}

    # Reuse chat logic which handles TTS
    return chat_with_gemini(ChatRequest(text=text))

@app.post("/api/chat")

@app.get("/api/vision")
def what_do_you_see():
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
        return {"error": "AI not configured"}
        
    try:
        trigger_bot_emotion(6) # Curious
        
        # Fetch image from ESP32-CAM (it might be configured as buddycam.local or camIp)
        # We will try the default camIp
        cam_url = f"http://{os.getenv('CAM_IP', '192.168.8.189')}/capture"
        resp = requests.get(cam_url, timeout=5)
        
        if resp.status_code != 200:
            trigger_bot_emotion(5) # Sad
            return {"error": "Camera not reachable"}
            
        image_bytes = resp.content
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        
        prompt = "You are BuddyBot, a friendly robot companion for kids. Look at this picture from your camera eyes and describe what you see in 1 or 2 short, fun sentences! Use emojis."
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, img]
        )
        reply = response.text
        log.info(f"Vision reply: {reply[:80]}...")
        
        trigger_bot_emotion(1) # Happy
        
        # Speak it
        tts = gTTS(text=reply, lang='en', slow=False)
        tts.save("vision.mp3")
        trigger_bot_talking(True)
        os.system("mpg123 vision.mp3")
        trigger_bot_talking(False)
        
        return {"response": reply}
    except Exception as e:
        log.error(f"Vision error: {e}")
        trigger_bot_emotion(5)
        return {"error": str(e)}

@app.post("/api/chat")
def chat_with_gemini(req: ChatRequest):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
        return {"response": "My AI brain is not configured yet!"}
        
    trigger_bot_emotion(6) # Curious (thinking)
    
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=f"You are BuddyBot, a friendly robot companion for kids. Keep answers short, fun, and use emojis. The child says: {req.text}"
        )
        reply = response.text
        log.info(f"Gemini reply: {reply[:80]}...")
        
        trigger_bot_emotion(1) # Happy
        
        return {"response": reply}
    except Exception as e:
        log.error(f"Gemini error: {e}")
        trigger_bot_emotion(5) # Sad (error)
        return {"error": str(e)}

def track_object(box, image_width=320, image_height=240):
    # box = [x_min, y_min, x_max, y_max]
    center_x = (box[0] + box[2]) / 2
    
    # Calculate error from center (-1.0 to 1.0)
    error_x = (center_x - (image_width / 2)) / (image_width / 2)
    
    # Proportional control for steering
    kp_turn = 50.0 
    turn = int(error_x * kp_turn)
    
    # Calculate size (rough proxy for distance)
    box_width = box[2] - box[0]
    target_width = image_width * 0.4 # Target width is 40% of screen
    
    error_size = (target_width - box_width) / target_width
    kp_speed = 30.0
    speed = int(error_size * kp_speed)
    
    # Send to robot
    try:
        requests.post(f"http://{ROBOT_IP}/api/motors", json={"speed": speed, "turn": turn}, timeout=1)
    except:
        pass
    
    return {"speed": speed, "turn": turn}

@app.post("/api/detect")
def yolo_detect():
    """
    Mock endpoint for YOLO detection.
    In a real scenario, this grabs a frame from buddycam.local, runs a tflite/onnx YOLO model,
    and returns bounding boxes.
    """
    detections = [
        {"class": "person", "confidence": 0.95, "box": [110, 10, 210, 200]} # roughly centered
    ]
    
    # Auto-track the first person detected
    tracking_action = {"speed": 0, "turn": 0}
    for det in detections:
        if det["class"] == "person":
            tracking_action = track_object(det["box"])
            break
            
    return {
        "detections": detections,
        "tracking": tracking_action
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
