import os

api_path = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/api.cpp"
with open(api_path, 'r', encoding='utf-8') as f:
    api_data = f.read()

if '<ArduinoOTA.h>' not in api_data:
    api_data = api_data.replace('#include <Update.h>', '#include <Update.h>\n#include <ArduinoOTA.h>')
    with open(api_path, 'w', encoding='utf-8') as f:
        f.write(api_data)

print("Fixed OTA include")
