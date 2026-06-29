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

    // Save Persona Button
    document.getElementById('btn-save-persona')?.addEventListener('click', () => {
        const payload = {
            eyeSizeX: parseInt(document.getElementById('eye-w').value),
            eyeSizeY: parseInt(document.getElementById('eye-h').value),
            eyeFps: parseInt(document.getElementById('eye-fps').value),
            eyeColorMain: hexToRgb565(document.getElementById('eye-color-main').value),
            eyeColorBg: hexToRgb565(document.getElementById('eye-color-bg').value)
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

    // Save Button
    document.getElementById('btn-save-config')?.addEventListener('click', () => {
        const payload = {
            wifi_ssid1: document.getElementById('cfg-ssid1').value,
            camIp: document.getElementById('cfg-camip').value,
            piIp: document.getElementById('cfg-piip') ? document.getElementById('cfg-piip').value : '',
            
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
            speakerVolume: parseInt(document.getElementById('cfg-volume').value)
        };

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
