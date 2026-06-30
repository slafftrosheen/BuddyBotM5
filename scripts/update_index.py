import os

html_path = "C:/Users/Slaff/BuddyBotM5/web/index.html"
with open(html_path, 'r', encoding='utf-8') as f:
    data = f.read()

# 1. Update Sensors Tab (Replace progress bars with Canvas)
sensors_old = '''            <div class="card">
                <div class="card-header"><span>?? Sensors</span></div>
                <div class="sensor-grid">
                    <div class="sensor-item">
                        <span class="sensor-icon">??</span>
                        <span class="sensor-val" id="val-batt">--%</span>
                        <div class="sensor-bar-track"><div class="sensor-bar" id="bar-batt" style="width:0%"></div></div>
                    </div>
                    <div class="sensor-item">
                        <span class="sensor-icon">???</span>
                        <span class="sensor-val" id="val-temp">--?C</span>
                        <div class="sensor-bar-track"><div class="sensor-bar" id="bar-temp" style="width:0%"></div></div>
                    </div>
                    <div class="sensor-item">
                        <span class="sensor-icon">??</span>
                        <span class="sensor-val" id="val-hum">--%</span>
                        <div class="sensor-bar-track"><div class="sensor-bar" id="bar-hum" style="width:0%"></div></div>
                    </div>
                    <div class="sensor-item">
                        <span class="sensor-icon">??</span>
                        <span class="sensor-val" id="val-pres">--hPa</span>
                        <div class="sensor-bar-track"><div class="sensor-bar" id="bar-pres" style="width:0%"></div></div>
                    </div>
                    <div class="sensor-item">
                        <span class="sensor-icon">??</span>
                        <span class="sensor-val" id="val-gas">--K?</span>
                        <div class="sensor-bar-track"><div class="sensor-bar" id="bar-gas" style="width:0%"></div></div>
                    </div>
                    <div class="sensor-item">
                        <span class="sensor-icon">??</span>
                        <span class="sensor-val" id="val-roll">--?</span>
                        <div class="sensor-bar-track"><div class="sensor-bar imu" id="bar-roll" style="width:50%"></div></div>
                    </div>
                    <div class="sensor-item">
                        <span class="sensor-icon">??</span>
                        <span class="sensor-val" id="val-pitch">--?</span>
                        <div class="sensor-bar-track"><div class="sensor-bar imu" id="bar-pitch" style="width:50%"></div></div>
                    </div>
                </div>
            </div>'''

sensors_new = '''            <div class="card">
                <div class="card-header"><span>?? Sensor Telemetry</span></div>
                <div style="display:flex; flex-direction:column; gap:15px; padding:10px;">
                    <div>
                        <div style="display:flex; justify-content:space-between;"><span>?? Battery & ??? Temp</span><span id="val-batt">--%</span></div>
                        <canvas id="chart-batt" width="300" height="80" style="width:100%; height:80px; background:rgba(0,0,0,0.2); border-radius:8px;"></canvas>
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between;"><span>?? Pitch & ?? Roll</span><span id="val-pitch">--?</span></div>
                        <canvas id="chart-imu" width="300" height="80" style="width:100%; height:80px; background:rgba(0,0,0,0.2); border-radius:8px;"></canvas>
                    </div>
                    <div class="sensor-grid" style="margin-top:10px;">
                        <div class="sensor-item"><span class="sensor-icon">??</span><span class="sensor-val" id="val-hum">--%</span></div>
                        <div class="sensor-item"><span class="sensor-icon">??</span><span class="sensor-val" id="val-pres">--hPa</span></div>
                        <div class="sensor-item"><span class="sensor-icon">??</span><span class="sensor-val" id="val-gas">--K?</span></div>
                    </div>
                </div>
            </div>'''
data = data.replace(sensors_old, sensors_new)

# 2. Add Sleep Schedule to Appearance Card
appearance_old = '''                    <div class="form-row">
                        <label>Speaker Volume</label>
                        <input type="range" id="cfg-volume" min="0" max="255" value="128">
                    </div>
                </div>
            </div>

            <div class="settings-actions">'''
            
appearance_new = '''                    <div class="form-row">
                        <label>Speaker Volume</label>
                        <input type="range" id="cfg-volume" min="0" max="255" value="128">
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span>?? Sleep Schedule (RTC)</span></div>
                <div class="settings-form">
                    <p style="font-size:0.8rem; color:#aaa; margin-top:0;">BuddyBot will enter deep sleep, stop moving, and show circadian eye bags during this window.</p>
                    <div class="form-row">
                        <label>Sleep Time</label>
                        <input type="time" id="cfg-sleep-time" value="22:00" style="background:#2c3e50; color:white; border:none; padding:5px; border-radius:5px;">
                    </div>
                    <div class="form-row">
                        <label>Wake Time</label>
                        <input type="time" id="cfg-wake-time" value="07:00" style="background:#2c3e50; color:white; border:none; padding:5px; border-radius:5px;">
                    </div>
                    <button class="save-btn" onclick="document.getElementById('btn-save-config').click()">Save Schedule</button>
                </div>
            </div>

            <div class="settings-actions">'''
data = data.replace(appearance_old, appearance_new)


# 3. Add Keybinds & IR to Settings
settings_old = '''            <div class="card">
                <div class="card-header"><span>?? Hardware</span></div>'''

settings_new = '''            <div class="card">
                <div class="card-header"><span>?? IR Remote (Cardputer)</span></div>
                <div class="settings-form">
                    <div class="form-row">
                        <input type="text" id="ir-label" placeholder="Button Name (e.g. TV Power)" style="width:100%; margin-bottom:5px;">
                        <input type="text" id="ir-protocol" placeholder="Protocol (e.g. NEC)" style="width:48%;">
                        <input type="text" id="ir-hex" placeholder="Hex Code (e.g. 0xFF00FF)" style="width:48%; float:right;">
                    </div>
                    <button class="save-btn" onclick="addIrButton()" style="margin-bottom:10px;">+ Add Button</button>
                    <div id="ir-button-list" style="display:flex; flex-direction:column; gap:5px;">
                        <!-- dynamic ir buttons -->
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span>?? Keybinds (Cardputer)</span></div>
                <div class="settings-form">
                    <div class="form-row">
                        <input type="text" id="kb-key" placeholder="Key (e.g. w)" style="width:20%; margin-bottom:5px;" maxlength="1">
                        <input type="text" id="kb-action" placeholder="API Path (e.g. /api/action?cmd=treat)" style="width:75%; float:right;">
                    </div>
                    <button class="save-btn" onclick="addKeybind()" style="margin-bottom:10px;">+ Add Keybind</button>
                    <div id="kb-button-list" style="display:flex; flex-direction:column; gap:5px;">
                        <!-- dynamic keybinds -->
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span>?? Hardware</span></div>'''
data = data.replace(settings_old, settings_new)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(data)

print("Updated index.html")
