// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — CORE APP CONTROLLER
// Handles config, connection, and tab switching
// ═══════════════════════════════════════════════════════

const state = {
    connected: false,
    config: {
        hasServo: false,
        hasCam: false,
        hasPi: false,
        motorTrimL: 0,
        motorTrimR: 0,
        servoInvert: [],
        camFlip: false,
        camMirror: false
    }
};

function showAlert(msg, color = 'var(--accent-pink)') {
    const banner = document.getElementById('sys-alert');
    banner.textContent = msg;
    banner.style.background = color;
    banner.style.display = 'block';
    
    // Reset animation
    banner.style.animation = 'none';
    banner.offsetHeight; /* trigger reflow */
    banner.style.animation = null;
    
    setTimeout(() => { banner.style.display = 'none'; }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    
    // ── 1. LOAD CONFIG ──
    fetch('/api/config')
        .then(res => res.json())
        .then(data => {
            state.config = data;
            applyTierVisibility();
            populateSettings();
            
            // Start Cam Stream (always try, handled gracefully if offline)
            {
                const img = document.getElementById('cam-stream');
                const camHost = (data.camIp && data.camIp.trim() !== '') ? data.camIp : 'buddycam.local';
                img.src = `http://${camHost}/stream`;
                img.onerror = () => {
                    document.getElementById('cam-status').textContent = 'OFFLINE';
                    document.getElementById('cam-status').style.background = '#ff3b3b';
                    document.getElementById('cam-status').style.color = '#fff';
                };
                if (data.camFlip) img.style.transform += ' scaleY(-1)';
                if (data.camMirror) img.style.transform += ' scaleX(-1)';
                document.getElementById('cam-status').textContent = 'LIVE';
                document.getElementById('cam-status').style.background = 'var(--accent-green)';
                document.getElementById('cam-status').style.color = '#000';
            }
        })
        .catch(err => console.error("Failed to load config", err));

    function applyTierVisibility() {
        // Show/hide based on detected components
        if (state.config.hasServo) {
            document.querySelectorAll('.tier-pro').forEach(el => el.style.setProperty('display', 'flex', 'important'));
        }
        if (state.config.hasPi) {
            document.querySelectorAll('.tier-max').forEach(el => el.style.setProperty('display', 'flex', 'important'));
        }
        
        // Build a dynamic hardware string
        let hw = [];
        hw.push("Core");
        if (state.config.hasServo) hw.push("Servo");
        if (state.config.hasPi) hw.push("Pi");
        document.getElementById('build-tier').textContent = `HW: ${hw.join(' + ')}`;
    }

    // ── 2. TAB NAVIGATION ──
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.classList.add('active');
            
            // Play subtle UI sound if available
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
                audio.volume = 0.2;
                audio.play().catch(()=>{});
            } catch(e){}
        });
    });

    // ── 3. TELEMETRY POLLING ──
    setInterval(() => {
        fetch('/api/telemetry')
            .then(res => res.json())
            .then(data => {
                if (!state.connected) {
                    state.connected = true;
                    document.getElementById('conn-dot').className = 'status-dot online';
                    document.getElementById('conn-text').textContent = 'Online';
                }
                
                // Update Sensors (Buddy Tab)
                if (data.battery !== undefined) {
                    document.getElementById('val-batt').textContent = `${data.battery}%`;
                    document.getElementById('bar-batt').style.width = `${data.battery}%`;
                }
                document.getElementById('val-temp').textContent = `${data.temp.toFixed(1)}°C`;
                document.getElementById('bar-temp').style.width = `${Math.min(100, data.temp * 2)}%`;
                
                document.getElementById('val-hum').textContent = `${data.hum.toFixed(0)}%`;
                document.getElementById('bar-hum').style.width = `${data.hum}%`;
                
                document.getElementById('val-pres').textContent = `${data.pres.toFixed(0)}hPa`;
                
                document.getElementById('val-gas').textContent = `${(data.gas / 1000).toFixed(1)}KΩ`;
                document.getElementById('bar-gas').style.width = `${Math.min(100, data.gas / 5000)}%`;
                
                document.getElementById('val-roll').textContent = `${data.roll.toFixed(0)}°`;
                document.getElementById('bar-roll').style.width = `${50 + (data.roll / 180 * 50)}%`;
                
                document.getElementById('val-pitch').textContent = `${data.pitch.toFixed(0)}°`;
                document.getElementById('bar-pitch').style.width = `${50 + (data.pitch / 180 * 50)}%`;

                // Update Footer
                document.getElementById('heap-info').textContent = `Mem: ${(data.heap / 1024).toFixed(0)}KB`;
                document.getElementById('wifi-rssi').textContent = `Signal: ${data.rssi}dBm`;
                
                // Uptime
                const uptimeEl = document.getElementById('uptime-info');
                if (uptimeEl && data.uptime) {
                    const m = Math.floor(data.uptime / 60);
                    const s = data.uptime % 60;
                    uptimeEl.textContent = `Up: ${m}m${s}s`;
                }
            })
            .catch(() => {
                if (state.connected) {
                    state.connected = false;
                    document.getElementById('conn-dot').className = 'status-dot offline';
                    document.getElementById('conn-text').textContent = 'Offline';
                    showAlert('Connection Lost', '#ff3b3b');
                }
            });
    }, 3000);

});
