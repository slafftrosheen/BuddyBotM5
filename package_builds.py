import os
import shutil
import subprocess

# Targets with filesystem (Web UI) - build both firmware and LittleFS
fs_targets = {
    'core': 'm5stack-cores3',
    'sticks3': 'm5stack-sticks3',
    'cardputer': 'm5stack-cardputer',
    'cardputer_adv': 'm5stack-cardputer-adv'
}

# Targets without filesystem (no Web UI) - build firmware only
no_fs_targets = {
    'cam': 'm5stack-atoms3'
}

# Verified partition offsets for LittleFS (fallback)
FALLBACK_OFFSETS = {
    'core': '0xc90000',      # m5stack-cores3 (16MB default_16MB.csv)
    'sticks3': '0x670000',   # m5stack-sticks3 (8MB default_8MB.csv)
    'cardputer': '0x670000', # m5stack-cardputer (8MB default_8MB.csv)
    'cardputer_adv': '0x670000' # m5stack-cardputer-adv (8MB default_8MB.csv)
}

base_dir = os.path.dirname(os.path.abspath(__file__))
dest_dir = os.path.join(base_dir, "LatestBuilds")
os.makedirs(dest_dir, exist_ok=True)

# Helper to find .platformio paths
def find_pio_resources():
    user_home = os.path.expanduser("~")
    pio_dir = os.path.join(user_home, ".platformio")
    penv_python = os.path.join(pio_dir, "penv", "Scripts", "python.exe")
    if not os.path.exists(penv_python):
        penv_python = "python"
        
    boot_app0 = None
    gen_esp32part = None
    
    packages_dir = os.path.join(pio_dir, "packages")
    if os.path.exists(packages_dir):
        for root, dirs, files in os.walk(packages_dir):
            if "boot_app0.bin" in files and not boot_app0:
                boot_app0 = os.path.join(root, "boot_app0.bin")
            if "gen_esp32part.py" in files and not gen_esp32part:
                gen_esp32part = os.path.join(root, "gen_esp32part.py")
            if boot_app0 and gen_esp32part:
                break
                
    if not boot_app0:
        boot_app0 = os.path.join(pio_dir, "packages", "framework-arduinoespressif32", "tools", "partitions", "boot_app0.bin")
    if not gen_esp32part:
        gen_esp32part = os.path.join(pio_dir, "packages", "framework-arduinoespressif32", "tools", "gen_esp32part.py")
        
    return penv_python, gen_esp32part, boot_app0

# Helper to get LittleFS/SPIFFS offset dynamically from partitions.bin
def get_fs_offset(penv_python, gen_esp32part_py, partitions_bin_path, target_name):
    if not os.path.exists(partitions_bin_path) or not os.path.exists(gen_esp32part_py):
        print(f"  Warning: Cannot parse partition.bin dynamically (missing path). Using fallback.")
        return FALLBACK_OFFSETS.get(target_name)
        
    try:
        result = subprocess.run(
            [penv_python, gen_esp32part_py, partitions_bin_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        for line in result.stdout.splitlines():
            # Lines look like: name, type, subtype, offset, size, flags
            if "spiffs" in line or "littlefs" in line:
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 4:
                    offset = parts[3]
                    print(f"  Parsed filesystem offset from partitions.bin: {offset}")
                    return offset
    except Exception as e:
        print(f"  Warning: Failed to parse partitions.bin dynamically ({e}). Using fallback.")
        
    return FALLBACK_OFFSETS.get(target_name)

penv_python, gen_esp32part_py, boot_app0_bin = find_pio_resources()
print(f"Found PIO resources:")
print(f"  Python: {penv_python}")
print(f"  gen_esp32part: {gen_esp32part_py}")
print(f"  boot_app0.bin: {boot_app0_bin}")

# Build targets with filesystem (Web UI + LittleFS)
for target, env in fs_targets.items():
    print(f"\n==========================================")
    print(f"--- Building for {target} ({env}) ---")
    print(f"==========================================")
    firmware_dir = os.path.join(base_dir, "firmware", target)
    
    # 1. Compile web bundle if build_bundle.py exists in target data directory
    data_dir = os.path.join(firmware_dir, "data")
    build_bundle_py = os.path.join(data_dir, "build_bundle.py")
    if os.path.exists(build_bundle_py):
        print(f"Compiling Web UI JS bundle for {target}...")
        result = subprocess.run([penv_python, "build_bundle.py"], cwd=data_dir)
        if result.returncode != 0:
            print(f"  WARNING: Web UI bundle build failed for {target}, continuing...")

    # 2. Build filesystem (Web UI assets -> LittleFS)
    print(f"Building LittleFS partition for {target}...")
    result = subprocess.run(["pio", "run", "-t", "buildfs"], cwd=firmware_dir)
    if result.returncode != 0:
        print(f"  ERROR: Failed to build filesystem for {target}")
        continue
    
    # 3. Build firmware
    print(f"Building firmware for {target}...")
    result = subprocess.run(["pio", "run"], cwd=firmware_dir)
    if result.returncode != 0:
        print(f"  ERROR: Failed to build firmware for {target}")
        continue

    build_dir = os.path.join(firmware_dir, ".pio", "build", env)
    
    parts = {
        "firmware.bin": f"BuddyBot_{target}_firmware.bin",
        "littlefs.bin": f"BuddyBot_{target}_littlefs.bin",
        "bootloader.bin": f"BuddyBot_{target}_bootloader.bin",
        "partitions.bin": f"BuddyBot_{target}_partitions.bin"
    }

    print(f"Copying individual binaries for {target}...")
    for src_name, dest_name in parts.items():
        src_path = os.path.join(build_dir, src_name)
        dest_path = os.path.join(dest_dir, dest_name)
        if os.path.exists(src_path):
            shutil.copy(src_path, dest_path)
            print(f"  Copied {dest_name} to LatestBuilds")
        else:
            print(f"  WARNING: Missing {src_name}")

    # 4. Generate the merged complete binary
    bootloader_path = os.path.join(build_dir, "bootloader.bin")
    partitions_path = os.path.join(build_dir, "partitions.bin")
    firmware_path = os.path.join(build_dir, "firmware.bin")
    littlefs_path = os.path.join(build_dir, "littlefs.bin")
    
    if os.path.exists(bootloader_path) and os.path.exists(partitions_path) and os.path.exists(firmware_path) and os.path.exists(littlefs_path):
        print(f"Generating single merged binary for {target}...")
        fs_offset = get_fs_offset(penv_python, gen_esp32part_py, partitions_path, target)
        
        if fs_offset:
            merged_bin_name = f"BuddyBot_{target}_merged.bin"
            merged_bin_path = os.path.join(dest_dir, merged_bin_name)
            
            # Prepare esptool merge_bin command
            cmd = [
                penv_python, "-m", "esptool", "--chip", "esp32s3", "merge_bin",
                "-o", merged_bin_path,
                "--flash_mode", "keep", "--flash_size", "keep", "--flash_freq", "keep",
                "0x0", bootloader_path,
                "0x8000", partitions_path
            ]
            
            # Include boot_app0 if found
            if boot_app0_bin and os.path.exists(boot_app0_bin):
                cmd.extend(["0xe000", boot_app0_bin])
                
            # Add application and filesystem
            cmd.extend([
                "0x10000", firmware_path,
                fs_offset, littlefs_path
            ])
            
            # Run merge command
            merge_result = subprocess.run(cmd)
            if merge_result.returncode == 0:
                print(f"  SUCCESS: Created complete merged binary: {merged_bin_name}")
            else:
                print(f"  ERROR: esptool merge_bin failed for {target}")
        else:
            print(f"  ERROR: Could not determine filesystem offset for {target}, skipping merge.")
    else:
        print(f"  ERROR: Missing necessary binary components for {target} merging.")

# Build targets without filesystem (firmware only)
for target, env in no_fs_targets.items():
    print(f"\n==========================================")
    print(f"--- Building for {target} ({env}) ---")
    print(f"==========================================")
    firmware_dir = os.path.join(base_dir, "firmware", target)
    
    # Build firmware only (no filesystem)
    print(f"Building firmware for {target}...")
    result = subprocess.run(["pio", "run"], cwd=firmware_dir)
    if result.returncode != 0:
        print(f"  ERROR: Failed to build firmware for {target}")
        continue

    build_dir = os.path.join(firmware_dir, ".pio", "build", env)
    
    parts = {
        "firmware.bin": f"BuddyBot_{target}_firmware.bin",
        "bootloader.bin": f"BuddyBot_{target}_bootloader.bin",
        "partitions.bin": f"BuddyBot_{target}_partitions.bin"
    }

    print(f"Copying individual binaries for {target}...")
    for src_name, dest_name in parts.items():
        src_path = os.path.join(build_dir, src_name)
        dest_path = os.path.join(dest_dir, dest_name)
        if os.path.exists(src_path):
            shutil.copy(src_path, dest_path)
            print(f"  Copied {dest_name} to LatestBuilds")
        else:
            print(f"  WARNING: Missing {src_name}")

    # Generate merged binary (no littlefs)
    bootloader_path = os.path.join(build_dir, "bootloader.bin")
    partitions_path = os.path.join(build_dir, "partitions.bin")
    firmware_path = os.path.join(build_dir, "firmware.bin")
    
    if os.path.exists(bootloader_path) and os.path.exists(partitions_path) and os.path.exists(firmware_path):
        print(f"Generating single merged binary for {target} (no filesystem)...")
        merged_bin_name = f"BuddyBot_{target}_merged.bin"
        merged_bin_path = os.path.join(dest_dir, merged_bin_name)
        
        # Prepare command
        cmd = [
            penv_python, "-m", "esptool", "--chip", "esp32s3", "merge_bin",
            "-o", merged_bin_path,
            "--flash_mode", "keep", "--flash_size", "keep", "--flash_freq", "keep",
            "0x0", bootloader_path,
            "0x8000", partitions_path
        ]
        
        # Include boot_app0 if found
        if boot_app0_bin and os.path.exists(boot_app0_bin):
            cmd.extend(["0xe000", boot_app0_bin])
            
        # Add application
        cmd.extend(["0x10000", firmware_path])
        
        # Run merge command
        merge_result = subprocess.run(cmd)
        if merge_result.returncode == 0:
            print(f"  SUCCESS: Created complete merged binary: {merged_bin_name}")
        else:
            print(f"  ERROR: esptool merge_bin failed for {target}")
    else:
        print(f"  ERROR: Missing necessary binary components for {target} merging.")

print("\n==========================================")
print("All builds completed!")
print("The contents of LatestBuilds are ready:")
for f in sorted(os.listdir(dest_dir)):
    size_kb = os.path.getsize(os.path.join(dest_dir, f)) / 1024
    print(f"  - {f} ({size_kb:.1f} KB)")
print("==========================================")
