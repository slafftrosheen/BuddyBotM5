import os
import requests
import sys

# Usage: python deploy_web.py <CORES3_IP>
# Deploys all files from web/ directory to the CoreS3 SD card via HTTP upload

if len(sys.argv) < 2:
    print("Usage: python deploy_web.py <CORES3_IP>")
    sys.exit(1)

IP = sys.argv[1]
WEB_DIR = "web"

files_to_upload = []
for filename in os.listdir(WEB_DIR):
    filepath = os.path.join(WEB_DIR, filename)
    if os.path.isfile(filepath):
        files_to_upload.append((filename, filepath))

print(f"Deploying {len(files_to_upload)} files to {IP}...")
print("=" * 40)

success = 0
failed = 0

for filename, filepath in files_to_upload:
    size = os.path.getsize(filepath)
    print(f"  Uploading {filename} ({size:,} bytes)...", end=" ")
    with open(filepath, 'rb') as f:
        files = {'file': (filename, f)}
        try:
            res = requests.post(f"http://{IP}/api/upload", files=files, timeout=10)
            if res.status_code == 200:
                print("[OK]")
                success += 1
            else:
                print(f"[FAILED: {res.status_code}]")
                failed += 1
        except Exception as e:
            print(f"[ERROR: {e}]")
            failed += 1

print("=" * 40)
print(f"Deploy complete: {success} OK, {failed} FAILED")
if failed == 0:
    print("\nRefresh your browser to see the new UI!")
