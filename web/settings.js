// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — SETTINGS & CONFIGURATION
// ═══════════════════════════════════════════════════════

// Exported for app.js to call after loading config
window.populateSettings = function() {
    if (!window.state || !window.state.config) return;
    
    const cfg = window.state.config;
    
    // Network
    document.getElementById('cfg-ssid1').value = cfg.wifi_ssid1 || '';
    document.getElementById('cfg-cam-ip').value = cfg.cam_ip || '';
    document.getElementById('cfg-pi-host').value = cfg.pi_hostname || '';
    
    // API Keys
    document.getElementById('cfg-gemini-key').value = cfg.geminiApiKey || '';
    
    // Motors
    document.getElementById('trim-left').value = cfg.motorTrimL || 0;
    document.getElementById('trim-left-val').textContent = cfg.motorTrimL || 0;
    document.getElementById('trim-right').value = cfg.motorTrimR || 0;
    document.getElementById('trim-right-val').textContent = cfg.motorTrimR || 0;
    
    setToggleState(document.getElementById('cfg-invert-l'), cfg.motorInvertL);
    setToggleState(document.getElementById('cfg-invert-r'), cfg.motorInvertR);
    
    // Persona
    document.getElementById('eye-color').value = cfg.eyeColorHex || '#00f3ff';
    document.getElementById('eye-size').value = cfg.eyeSize || 30;
    document.getElementById('blink-rate').value = cfg.blinkRate || 3000;
    
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
            cam_ip: document.getElementById('cfg-cam-ip').value,
            pi_hostname: document.getElementById('cfg-pi-host').value,
            
            motorTrimL: parseInt(document.getElementById('trim-left').value),
            motorTrimR: parseInt(document.getElementById('trim-right').value),
            motorInvertL: getToggleState(document.getElementById('cfg-invert-l')),
            motorInvertR: getToggleState(document.getElementById('cfg-invert-r')),
            
            eyeColorHex: document.getElementById('eye-color').value,
            eyeSize: parseInt(document.getElementById('eye-size').value),
            blinkRate: parseInt(document.getElementById('blink-rate').value),
            
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
                if (window.showAlert) window.showAlert('CONFIG SAVED TO SD', 'var(--accent-green)');
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
    ['eye-color', 'eye-size', 'blink-rate'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            // Wait for slider to be released before sending
            fetch('/api/persona', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eyeColor: document.getElementById('eye-color').value,
                    eyeSize: parseInt(document.getElementById('eye-size').value),
                    blinkRate: parseInt(document.getElementById('blink-rate').value)
                })
            }).catch(()=>{});
        });
    });

});
