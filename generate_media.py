import os
import wave
import struct
import math
import random
from PIL import Image, ImageDraw

# Ensure directories exist
os.makedirs("sprites", exist_ok=True)
os.makedirs("sounds", exist_ok=True)

# ─── SPRITE GENERATION ───
print("Generating sprites...")
WIDTH, HEIGHT = 320, 240
BG_COLOR = (26, 26, 46)      # Dark space-like bg
EYE_COLOR = (0, 230, 118)    # Greenish eyes

def draw_eye(draw, cx, cy, w, h, emo="chill", is_blink=False, side="left"):
    if is_blink:
        draw.line([(cx-w, cy), (cx+w, cy)], fill=EYE_COLOR, width=8)
        return
        
    if emo == "happy":
        draw.arc([cx-w, cy-w, cx+w, cy+w], start=180, end=360, fill=EYE_COLOR, width=12)
    elif emo == "sad":
        draw.arc([cx-w, cy, cx+w, cy+h*2], start=180, end=360, fill=(255, 107, 157), width=12)
    elif emo == "angry" or emo == "grumpy":
        draw.rectangle([cx-w, cy-h, cx+w, cy+h], fill=(255, 59, 59))
        tilt = -15 if side == "left" else 15
        lx = cx - w - 10
        rx = cx + w + 10
        y1 = cy - h - tilt
        y2 = cy - h + tilt
        draw.line([(lx, y1), (rx, y2)], fill=(255, 59, 59), width=16)
    elif emo == "love":
        draw.polygon([(cx, cy+h), (cx-w, cy-h//2), (cx-w//2, cy-h), (cx, cy-h//2), (cx+w//2, cy-h), (cx+w, cy-h//2)], fill=(255, 107, 157))
    elif emo == "dizzy":
        draw.arc([cx-w, cy-h, cx+w, cy+h], start=0, end=270, fill=(255, 214, 0), width=10)
        draw.arc([cx-w//2, cy-h//2, cx+w//2, cy+h//2], start=180, end=360, fill=(255, 214, 0), width=8)
    elif emo == "cool":
        draw.rectangle([cx-w-5, cy-h//2, cx+w+5, cy+h//2], fill=EYE_COLOR)
        draw.line([(cx-w-20, cy-h//2), (cx+w+20, cy-h//2)], fill=EYE_COLOR, width=4)
    elif emo == "sleepy":
        draw.line([(cx-w, cy), (cx+w, cy)], fill=(144, 202, 249), width=12)
    elif emo == "shocked":
        draw.ellipse([cx-w//2, cy-h, cx+w//2, cy+h], outline=EYE_COLOR, width=8)
    else: 
        draw.rounded_rectangle([cx-w, cy-h, cx+w, cy+h], radius=15, fill=EYE_COLOR)

def create_face(name, emo, is_blink=False, talk="none"):
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    draw.ellipse([WIDTH//2 - 120, HEIGHT//2 - 100, WIDTH//2 + 120, HEIGHT//2 + 100], outline=(40, 40, 60), width=20)
    
    draw_eye(draw, 90, 100, 30, 40, emo, is_blink, "left")
    draw_eye(draw, 230, 100, 30, 40, emo, is_blink, "right")
    
    if talk == "open":
        draw.ellipse([140, 160, 180, 200], fill=(255, 107, 157))
    elif talk == "close":
        draw.line([(140, 180), (180, 180)], fill=(255, 107, 157), width=8)
        
    img = img.transpose(Image.FLIP_TOP_BOTTOM)
    img.save(f"sprites/{name}.bmp", format="BMP")

emotions = ["alert", "chill", "cool", "curious", "dizzy", "excited", "grumpy", "happy", "love", "sad", "shocked", "sleepy"]

for emo in emotions:
    create_face(emo, emo, False)
    create_face(f"{emo}_blink", emo, True)

create_face("chill_talk_open", "chill", False, "open")
create_face("chill_talk_close", "chill", False, "close")


# ─── SOUND GENERATION ───
print("Generating sounds...")
SAMPLE_RATE = 16000

def generate_wav(filename, tone_funcs, duration_s):
    num_samples = int(SAMPLE_RATE * duration_s)
    samples = []
    
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = 0
        for f in tone_funcs:
            val += f(t)
        val = max(-1.0, min(1.0, val))
        samples.append(int(val * 32767))
        
    with wave.open(f"sounds/{filename}.wav", 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        for s in samples:
            wav_file.writeframes(struct.pack('h', s))

def sqr(freq, t): return 0.5 if math.sin(2 * math.pi * freq * t) > 0 else -0.5
def saw(freq, t): return 2.0 * (t * freq - math.floor(0.5 + t * freq))
def tri(freq, t): return 2.0 * abs(saw(freq, t)) - 1.0
def sine(freq, t): return math.sin(2 * math.pi * freq * t)

generate_wav("beep", [lambda t: sqr(880, t) * math.exp(-20*t)], 0.1)

def startup_synth(t):
    if t < 0.2: return sqr(440, t)
    elif t < 0.4: return sqr(554.37, t)
    elif t < 0.6: return sqr(659.25, t)
    else: return sqr(880, t) * math.exp(-3*(t-0.6))
generate_wav("startup", [startup_synth], 1.5)

def levelup_synth(t):
    freq = 600 + min(400, t * 2000)
    return tri(freq, t) * math.exp(-4*t)
generate_wav("levelup", [levelup_synth], 1.0)
generate_wav("happy", [levelup_synth], 1.0)

generate_wav("horn", [lambda t: saw(300, t) * 0.8 + saw(305, t) * 0.8], 1.0)

def r2d2_synth(t):
    step = int(t * 15)
    freqs = [1200, 1500, 1800, 1000, 2000, 1400, 1900]
    f = freqs[step % len(freqs)]
    return sine(f, t) * 0.6
generate_wav("r2d2", [r2d2_synth], 0.8)

def siren_synth(t):
    freq = 600 + math.sin(2 * math.pi * 2 * t) * 200
    return sqr(freq, t) * 0.5
generate_wav("siren", [siren_synth], 2.0)

def sneeze_synth(t):
    if t < 0.2: return tri(800 + t*1000, t) 
    else: return (random.random()*2-1) * math.exp(-15*(t-0.2)) 
generate_wav("sneeze", [sneeze_synth], 0.5)

def eat_synth(t):
    f = 300 - (t%0.1)*1000
    return sqr(f, t) * 0.5
generate_wav("eat", [eat_synth], 0.4)

def laugh_synth(t):
    f = 500 + math.sin(t*30)*100
    return tri(f, t) * max(0, 1 - (t%0.1)*10)
generate_wav("laugh", [laugh_synth], 0.5)

def melody_synth(t):
    notes = [523.25, 587.33, 659.25, 698.46, 783.99]
    n = notes[int(t*4) % len(notes)]
    return sine(n, t) * 0.7
generate_wav("melody", [melody_synth], 1.0)

def purr_synth(t):
    f = 40 + math.sin(t*10)*5
    return (saw(f, t) * 0.3) + (random.random()*0.1 - 0.05)
generate_wav("purr", [purr_synth], 2.0)

def snore_synth(t):
    if t%2.0 < 1.0: return (random.random() * 0.3) * (t%1.0)
    else: return (random.random() * 0.3) * (1.0 - t%1.0)
generate_wav("snore", [snore_synth], 4.0)

def whistle_synth(t):
    if t < 0.5: return sine(800 + t*1000, t) * 0.5
    else: return sine(1300 - (t-0.5)*500, t) * 0.5
generate_wav("whistle", [whistle_synth], 1.0)

print("Done! Media generated.")
