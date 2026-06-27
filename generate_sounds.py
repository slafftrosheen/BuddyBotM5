import os
import wave
import struct
import math

if not os.path.exists("sounds"):
    os.makedirs("sounds")

def generate_tone(filename, freq, duration_sec):
    sample_rate = 16000
    num_samples = int(sample_rate * duration_sec)
    
    with wave.open(f"sounds/{filename}.wav", "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            value = int(32767.0 * math.sin(2.0 * math.pi * freq * (i / float(sample_rate))))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)
    
    print(f"Generated sounds/{filename}.wav")

sounds = [
    ("beep", 1000, 0.2),
    ("siren", 800, 1.0),
    ("laugh", 400, 0.5),
    ("horn", 200, 0.8),
    ("r2d2", 2500, 0.3),
    ("melody", 600, 0.5),
    ("eat", 300, 0.4),
    ("purr", 150, 2.0),
    ("sneeze", 1500, 0.2),
    ("whistle", 1800, 0.6),
    ("snore", 100, 1.5),
    ("startup", 800, 0.8),
    ("levelup", 1200, 0.5)
]

for s in sounds:
    generate_tone(s[0], s[1], s[2])
