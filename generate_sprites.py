from PIL import Image, ImageDraw
import os

# 320x240, 16-bit or 24-bit RGB BMPs
WIDTH = 320
HEIGHT = 240
BG_COLOR = (26, 26, 46) # dark blue background (from style.css)
EYE_COLOR = (15, 155, 255) # accent blue

if not os.path.exists("sprites"):
    os.makedirs("sprites")

def create_base():
    img = Image.new('RGB', (WIDTH, HEIGHT), color=BG_COLOR)
    return img, ImageDraw.Draw(img)

def save_sprite(img, name):
    img.save(f"sprites/{name}.bmp")
    print(f"Saved {name}.bmp")

# 1. CHILL
img, draw = create_base()
draw.ellipse([80, 80, 120, 120], fill=EYE_COLOR)
draw.ellipse([200, 80, 240, 120], fill=EYE_COLOR)
draw.rectangle([140, 170, 180, 175], fill=EYE_COLOR)
save_sprite(img, "chill")

# CHILL BLINK
img, draw = create_base()
draw.rectangle([80, 100, 120, 105], fill=EYE_COLOR)
draw.rectangle([200, 100, 240, 105], fill=EYE_COLOR)
draw.rectangle([140, 170, 180, 175], fill=EYE_COLOR)
save_sprite(img, "chill_blink")

# CHILL TALK OPEN
img, draw = create_base()
draw.ellipse([80, 80, 120, 120], fill=EYE_COLOR)
draw.ellipse([200, 80, 240, 120], fill=EYE_COLOR)
draw.ellipse([140, 160, 180, 190], fill=EYE_COLOR)
save_sprite(img, "chill_talk_open")

# CHILL TALK CLOSE
img, draw = create_base()
draw.ellipse([80, 80, 120, 120], fill=EYE_COLOR)
draw.ellipse([200, 80, 240, 120], fill=EYE_COLOR)
draw.rectangle([140, 170, 180, 180], fill=EYE_COLOR)
save_sprite(img, "chill_talk_close")

# 2. HAPPY
img, draw = create_base()
draw.arc([80, 80, 120, 120], 180, 360, fill=EYE_COLOR, width=10)
draw.arc([200, 80, 240, 120], 180, 360, fill=EYE_COLOR, width=10)
draw.arc([130, 150, 190, 190], 0, 180, fill=EYE_COLOR, width=10)
save_sprite(img, "happy")
img, draw = create_base()
draw.arc([80, 100, 120, 110], 180, 360, fill=EYE_COLOR, width=5)
draw.arc([200, 100, 240, 110], 180, 360, fill=EYE_COLOR, width=5)
draw.arc([130, 150, 190, 190], 0, 180, fill=EYE_COLOR, width=10)
save_sprite(img, "happy_blink")

# We will just duplicate chill for the others to save time for this demo script
emotions = ["grumpy", "sleepy", "excited", "sad", "curious", "alert", "love", "shocked", "dizzy", "cool"]
for emo in emotions:
    # Just draw chill for now, the user can replace them later or I can expand the script
    img, draw = create_base()
    draw.ellipse([80, 80, 120, 120], fill=EYE_COLOR)
    draw.ellipse([200, 80, 240, 120], fill=EYE_COLOR)
    draw.text((120, 30), emo.upper(), fill=(255,255,255))
    save_sprite(img, emo)
    img, draw = create_base()
    draw.rectangle([80, 100, 120, 105], fill=EYE_COLOR)
    draw.rectangle([200, 100, 240, 105], fill=EYE_COLOR)
    draw.text((120, 30), emo.upper(), fill=(255,255,255))
    save_sprite(img, f"{emo}_blink")
