import os

targets = ['core', 'sticks3', 'cardputer']

for t in targets:
    path = f"c:/Users/Slaff/BuddyBotM5/firmware/{t}/src/main.cpp"
    if not os.path.exists(path): continue
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    skip = False
    for line in lines:
        if 'RollerCAN I2C Protocol' in line:
            skip = True
        
        if 'void setup()' in line:
            skip = False
            
        if not skip:
            new_lines.append(line)
            
    # Also replace #include <M5CoreS3.h> with #include <M5Unified.h>
    for i, line in enumerate(new_lines):
        if '#include <M5CoreS3.h>' in line:
            new_lines[i] = '#include <M5Unified.h>\n'
        elif '#include "persona.h"' in line:
            # insert our new includes here
            new_lines.insert(i+1, '#include "motor.h"\n#include "api.h"\n')
            break
            
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

print("Cleaned up main.cpp across all targets")
