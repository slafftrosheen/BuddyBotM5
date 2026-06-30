import os

targets = ['core', 'sticks3', 'cardputer']
for t in targets:
    path = f"c:/Users/Slaff/BuddyBotM5/firmware/{t}/platformio.ini"
    if not os.path.exists(path): continue
    with open(path, 'r', encoding='utf-8') as f:
        data = f.read()
        
    if 'lib_extra_dirs' not in data:
        data = data.replace('build_flags =', 'lib_extra_dirs = ../shared/lib\nbuild_flags =')
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)

print("Updated platformio.ini files")
