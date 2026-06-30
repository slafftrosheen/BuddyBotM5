import os
import shutil

targets = {
    'core': 'm5stack-cores3',
    'sticks3': 'm5stack-sticks3',
    'cardputer': 'm5stack-cardputer'
}
dest_dir = "C:/Users/Slaff/BuddyBotM5/LatestBuilds"
os.makedirs(dest_dir, exist_ok=True)

for target, env in targets.items():
    build_dir = f"C:/Users/Slaff/BuddyBotM5/firmware/{target}/.pio/build/{env}"
    fw_src = f"{build_dir}/firmware.bin"
    fs_src = f"{build_dir}/littlefs.bin"
    boot_src = f"{build_dir}/bootloader.bin"
    part_src = f"{build_dir}/partitions.bin"
    
    fw_dest = f"{dest_dir}/BuddyBot_{target}_firmware.bin"
    fs_dest = f"{dest_dir}/BuddyBot_{target}_littlefs.bin"
    merged_dest = f"{dest_dir}/BuddyBot_{target}_merged.bin"
    
    # 1. Copy LittleFS if it exists
    if os.path.exists(fs_src):
        shutil.copy(fs_src, fs_dest)
        print(f"Copied {fs_dest}")
    else:
        print(f"Missing {fs_src}")
        
    # 2. Merge bins
    if os.path.exists(fw_src) and os.path.exists(boot_src) and os.path.exists(part_src):
        # Read the bins
        with open(boot_src, "rb") as f: boot_data = f.read()
        with open(part_src, "rb") as f: part_data = f.read()
        with open(fw_src, "rb") as f: fw_data = f.read()
        
        # ESP32-S3 default offsets
        boot_offset = 0x0000
        part_offset = 0x8000
        fw_offset = 0x10000
        
        # Calculate total size and create a buffer filled with 0xFF
        total_size = fw_offset + len(fw_data)
        merged_data = bytearray(b'\xff' * total_size)
        
        # Insert the bins into the buffer
        merged_data[boot_offset:boot_offset+len(boot_data)] = boot_data
        merged_data[part_offset:part_offset+len(part_data)] = part_data
        merged_data[fw_offset:fw_offset+len(fw_data)] = fw_data
        
        with open(merged_dest, "wb") as f:
            f.write(merged_data)
            
        print(f"Created Merged Bin: {merged_dest}")
    else:
        print(f"Missing components for {target} merged bin.")
        # Fallback to copy firmware only
        if os.path.exists(fw_src):
            shutil.copy(fw_src, fw_dest)
            print(f"Copied fallback {fw_dest}")
