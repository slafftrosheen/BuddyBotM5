import os
import re

targets = ['core', 'sticks3', 'cardputer']
for t in targets:
    # 1. Update config.h
    h_path = f"c:/Users/Slaff/BuddyBotM5/firmware/{t}/src/config.h"
    if os.path.exists(h_path):
        with open(h_path, 'r', encoding='utf-8') as f:
            data_h = f.read()
            
        if "int sleepStartH;" not in data_h:
            # Add to the end of the struct
            # Find the line "int fireGasThreshold;"
            new_fields = '''    int fireGasThreshold;
    
    // ?? Sleep Schedule ??
    int sleepStartH;
    int sleepStartM;
    int wakeStartH;
    int wakeStartM;'''
            data_h = data_h.replace('    int fireGasThreshold;', new_fields)
            with open(h_path, 'w', encoding='utf-8') as f:
                f.write(data_h)

    # 2. Update config.cpp
    cpp_path = f"c:/Users/Slaff/BuddyBotM5/firmware/{t}/src/config.cpp"
    if os.path.exists(cpp_path):
        with open(cpp_path, 'r', encoding='utf-8') as f:
            data_c = f.read()
            
        if "buddyConfig.sleepStartH" not in data_c:
            # defaults
            new_defaults = '''    buddyConfig.fireGasThreshold = 10000;
            
    buddyConfig.sleepStartH = 22; // 10 PM
    buddyConfig.sleepStartM = 0;
    buddyConfig.wakeStartH = 7;   // 7 AM
    buddyConfig.wakeStartM = 0;'''
            data_c = data_c.replace('    buddyConfig.fireGasThreshold = 10000;', new_defaults)
            
            # configLoad
            new_load = '''    if (!doc["fireGasThreshold"].isNull()) buddyConfig.fireGasThreshold = doc["fireGasThreshold"];
            
    if (!doc["sleepStartH"].isNull()) buddyConfig.sleepStartH = doc["sleepStartH"];
    if (!doc["sleepStartM"].isNull()) buddyConfig.sleepStartM = doc["sleepStartM"];
    if (!doc["wakeStartH"].isNull()) buddyConfig.wakeStartH = doc["wakeStartH"];
    if (!doc["wakeStartM"].isNull()) buddyConfig.wakeStartM = doc["wakeStartM"];'''
            data_c = data_c.replace('    if (!doc["fireGasThreshold"].isNull()) buddyConfig.fireGasThreshold = doc["fireGasThreshold"];', new_load)
            
            # configSave
            new_save = '''    doc["fireGasThreshold"] = buddyConfig.fireGasThreshold;
            
    doc["sleepStartH"] = buddyConfig.sleepStartH;
    doc["sleepStartM"] = buddyConfig.sleepStartM;
    doc["wakeStartH"] = buddyConfig.wakeStartH;
    doc["wakeStartM"] = buddyConfig.wakeStartM;'''
            data_c = data_c.replace('    doc["fireGasThreshold"] = buddyConfig.fireGasThreshold;', new_save)
            
            with open(cpp_path, 'w', encoding='utf-8') as f:
                f.write(data_c)

print("Updated config.h and config.cpp for all targets.")
