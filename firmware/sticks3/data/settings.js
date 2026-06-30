// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — SETTINGS & CONFIGURATION
// ═══════════════════════════════════════════════════════

// Exported for app.js to call after loading config

function rgb565ToHex(rgb565) {
    if (rgb565 === undefined) return '#000000';
    let r = (rgb565 >> 11) & 0x1F;
    let g = (rgb565 >> 5) & 0x3F;
    let b = rgb565 & 0x1F;
    r = (r << 3) | (r >> 2);
    g = (g << 2) | (g >> 4);
    b = (b << 3) | (b >> 2);
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb565(hex) {
    hex = hex.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16) || 0;
    let g = parseInt(hex.substring(2, 4), 16) || 0;
    let b = parseInt(hex.substring(4, 6), 16) || 0;
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

window.populateSettings = function() {
    if (!window.state || !window.state.config) return;
    
    const cfg = window.state.config;
    
    // Network
    document.getElementById('cfg-ssid1').value = cfg.wifi_ssid1 || '';
    document.getElementById('cfg-camip').value = cfg.camIp || '';
    if (document.getElementById('cfg-piip')) document.getElementById('cfg-piip').value = cfg.piIp || '';
    
    // Hardware State
    if (document.getElementById('cfg-has-cam')) setToggleState(document.getElementById('cfg-has-cam'), cfg.hasCam);
    if (document.getElementById('cfg-has-servo')) setToggleState(document.getElementById('cfg-has-servo'), cfg.hasServo);
    if (document.getElementById('cfg-has-pi')) setToggleState(document.getElementById('cfg-has-pi'), cfg.hasPi);
    if (document.getElementById('cfg-screen-rotation')) document.getElementById('cfg-screen-rotation').value = cfg.screenRotation || 0;
    
    // API Keys
    document.getElementById('cfg-gemini-key').value = cfg.geminiApiKey || '';
    
    // Servos
    if (cfg.servoInvert) {
        for (let i = 0; i < 8; i++) {
            if (document.getElementById('cfg-inv-s' + i)) {
                setToggleState(document.getElementById('cfg-inv-s' + i), cfg.servoInvert[i]);
            }
        }
    }
    
    // Motors
    document.getElementById('trim-left').value = cfg.motorTrimL || 0;
    document.getElementById('trim-left-val').textContent = cfg.motorTrimL || 0;
    document.getElementById('trim-right').value = cfg.motorTrimR || 0;
    document.getElementById('trim-right-val').textContent = cfg.motorTrimR || 0;
    
    setToggleState(document.getElementById('cfg-invert-l'), cfg.motorInvertL);
    setToggleState(document.getElementById('cfg-invert-r'), cfg.motorInvertR);

    // Drive Hardware
    if (document.getElementById('cfg-drive-type')) {
        document.getElementById('cfg-drive-type').value = cfg.driveType || 0;
        document.getElementById('cfg-drive-chl').value = cfg.driveChannelL || 0;
        document.getElementById('cfg-drive-chr').value = cfg.driveChannelR || 1;
        document.getElementById('cfg-drive-pl1').value = cfg.drivePinL1 || 1;
        document.getElementById('cfg-drive-pl2').value = cfg.drivePinL2 || 2;
        document.getElementById('cfg-drive-pr1').value = cfg.drivePinR1 || 3;
        document.getElementById('cfg-drive-pr2').value = cfg.drivePinR2 || 4;
        document.getElementById('cfg-pwm-freq').value = cfg.pwmFreq || 50;
        document.getElementById('cfg-pwm-min').value = cfg.pwmMin || 500;
        document.getElementById('cfg-pwm-max').value = cfg.pwmMax || 2500;
        document.getElementById('cfg-center-offset-l').value = cfg.driveCenterOffsetL || 0;
        document.getElementById('cfg-center-offset-r').value = cfg.driveCenterOffsetR || 0;
        if (document.getElementById('cfg-ttl-tx')) {
            document.getElementById('cfg-ttl-tx').value = cfg.ttlServoTx || 17;
            document.getElementById('cfg-ttl-rx').value = cfg.ttlServoRx || 16;
            document.getElementById('cfg-ttl-idl').value = cfg.ttlServoLeftId || 1;
            document.getElementById('cfg-ttl-idr').value = cfg.ttlServoRightId || 2;
        }
        
        // Trigger visual update
        document.getElementById('cfg-drive-type').dispatchEvent(new Event('change'));
    }

    
    // Persona
    document.getElementById('blink-rate').value = cfg.blinkRate || 3000;
    
    // New Persona configs
    if (document.getElementById('eye-w')) {
        document.getElementById('eye-w').value = cfg.eyeSizeX || 72;
        document.getElementById('val-eye-w').textContent = cfg.eyeSizeX || 72;
        document.getElementById('eye-h').value = cfg.eyeSizeY || 72;
        document.getElementById('val-eye-h').textContent = cfg.eyeSizeY || 72;
        document.getElementById('eye-fps').value = cfg.eyeFps || 60;
        document.getElementById('val-eye-fps').textContent = cfg.eyeFps || 60;
        document.getElementById('eye-color-main').value = rgb565ToHex(cfg.eyeColorMain);
        document.getElementById('eye-color-bg').value = rgb565ToHex(cfg.eyeColorBg);
        if (document.getElementById('persona-type')) document.getElementById('persona-type').value = cfg.personaType || 0;
        if (document.getElementById('has-cheeks')) setToggleState(document.getElementById('has-cheeks'), cfg.hasCheeks);
        if (document.getElementById('cheek-color')) document.getElementById('cheek-color').value = rgb565ToHex(cfg.cheekColor);
        if (document.getElementById('mouth-type')) document.getElementById('mouth-type').value = cfg.mouthType || 0;
        if (document.getElementById('mouth-color')) document.getElementById('mouth-color').value = rgb565ToHex(cfg.mouthColor);
        if (document.getElementById('mouth-w')) {
            document.getElementById('mouth-w').value = cfg.mouthSizeX || 30;
            document.getElementById('val-mouth-w').textContent = cfg.mouthSizeX || 30;
            document.getElementById('mouth-h').value = cfg.mouthSizeY || 10;
            document.getElementById('val-mouth-h').textContent = cfg.mouthSizeY || 10;
        }
    }
    
    // Misc
    setToggleState(document.getElementById('cam-flip'), cfg.camFlip);
    setToggleState(document.getElementById('cam-mirror'), cfg.camMirror);
    document.getElementById('cfg-volume').value = cfg.speakerVolume || 128;
};

function setToggleState(btn, state) {
    if (!btn) return;
    if (state) {
        btn.classList.add('active');
        btn.textContent = 'ON';
    } else {
        btn.classList.remove('active');
        btn.textContent = 'OFF';
    }
}

function getToggleState(btn) {
    return btn ? btn.classList.contains('active') : false;
}

document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════
    // TUNING CONFIG (Phase 5)
    // ═══════════════════════════════════════
    const cfgImpact = document.getElementById('cfg-impact');
    const valImpact = document.getElementById('val-impact');
    if (cfgImpact) {
        cfgImpact.addEventListener('input', e => valImpact.innerText = parseFloat(e.target.value).toFixed(1));
    }

    const cfgFireTemp = document.getElementById('cfg-fire-temp');
    const valFireTemp = document.getElementById('val-fire-temp');
    if (cfgFireTemp) {
        cfgFireTemp.addEventListener('input', e => valFireTemp.innerText = parseFloat(e.target.value).toFixed(1));
    }

    const cfgCvEdge = document.getElementById('cfg-cv-edge');
    const valCvEdge = document.getElementById('val-cv-edge');
    if (cfgCvEdge) {
        cfgCvEdge.addEventListener('input', e => valCvEdge.innerText = e.target.value);
    }

    const cfgCvArea = document.getElementById('cfg-cv-area');
    const valCvArea = document.getElementById('val-cv-area');
    if (cfgCvArea) {
        cfgCvArea.addEventListener('input', e => valCvArea.innerText = e.target.value);
    }

    // Load CV Tuning from Pi
    function loadCvTuning() {
        const piHost = (state.config.piIp && state.config.piIp.trim() !== '') ? state.config.piIp : '192.168.8.175';
        fetch(`http://${piHost}:8000/api/cv/tune`)
            .then(res => res.json())
            .then(data => {
                if (cfgCvEdge && data.fall_edge_density_threshold) {
                    cfgCvEdge.value = data.fall_edge_density_threshold;
                    valCvEdge.innerText = data.fall_edge_density_threshold;
                }
                if (cfgCvArea && data.track_min_area) {
                    cfgCvArea.value = data.track_min_area;
                    valCvArea.innerText = data.track_min_area;
                }
            })
            .catch(err => console.log('CV Tuning load failed:', err));
    }
    
    // Save Tuning
    document.getElementById('btn-save-tuning')?.addEventListener('click', () => {
        // 1. Save ESP32 Hardware Tuning
        if (cfgImpact) state.config.impactThresholdG = parseFloat(cfgImpact.value);
        if (cfgFireTemp) state.config.fireTempThreshold = parseFloat(cfgFireTemp.value);
        
        fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.config)
        }).then(() => {
            if (window.showAlert) window.showAlert('ESP32 Tuning Saved!', 'var(--accent-green)');
        });

        // 2. Save Pi CV Tuning
        const piHost = (state.config.piIp && state.config.piIp.trim() !== '') ? state.config.piIp : '192.168.8.175';
        fetch(`http://${piHost}:8000/api/cv/tune`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fall_edge_density_threshold: parseInt(cfgCvEdge.value),
                track_min_area: parseInt(cfgCvArea.value)
            })
        }).then(() => {
            if (window.showAlert) window.showAlert('CV Tuning Saved!', 'var(--accent-blue)');
        }).catch(err => console.log('CV Tuning save failed:', err));
    });


    // Range Sliders display update (Persona)
    document.getElementById('eye-w')?.addEventListener('input', (e) => {
        document.getElementById('val-eye-w').textContent = e.target.value;
    });
    document.getElementById('eye-h')?.addEventListener('input', (e) => {
        document.getElementById('val-eye-h').textContent = e.target.value;
    });
    document.getElementById('eye-fps')?.addEventListener('input', (e) => {
        document.getElementById('val-eye-fps').textContent = e.target.value;
    });
    document.getElementById('mouth-w')?.addEventListener('input', (e) => {
        document.getElementById('val-mouth-w').textContent = e.target.value;
    });
    document.getElementById('mouth-h')?.addEventListener('input', (e) => {
        document.getElementById('val-mouth-h').textContent = e.target.value;
    });

    // Save Persona Button
    document.getElementById('btn-save-persona')?.addEventListener('click', () => {
        const payload = {
            eyeSizeX: parseInt(document.getElementById('eye-w').value),
            eyeSizeY: parseInt(document.getElementById('eye-h').value),
            eyeFps: parseInt(document.getElementById('eye-fps').value),
            eyeColorMain: hexToRgb565(document.getElementById('eye-color-main').value),
            eyeColorBg: hexToRgb565(document.getElementById('eye-color-bg').value),
            personaType: parseInt(document.getElementById('persona-type') ? document.getElementById('persona-type').value : 0),
            hasCheeks: document.getElementById('has-cheeks') ? getToggleState(document.getElementById('has-cheeks')) : false,
            cheekColor: hexToRgb565(document.getElementById('cheek-color').value),
            mouthType: parseInt(document.getElementById('mouth-type') ? document.getElementById('mouth-type').value : 0),
            mouthColor: hexToRgb565(document.getElementById('mouth-color').value),
            mouthSizeX: parseInt(document.getElementById('mouth-w') ? document.getElementById('mouth-w').value : 30),
            mouthSizeY: parseInt(document.getElementById('mouth-h') ? document.getElementById('mouth-h').value : 10)
        };

        fetch('/api/config', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        }).then(res => {
            if(res.ok) {
                if (typeof showAlert === 'function') showAlert('Appearance Saved!', '#32CD32');
            }
        });
    });

    // Range Sliders display update
    document.getElementById('trim-left')?.addEventListener('input', (e) => {
        document.getElementById('trim-left-val').textContent = e.target.value;
    });
    document.getElementById('trim-right')?.addEventListener('input', (e) => {
        document.getElementById('trim-right-val').textContent = e.target.value;
    });

    // Toggle Buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.currentTarget;
            if (el.classList.contains('active')) {
                setToggleState(el, false);
            } else {
                setToggleState(el, true);
            }
        });
    });

    // Drive Type change listener
    document.getElementById('cfg-drive-type')?.addEventListener('change', (e) => {
        const type = parseInt(e.target.value);
        document.querySelectorAll('.drive-cfg-8servo').forEach(el => el.style.display = (type === 1) ? 'flex' : 'none');
        document.querySelectorAll('.drive-cfg-gpio').forEach(el => el.style.display = (type === 2 || type === 3) ? 'flex' : 'none');
        document.querySelectorAll('.drive-cfg-hbridge').forEach(el => el.style.display = (type === 3) ? 'flex' : 'none');
        if (document.getElementById('row-ttl-pins')) document.getElementById('row-ttl-pins').style.display = (type === 4) ? 'flex' : 'none';
        if (document.getElementById('row-ttl-ids')) document.getElementById('row-ttl-ids').style.display = (type === 4) ? 'flex' : 'none';
        const rowCenter = document.getElementById('row-center-offset');
        if (rowCenter) rowCenter.style.display = (type === 1 || type === 2 || type === 4) ? 'flex' : 'none';
    });

    // Save Button
    document.getElementById('btn-save-config')?.addEventListener('click', () => {
        const payload = {
            hasCam: document.getElementById('cfg-has-cam') ? getToggleState(document.getElementById('cfg-has-cam')) : false,
            hasServo: document.getElementById('cfg-has-servo') ? getToggleState(document.getElementById('cfg-has-servo')) : false,
            hasPi: document.getElementById('cfg-has-pi') ? getToggleState(document.getElementById('cfg-has-pi')) : false,
            
            servoInvert: Array.from({length: 8}, (_, i) => getToggleState(document.getElementById('cfg-inv-s' + i))),
            motorTrimL: parseInt(document.getElementById('trim-left').value),
            motorTrimR: parseInt(document.getElementById('trim-right').value),
            motorInvertL: getToggleState(document.getElementById('cfg-invert-l')),
            motorInvertR: getToggleState(document.getElementById('cfg-invert-r')),
            
            blinkRate: parseInt(document.getElementById('blink-rate').value),
            personaType: parseInt(document.getElementById('cfg-persona-type') ? document.getElementById('cfg-persona-type').value : 0),
            
            camFlip: getToggleState(document.getElementById('cam-flip')),
            camMirror: getToggleState(document.getElementById('cam-mirror')),
            speakerVolume: parseInt(document.getElementById('cfg-volume').value),
            
            driveType: parseInt(document.getElementById('cfg-drive-type') ? document.getElementById('cfg-drive-type').value : 0),
            driveChannelL: parseInt(document.getElementById('cfg-drive-chl') ? document.getElementById('cfg-drive-chl').value : 0),
            driveChannelR: parseInt(document.getElementById('cfg-drive-chr') ? document.getElementById('cfg-drive-chr').value : 1),
            drivePinL1: parseInt(document.getElementById('cfg-drive-pl1') ? document.getElementById('cfg-drive-pl1').value : 1),
            drivePinL2: parseInt(document.getElementById('cfg-drive-pl2') ? document.getElementById('cfg-drive-pl2').value : 2),
            drivePinR1: parseInt(document.getElementById('cfg-drive-pr1') ? document.getElementById('cfg-drive-pr1').value : 3),
            drivePinR2: parseInt(document.getElementById('cfg-drive-pr2') ? document.getElementById('cfg-drive-pr2').value : 4),
            pwmFreq: parseInt(document.getElementById('cfg-pwm-freq') ? document.getElementById('cfg-pwm-freq').value : 50),
            pwmMin: parseInt(document.getElementById('cfg-pwm-min') ? document.getElementById('cfg-pwm-min').value : 500),
            pwmMax: parseInt(document.getElementById('cfg-pwm-max') ? document.getElementById('cfg-pwm-max').value : 2500),
            driveCenterOffsetL: parseInt(document.getElementById('cfg-center-offset-l') ? document.getElementById('cfg-center-offset-l').value : 0),
            driveCenterOffsetR: parseInt(document.getElementById('cfg-center-offset-r') ? document.getElementById('cfg-center-offset-r').value : 0),
            screenRotation: parseInt(document.getElementById('cfg-screen-rotation') ? document.getElementById('cfg-screen-rotation').value : 0),
            ttlServoTx: parseInt(document.getElementById('cfg-ttl-tx') ? document.getElementById('cfg-ttl-tx').value : 17),
            ttlServoRx: parseInt(document.getElementById('cfg-ttl-rx') ? document.getElementById('cfg-ttl-rx').value : 16),
            ttlServoLeftId: parseInt(document.getElementById('cfg-ttl-idl') ? document.getElementById('cfg-ttl-idl').value : 1),
            ttlServoRightId: parseInt(document.getElementById('cfg-ttl-idr') ? document.getElementById('cfg-ttl-idr').value : 2)
        };

        const ssid1 = document.getElementById('cfg-ssid1').value;
        if (ssid1 && ssid1.trim() !== '') payload.wifi_ssid1 = ssid1.trim();

        const camIp = document.getElementById('cfg-camip').value;
        if (camIp && camIp.trim() !== '') payload.camIp = camIp.trim();

        const piIpEl = document.getElementById('cfg-piip');
        if (piIpEl && piIpEl.value.trim() !== '') payload.piIp = piIpEl.value.trim();

        const pass1 = document.getElementById('cfg-pass1').value;
        if (pass1 && pass1 !== '' && !pass1.includes('●●●')) {
            payload.wifi_pass1 = pass1;
        }

        const geminiKey = document.getElementById('cfg-gemini-key').value;
        if (geminiKey && geminiKey !== '' && !geminiKey.includes('****')) {
            payload.geminiApiKey = geminiKey;
        }

        fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (res.ok) {
                if (window.showAlert) window.showAlert('CONFIG SAVED', 'var(--accent-green)');
                // Update local state
                if (window.state) window.state.config = { ...window.state.config, ...payload };
            } else {
                if (window.showAlert) window.showAlert('SAVE FAILED', 'var(--accent-pink)');
            }
        })
        .catch(() => {
            if (window.showAlert) window.showAlert('NETWORK ERROR', 'var(--accent-pink)');
        });
    });

    // Reboot Button
    document.getElementById('btn-reboot')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to reboot BuddyBot?')) {
            fetch('/api/reboot', { method: 'POST' }).catch(()=>{});
            if (window.showAlert) window.showAlert('REBOOTING...', 'var(--accent-blue)');
            setTimeout(() => { location.reload(); }, 3000);
        }
    });

    // Live Persona Preview
    ['blink-rate'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            // Wait for slider to be released before sending
            fetch('/api/persona', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blinkRate: parseInt(document.getElementById('blink-rate').value)
                })
            }).catch(()=>{});
        });
    });

});
