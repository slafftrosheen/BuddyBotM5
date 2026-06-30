import os
import shutil

web_dir = 'C:/Users/Slaff/BuddyBotM5/web'
targets = ['core', 'sticks3', 'cardputer', 'cardputer_adv']

if not os.path.exists(web_dir):
    print(f"Error: {web_dir} not found")
    exit(1)

for target in targets:
    data_dir = f"C:/Users/Slaff/BuddyBotM5/firmware/{target}/data"
    
    # Create or clean data dir
    if os.path.exists(data_dir):
        shutil.rmtree(data_dir)
    os.makedirs(data_dir, exist_ok=True)
    
    # Copy all files from web to data
    for item in os.listdir(web_dir):
        s = os.path.join(web_dir, item)
        d = os.path.join(data_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)
            
    print(f"Synced {web_dir} -> {data_dir}")
