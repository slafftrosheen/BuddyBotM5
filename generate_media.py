#!/usr/bin/env python3
"""
BuddyBot Media Generator v4.0
Generates cohesive sprites (320x240 BMP) and synthesized WAV sounds
for the M5Stack CoreS3 SD card.
"""
import os
import wave
import struct
import math
import random
from PIL import Image, ImageDraw, ImageFilter

os.makedirs("sprites", exist_ok=True)
os.makedirs("sounds", exist_ok=True)

WIDTH, HEIGHT = 320, 240

# ════════════════════════════════════════
# Color Palettes per emotion
# ════════════════════════════════════════
PALETTES = {
    "chill":    {"bg1": (20, 24, 50), "bg2": (30, 36, 70),  "eye": (0, 243, 255),    "mouth": (150, 180, 220), "acc": (60, 80, 120)},
    "happy":    {"bg1": (25, 40, 20), "bg2": (40, 60, 30),   "eye": (0, 230, 118),    "mouth": (255, 214, 0),   "acc": (80, 140, 60)},
    "grumpy":   {"bg1": (50, 15, 15), "bg2": (70, 20, 20),   "eye": (255, 59, 59),    "mouth": (200, 80, 80),   "acc": (120, 40, 40)},
    "sleepy":   {"bg1": (15, 15, 40), "bg2": (25, 25, 55),   "eye": (144, 202, 249),  "mouth": (100, 120, 180), "acc": (50, 50, 90)},
    "excited":  {"bg1": (50, 30, 10), "bg2": (70, 45, 15),   "eye": (255, 214, 0),    "mouth": (255, 150, 50),  "acc": (130, 100, 30)},
    "sad":      {"bg1": (15, 20, 40), "bg2": (20, 30, 55),   "eye": (100, 150, 255),  "mouth": (120, 130, 180), "acc": (50, 60, 100)},
    "curious":  {"bg1": (20, 35, 40), "bg2": (30, 50, 60),   "eye": (0, 200, 200),    "mouth": (140, 200, 200), "acc": (60, 100, 110)},
    "alert":    {"bg1": (50, 35, 10), "bg2": (70, 50, 15),   "eye": (255, 170, 0),    "mouth": (200, 150, 80),  "acc": (130, 90, 30)},
    "love":     {"bg1": (45, 15, 30), "bg2": (65, 25, 45),   "eye": (255, 107, 157),  "mouth": (255, 150, 180), "acc": (120, 50, 80)},
    "shocked":  {"bg1": (20, 20, 45), "bg2": (35, 35, 65),   "eye": (200, 255, 200),  "mouth": (180, 220, 180), "acc": (70, 90, 70)},
    "dizzy":    {"bg1": (40, 30, 50), "bg2": (55, 40, 70),   "eye": (255, 214, 0),    "mouth": (200, 180, 220), "acc": (100, 80, 120)},
    "cool":     {"bg1": (10, 15, 30), "bg2": (20, 25, 45),   "eye": (0, 243, 255),    "mouth": (140, 200, 255), "acc": (40, 60, 100)},
}

def gradient_bg(draw, w, h, c1, c2):
    """Vertical gradient background."""
    for y in range(h):
        r = c1[0] + (c2[0] - c1[0]) * y // h
        g = c1[1] + (c2[1] - c1[1]) * y // h
        b = c1[2] + (c2[2] - c1[2]) * y // h
        draw.line([(0, y), (w, y)], fill=(r, g, b))

def draw_rounded_rect(draw, box, radius, fill):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=radius, fill=fill)

def draw_glow(draw, cx, cy, radius, color, intensity=3):
    """Draw a subtle glow effect."""
    for i in range(intensity, 0, -1):
        alpha_r = radius + i * 6
        c = tuple(max(0, min(255, v - i * 20)) for v in color)
        draw.ellipse([cx - alpha_r, cy - alpha_r, cx + alpha_r, cy + alpha_r],
                     fill=None, outline=c, width=2)

def draw_eyes_chill(draw, pal, blink):
    """Default rounded rectangle eyes."""
    if blink:
        draw.line([(80, 95), (140, 95)], fill=pal["eye"], width=6)
        draw.line([(180, 95), (240, 95)], fill=pal["eye"], width=6)
    else:
        draw_rounded_rect(draw, [85, 65, 135, 125], 18, pal["eye"])
        draw_rounded_rect(draw, [185, 65, 235, 125], 18, pal["eye"])
        # Pupils
        draw.ellipse([102, 80, 118, 96], fill=(10, 10, 30))
        draw.ellipse([202, 80, 218, 96], fill=(10, 10, 30))
        # Shine
        draw.ellipse([108, 76, 116, 84], fill=(255, 255, 255))
        draw.ellipse([208, 76, 216, 84], fill=(255, 255, 255))

def draw_eyes_happy(draw, pal, blink):
    """Upward arcs (closed-happy eyes)."""
    if blink:
        draw.line([(80, 95), (140, 95)], fill=pal["eye"], width=6)
        draw.line([(180, 95), (240, 95)], fill=pal["eye"], width=6)
    else:
        draw.arc([80, 60, 140, 130], start=200, end=340, fill=pal["eye"], width=10)
        draw.arc([180, 60, 240, 130], start=200, end=340, fill=pal["eye"], width=10)

def draw_eyes_grumpy(draw, pal, blink):
    """Angry slanted rectangles with eyebrow lines."""
    if blink:
        draw.line([(80, 100), (140, 100)], fill=pal["eye"], width=6)
        draw.line([(180, 100), (240, 100)], fill=pal["eye"], width=6)
    else:
        draw_rounded_rect(draw, [85, 75, 135, 115], 6, pal["eye"])
        draw_rounded_rect(draw, [185, 75, 235, 115], 6, pal["eye"])
        # Angry eyebrows
        draw.line([(75, 55), (145, 70)], fill=pal["eye"], width=8)
        draw.line([(245, 55), (175, 70)], fill=pal["eye"], width=8)

def draw_eyes_sleepy(draw, pal, blink):
    """Half-closed droopy lines."""
    draw.line([(80, 95), (140, 95)], fill=pal["eye"], width=10)
    draw.line([(180, 95), (240, 95)], fill=pal["eye"], width=10)
    if not blink:
        # Little droopy lids
        draw.arc([80, 80, 140, 110], start=0, end=180, fill=pal["eye"], width=4)
        draw.arc([180, 80, 240, 110], start=0, end=180, fill=pal["eye"], width=4)

def draw_eyes_excited(draw, pal, blink):
    """Star-shaped eyes."""
    if blink:
        draw.line([(80, 95), (140, 95)], fill=pal["eye"], width=6)
        draw.line([(180, 95), (240, 95)], fill=pal["eye"], width=6)
    else:
        for cx in [110, 210]:
            # 4-pointed star
            pts = []
            for i in range(8):
                angle = math.radians(i * 45 - 90)
                r = 30 if i % 2 == 0 else 14
                pts.append((cx + r * math.cos(angle), 90 + r * math.sin(angle)))
            draw.polygon(pts, fill=pal["eye"])

def draw_eyes_sad(draw, pal, blink):
    """Downward arcs with teardrops."""
    if blink:
        draw.line([(80, 90), (140, 90)], fill=pal["eye"], width=6)
        draw.line([(180, 90), (240, 90)], fill=pal["eye"], width=6)
    else:
        draw.arc([80, 70, 140, 130], start=20, end=160, fill=pal["eye"], width=10)
        draw.arc([180, 70, 240, 130], start=20, end=160, fill=pal["eye"], width=10)
        # Teardrops
        draw.ellipse([125, 115, 133, 130], fill=(100, 150, 255))
        draw.ellipse([225, 115, 233, 130], fill=(100, 150, 255))

def draw_eyes_curious(draw, pal, blink):
    """One eye bigger than the other (quizzical look)."""
    if blink:
        draw.line([(80, 95), (140, 95)], fill=pal["eye"], width=6)
        draw.line([(185, 95), (235, 95)], fill=pal["eye"], width=6)
    else:
        draw_rounded_rect(draw, [80, 55, 140, 130], 20, pal["eye"])  # Big eye
        draw.ellipse([90, 72, 108, 90], fill=(10, 10, 30))
        draw.ellipse([94, 68, 102, 76], fill=(255, 255, 255))
        draw_rounded_rect(draw, [190, 75, 230, 115], 14, pal["eye"])  # Small eye
        draw.ellipse([203, 85, 215, 97], fill=(10, 10, 30))

def draw_eyes_alert(draw, pal, blink):
    """Wide open with exclamation-like pupils."""
    if blink:
        draw.line([(80, 95), (140, 95)], fill=pal["eye"], width=6)
        draw.line([(180, 95), (240, 95)], fill=pal["eye"], width=6)
    else:
        draw.ellipse([78, 55, 142, 130], fill=pal["eye"])
        draw.ellipse([178, 55, 242, 130], fill=pal["eye"])
        draw.ellipse([102, 78, 118, 94], fill=(10, 10, 30))
        draw.ellipse([202, 78, 218, 94], fill=(10, 10, 30))
        draw.ellipse([108, 82, 114, 88], fill=(255, 255, 255))
        draw.ellipse([208, 82, 214, 88], fill=(255, 255, 255))

def draw_eyes_love(draw, pal, blink):
    """Heart-shaped eyes."""
    if blink:
        draw.line([(80, 95), (140, 95)], fill=pal["eye"], width=6)
        draw.line([(180, 95), (240, 95)], fill=pal["eye"], width=6)
    else:
        for cx in [110, 210]:
            # Simple heart from two circles + triangle
            draw.ellipse([cx-20, 65, cx, 95], fill=pal["eye"])
            draw.ellipse([cx, 65, cx+20, 95], fill=pal["eye"])
            draw.polygon([(cx-22, 85), (cx+22, 85), (cx, 125)], fill=pal["eye"])

def draw_eyes_shocked(draw, pal, blink):
    """Big O-shaped eyes."""
    if blink:
        draw.line([(80, 95), (140, 95)], fill=pal["eye"], width=6)
        draw.line([(180, 95), (240, 95)], fill=pal["eye"], width=6)
    else:
        draw.ellipse([80, 55, 140, 130], outline=pal["eye"], width=8)
        draw.ellipse([180, 55, 240, 130], outline=pal["eye"], width=8)
        draw.ellipse([104, 82, 116, 94], fill=pal["eye"])
        draw.ellipse([204, 82, 216, 94], fill=pal["eye"])

def draw_eyes_dizzy(draw, pal, blink):
    """Spiral/X eyes."""
    if blink:
        draw.line([(80, 95), (140, 95)], fill=pal["eye"], width=6)
        draw.line([(180, 95), (240, 95)], fill=pal["eye"], width=6)
    else:
        for cx in [110, 210]:
            # X marks
            draw.line([(cx-20, 70), (cx+20, 120)], fill=pal["eye"], width=8)
            draw.line([(cx+20, 70), (cx-20, 120)], fill=pal["eye"], width=8)

def draw_eyes_cool(draw, pal, blink):
    """Sunglasses."""
    if blink:
        draw.line([(80, 92), (140, 92)], fill=pal["eye"], width=6)
        draw.line([(180, 92), (240, 92)], fill=pal["eye"], width=6)
    else:
        # Lenses
        draw_rounded_rect(draw, [75, 72, 145, 112], 10, (20, 20, 40))
        draw_rounded_rect(draw, [175, 72, 245, 112], 10, (20, 20, 40))
        # Bridge
        draw.line([(145, 88), (175, 88)], fill=pal["eye"], width=4)
        # Temples
        draw.line([(75, 82), (55, 78)], fill=pal["eye"], width=4)
        draw.line([(245, 82), (265, 78)], fill=pal["eye"], width=4)
        # Lens shine
        draw.line([(85, 80), (100, 80)], fill=(80, 80, 120), width=3)
        draw.line([(185, 80), (200, 80)], fill=(80, 80, 120), width=3)

EYE_DRAWERS = {
    "chill": draw_eyes_chill, "happy": draw_eyes_happy, "grumpy": draw_eyes_grumpy,
    "sleepy": draw_eyes_sleepy, "excited": draw_eyes_excited, "sad": draw_eyes_sad,
    "curious": draw_eyes_curious, "alert": draw_eyes_alert, "love": draw_eyes_love,
    "shocked": draw_eyes_shocked, "dizzy": draw_eyes_dizzy, "cool": draw_eyes_cool,
}

def draw_mouth(draw, pal, emo, talk="none"):
    """Draw the mouth based on emotion and talking state."""
    cx, cy = 160, 170
    mc = pal["mouth"]
    
    if talk == "open":
        draw.ellipse([cx-18, cy-12, cx+18, cy+12], fill=mc)
        return
    elif talk == "close":
        draw.line([(cx-15, cy), (cx+15, cy)], fill=mc, width=4)
        return
    
    if emo == "happy":
        draw.arc([cx-30, cy-15, cx+30, cy+15], start=0, end=180, fill=mc, width=6)
    elif emo == "grumpy":
        draw.arc([cx-20, cy-5, cx+20, cy+15], start=180, end=360, fill=mc, width=6)
    elif emo == "sad":
        draw.arc([cx-25, cy, cx+25, cy+20], start=180, end=360, fill=mc, width=6)
    elif emo == "shocked":
        draw.ellipse([cx-12, cy-10, cx+12, cy+10], outline=mc, width=5)
    elif emo == "excited":
        draw.arc([cx-25, cy-12, cx+25, cy+12], start=0, end=180, fill=mc, width=6)
        draw.line([(cx-20, cy+8), (cx+20, cy+8)], fill=mc, width=3)
    elif emo == "love":
        draw.arc([cx-20, cy-10, cx+20, cy+10], start=0, end=180, fill=mc, width=5)
    elif emo == "sleepy":
        draw.line([(cx-15, cy), (cx+15, cy)], fill=mc, width=4)
    elif emo == "dizzy":
        # Wavy mouth
        for x in range(-20, 21, 2):
            y_off = int(5 * math.sin(x * 0.5))
            draw.ellipse([cx+x-1, cy+y_off-1, cx+x+1, cy+y_off+1], fill=mc)
    else:
        # Default small smile
        draw.arc([cx-18, cy-8, cx+18, cy+8], start=10, end=170, fill=mc, width=4)

def draw_face_border(draw, pal):
    """Draw a subtle rounded face outline."""
    draw.rounded_rectangle([30, 20, 290, 220], radius=40, outline=pal["acc"], width=4)

def create_face(name, emo, blink=False, talk="none"):
    pal = PALETTES.get(emo, PALETTES["chill"])
    img = Image.new("RGB", (WIDTH, HEIGHT), pal["bg1"])
    draw = ImageDraw.Draw(img)
    
    # Gradient background
    gradient_bg(draw, WIDTH, HEIGHT, pal["bg1"], pal["bg2"])
    
    # Face border
    draw_face_border(draw, pal)
    
    # Eye glow
    if not blink:
        draw_glow(draw, 110, 90, 35, pal["eye"], 2)
        draw_glow(draw, 210, 90, 35, pal["eye"], 2)
    
    # Eyes
    eye_func = EYE_DRAWERS.get(emo, draw_eyes_chill)
    eye_func(draw, pal, blink)
    
    # Mouth
    draw_mouth(draw, pal, emo, talk)
    
    # NO flip — BMP is saved right-side-up for the ESP32
    img.save(f"sprites/{name}.bmp", format="BMP")

# ═══════════════════════════════════════
# Generate All Sprites
# ═══════════════════════════════════════
print("Generating sprites...")
emotions = ["alert", "chill", "cool", "curious", "dizzy", "excited", 
            "grumpy", "happy", "love", "sad", "shocked", "sleepy"]

for emo in emotions:
    create_face(emo, emo, blink=False)
    create_face(f"{emo}_blink", emo, blink=True)

# Talking frames (for all emotions)
for emo in emotions:
    create_face(f"{emo}_talk_open", emo, blink=False, talk="open")
    create_face(f"{emo}_talk_close", emo, blink=False, talk="close")

print(f"  -> {len(emotions) * 4} sprite files generated")

# ═══════════════════════════════════════
# Sound Generation
# ═══════════════════════════════════════
print("Generating sounds...")
SAMPLE_RATE = 16000

def generate_wav(filename, tone_funcs, duration_s):
    num_samples = int(SAMPLE_RATE * duration_s)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = sum(f(t) for f in tone_funcs)
        val = max(-1.0, min(1.0, val))
        samples.append(int(val * 32767))
    with wave.open(f"sounds/{filename}.wav", 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        for s in samples:
            wf.writeframes(struct.pack('h', s))

def sqr(freq, t): return 0.5 if math.sin(2 * math.pi * freq * t) > 0 else -0.5
def saw(freq, t): return 2.0 * (t * freq - math.floor(0.5 + t * freq))
def tri(freq, t): return 2.0 * abs(saw(freq, t)) - 1.0
def sine(freq, t): return math.sin(2 * math.pi * freq * t)

# Envelope helper: Attack-Decay-Sustain-Release
def adsr(t, a=0.02, d=0.1, s_level=0.6, r_start=None, r_len=0.1):
    if r_start and t > r_start:
        return max(0, s_level * (1 - (t - r_start) / r_len))
    if t < a: return t / a
    if t < a + d: return 1.0 - (1.0 - s_level) * ((t - a) / d)
    return s_level

# ── Core sounds ──
generate_wav("beep", [lambda t: sqr(880, t) * adsr(t, 0.01, 0.05, 0.3, 0.08, 0.02)], 0.12)

def startup_synth(t):
    if t < 0.15: return sqr(440, t) * adsr(t, 0.01, 0.05, 0.8) * 0.6
    elif t < 0.3: return sqr(554, t) * adsr(t-0.15, 0.01, 0.05, 0.8) * 0.6
    elif t < 0.5: return sqr(659, t) * adsr(t-0.3, 0.01, 0.1, 0.8) * 0.6
    elif t < 0.8: return sqr(880, t) * adsr(t-0.5, 0.01, 0.1, 0.9) * 0.7
    else: return sqr(880, t) * math.exp(-5*(t-0.8)) * 0.5
generate_wav("startup", [startup_synth], 1.2)

def levelup_synth(t):
    freq = 500 + min(600, t * 3000)
    return tri(freq, t) * adsr(t, 0.02, 0.15, 0.5, 0.8, 0.2) * 0.7
generate_wav("levelup", [levelup_synth], 1.0)
generate_wav("happy", [levelup_synth], 1.0)

generate_wav("horn", [lambda t: (saw(300, t) * 0.5 + saw(302, t) * 0.5) * adsr(t, 0.05, 0.1, 0.7, 0.8, 0.2)], 1.0)

def r2d2_synth(t):
    step = int(t * 18)
    freqs = [1200, 1600, 1900, 1100, 2100, 1400, 1800, 2400, 900]
    f = freqs[step % len(freqs)]
    return sine(f, t) * 0.5 * adsr(t, 0.005, 0.02, 0.6)
generate_wav("r2d2", [r2d2_synth], 0.7)

def siren_synth(t):
    freq = 600 + math.sin(2 * math.pi * 3 * t) * 250
    return sqr(freq, t) * 0.4 * adsr(t, 0.05, 0.1, 0.8, 1.5, 0.5)
generate_wav("siren", [siren_synth], 2.0)

def sneeze_synth(t):
    if t < 0.15: return tri(600 + t * 2000, t) * 0.6
    else: return (random.random() * 2 - 1) * math.exp(-12 * (t - 0.15)) * 0.7
generate_wav("sneeze", [sneeze_synth], 0.4)

def eat_synth(t):
    cycle = t % 0.08
    f = 400 - cycle * 3000
    return sqr(max(100, f), t) * 0.4 * adsr(t, 0.01, 0.02, 0.5)
generate_wav("eat", [eat_synth], 0.35)

def laugh_synth(t):
    f = 500 + math.sin(t * 35) * 120
    pulse = max(0, 1 - (t % 0.08) * 12)
    return tri(f, t) * pulse * 0.5
generate_wav("laugh", [laugh_synth], 0.6)

def melody_synth(t):
    notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 783.99, 659.25]
    idx = int(t * 5) % len(notes)
    return sine(notes[idx], t) * 0.6 * adsr(t, 0.02, 0.05, 0.7)
generate_wav("melody", [melody_synth], 1.5)

def purr_synth(t):
    f = 42 + math.sin(t * 8) * 6
    return (saw(f, t) * 0.25 + (random.random() * 0.08 - 0.04))
generate_wav("purr", [purr_synth], 2.5)

def snore_synth(t):
    phase = t % 2.5
    if phase < 1.2:
        return (random.random() * 0.25) * (phase / 1.2) * math.sin(t * 20) * 0.5
    else:
        return (random.random() * 0.25) * max(0, 1 - (phase - 1.2) / 1.3)
generate_wav("snore", [snore_synth], 5.0)

def whistle_synth(t):
    if t < 0.5: return sine(800 + t * 1200, t) * 0.5 * adsr(t, 0.05, 0.1, 0.8)
    else: return sine(1400 - (t - 0.5) * 600, t) * 0.5 * adsr(t - 0.5, 0.02, 0.1, 0.7, 0.4, 0.1)
generate_wav("whistle", [whistle_synth], 1.0)

# ── DJ Pad sounds (were missing as WAV files) ──
def kick_synth(t):
    freq = 150 * math.exp(-30 * t) + 40
    return sine(freq, t) * math.exp(-8 * t) * 0.9
generate_wav("kick", [kick_synth], 0.2)

def snare_synth(t):
    tone = sine(200, t) * math.exp(-20 * t) * 0.5
    noise = (random.random() * 2 - 1) * math.exp(-15 * t) * 0.7
    return tone + noise
generate_wav("snare", [snare_synth], 0.15)

def hihat_synth(t):
    return (random.random() * 2 - 1) * math.exp(-40 * t) * 0.5
generate_wav("hihat", [hihat_synth], 0.08)

def scratch_synth(t):
    freq = 1000 + math.sin(t * 80) * 500
    return sine(freq, t) * math.exp(-6 * t) * 0.5
generate_wav("scratch", [scratch_synth], 0.3)

count = len([f for f in os.listdir("sounds") if f.endswith(".wav")])
print(f"  -> {count} sound files generated")
print("Done! All media generated.")
