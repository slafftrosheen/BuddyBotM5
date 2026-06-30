import os

targets = ['core', 'sticks3', 'cardputer']
for t in targets:
    path = f"c:/Users/Slaff/BuddyBotM5/firmware/{t}/src/main.cpp"
    if not os.path.exists(path): continue
    with open(path, 'r', encoding='utf-8') as f:
        data = f.read()
    
    if 'M5.Display.setRotation(buddyConfig.screenRotation);' not in data:
        data = data.replace('M5.begin();', 'M5.begin();\n    M5.Display.setRotation(buddyConfig.screenRotation);')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(data)

print("Injected setRotation")
