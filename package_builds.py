import os
import shutil
import subprocess

targets = {
    'core': 'm5stack-cores3',
    'sticks3': 'm5stack-sticks3',
    'cardputer': 'm5stack-cardputer'
}

base_dir = os.path.dirname(os.path.abspath(__file__))
dest_dir = os.path.join(base_dir, "LatestBuilds")
os.makedirs(dest_dir, exist_ok=True)

for target, env in targets.items():
    print(f"--- Building for {target} ---")
    firmware_dir = os.path.join(base_dir, "firmware", target)
    
    # 1. Build filesystem
    print(f"Building LittleFS for {target}...")
    subprocess.run(["pio", "run", "-t", "buildfs"], cwd=firmware_dir)
    
    # 2. Build firmware
    print(f"Building firmware for {target}...")
    subprocess.run(["pio", "run"], cwd=firmware_dir)

    build_dir = os.path.join(firmware_dir, ".pio", "build", env)
    
    parts = {
        "firmware.bin": f"BuddyBot_{target}_firmware.bin",
        "littlefs.bin": f"BuddyBot_{target}_littlefs.bin",
        "bootloader.bin": f"BuddyBot_{target}_bootloader.bin",
        "partitions.bin": f"BuddyBot_{target}_partitions.bin"
    }

    print(f"Packaging bins for {target}...")
    for src_name, dest_name in parts.items():
        src_path = os.path.join(build_dir, src_name)
        dest_path = os.path.join(dest_dir, dest_name)
        if os.path.exists(src_path):
            shutil.copy(src_path, dest_path)
            print(f"  Copied {dest_name}")
        else:
            print(f"  WARNING: Missing {src_name}")

print("\nAll done! Upload the contents of LatestBuilds to GitHub Releases for the Web Flasher.")
