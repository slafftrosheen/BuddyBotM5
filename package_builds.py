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
    
    fw_dest = f"{dest_dir}/BuddyBot_{target}_firmware.bin"
    fs_dest = f"{dest_dir}/BuddyBot_{target}_littlefs.bin"
    
    if os.path.exists(fw_src):
        shutil.copy(fw_src, fw_dest)
        print(f"Copied {fw_dest}")
    else:
        print(f"Missing {fw_src}")
        
    if os.path.exists(fs_src):
        shutil.copy(fs_src, fs_dest)
        print(f"Copied {fs_dest}")
    else:
        print(f"Missing {fs_src}")
