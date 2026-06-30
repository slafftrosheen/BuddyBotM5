import os

api_path = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/api.cpp"
with open(api_path, 'r', encoding='utf-8') as f:
    api_data = f.read()

init_wifi_code = """
extern WiFiMulti wifiMulti;

void initWiFi() {
    WiFi.mode(WIFI_STA);
    if (buddyConfig.wifiSSID.length() > 0) {
        wifiMulti.addAP(buddyConfig.wifiSSID.c_str(), buddyConfig.wifiPass.c_str());
        M5.Display.println("Connecting to WiFi...");
        int attempts = 0;
        while(wifiMulti.run() != WL_CONNECTED && attempts < 20) {
            delay(500);
            M5.Display.print(".");
            attempts++;
        }
        M5.Display.println("");
        if(WiFi.status() == WL_CONNECTED) {
            M5.Display.print("Connected! IP: ");
            M5.Display.println(WiFi.localIP());
        } else {
            M5.Display.println("WiFi Failed.");
        }
    }
}
"""

if 'void initWiFi()' not in api_data:
    api_data += "\n" + init_wifi_code + "\n"
    with open(api_path, 'w', encoding='utf-8') as f:
        f.write(api_data)

api_h_path = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/api.h"
with open(api_h_path, 'r', encoding='utf-8') as f:
    api_h_data = f.read()
if 'void initWiFi();' not in api_h_data:
    api_h_data += "\nvoid initWiFi();\n"
    with open(api_h_path, 'w', encoding='utf-8') as f:
        f.write(api_h_data)

print("Added initWiFi to api.cpp and api.h")
