import os
import requests
import sys
import time

# Usage: python deploy_web.py <CORES3_IP>
# Deploys all files from web/, sprites/, and sounds/ to the CoreS3 SD card via HTTP upload

if len(sys.argv) < 2:
    IP = "buddy.local"
else:
    IP = sys.argv[1]

DIRS_TO_UPLOAD = {
    "web": "",
    "sprites": "sprites/",
    "sounds": "sounds/"
}

files_to_upload = []

for local_dir, remote_prefix in DIRS_TO_UPLOAD.items():
    if not os.path.exists(local_dir):
        continue
    for filename in os.listdir(local_dir):
        filepath = os.path.join(local_dir, filename)
        if os.path.isfile(filepath):
            remote_name = remote_prefix + filename
            files_to_upload.append((remote_name, filepath))

print(f"Deploying {len(files_to_upload)} files to {IP}...")
print("=" * 40)

success = 0
failed = 0

for remote_name, filepath in files_to_upload:
    size = os.path.getsize(filepath)
    print(f"  Uploading {remote_name} ({size:,} bytes)...", end=" ")
    with open(filepath, 'rb') as f:
        # ESP32 AsyncWebServer upload handler uses the filename parameter from Content-Disposition
        files = {'file': (remote_name, f)}
        try:
            res = requests.post(f"http://{IP}/api/upload", files=files, timeout=10)
            if res.status_code == 200:
                print("[OK]")
                success += 1
            else:
                print(f"[FAILED: {res.status_code}]")
                failed += 1
            time.sleep(0.5) # Give ESP32 time to write to SD
        except Exception as e:
            print(f"[ERROR: {e}]")
            failed += 1

print("=" * 40)
print(f"Deploy complete: {success} OK, {failed} FAILED")
if failed == 0:
    print("\nRefresh your browser to see the new UI!")
