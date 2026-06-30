import os

js_path = "C:/Users/Slaff/BuddyBotM5/web/settings.js"
with open(js_path, 'r', encoding='utf-8') as f:
    data = f.read()

# 1. Add loading logic for Sleep Schedule
load_old = '''        // Appearance
        if(document.getElementById('cfg-volume')) document.getElementById('cfg-volume').value = data.speakerVolume;'''
load_new = '''        // Appearance
        if(document.getElementById('cfg-volume')) document.getElementById('cfg-volume').value = data.speakerVolume;
        
        // Sleep Schedule
        if(document.getElementById('cfg-sleep-time') && data.sleepStartH !== undefined) {
            let sh = data.sleepStartH.toString().padStart(2, '0');
            let sm = data.sleepStartM.toString().padStart(2, '0');
            document.getElementById('cfg-sleep-time').value = ${sh}:;
        }
        if(document.getElementById('cfg-wake-time') && data.wakeStartH !== undefined) {
            let wh = data.wakeStartH.toString().padStart(2, '0');
            let wm = data.wakeStartM.toString().padStart(2, '0');
            document.getElementById('cfg-wake-time').value = ${wh}:;
        }'''
data = data.replace(load_old, load_new)

# 2. Add saving logic for Sleep Schedule
save_old = '''    // Global Save Everything
    document.getElementById('btn-save-config')?.addEventListener('click', () => {
        state.config.wifi_ssid1 = document.getElementById('cfg-ssid1')?.value || "";'''
save_new = '''    // Global Save Everything
    document.getElementById('btn-save-config')?.addEventListener('click', () => {
        state.config.wifi_ssid1 = document.getElementById('cfg-ssid1')?.value || "";
        
        const st = document.getElementById('cfg-sleep-time')?.value.split(':') || ['22','00'];
        const wt = document.getElementById('cfg-wake-time')?.value.split(':') || ['07','00'];
        state.config.sleepStartH = parseInt(st[0]);
        state.config.sleepStartM = parseInt(st[1]);
        state.config.wakeStartH = parseInt(wt[0]);
        state.config.wakeStartM = parseInt(wt[1]);'''
data = data.replace(save_old, save_new)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(data)

print("Updated settings.js")
