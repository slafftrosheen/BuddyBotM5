// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — CORE APP CONTROLLER
// Handles config, connection, and tab switching
// ═══════════════════════════════════════════════════════

const state = {
    connected: false,
    config: {
        buildTier: 0,
        motorTrimL: 0,
        motorTrimR: 0,
        servoInvert: [],
        camFlip: false,
        camMirror: false,
        piHostname: 'buddybrain'
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
            
            // Start Cam Stream if Tier >= 1 (Pro or Max)
            if (data.buildTier >= 1) {
                const img = document.getElementById('cam-stream');
                img.src = `http://buddycam.local:81/stream`;
                if (data.camFlip) img.style.transform += ' scaleY(-1)';
                if (data.camMirror) img.style.transform += ' scaleX(-1)';
                document.getElementById('cam-status').textContent = 'LIVE';
                document.getElementById('cam-status').style.background = 'var(--accent-green)';
                document.getElementById('cam-status').style.color = '#000';
            }
        })
        .catch(err => console.error("Failed to load config", err));

    function applyTierVisibility() {
        const tier = state.config.buildTier;
        // Tier 0 (Lite): Home, Drive, Play, Buddy, Settings
        // Tier 1 (Pro): + Hardware
        // Tier 2 (Max): + AI
        
        if (tier >= 1) {
            document.querySelectorAll('.tier-pro').forEach(el => el.style.setProperty('display', 'flex', 'important'));
        }
        if (tier >= 2) {
            document.querySelectorAll('.tier-max').forEach(el => el.style.setProperty('display', 'flex', 'important'));
        }
        
        const tierNames = ["LITE", "PRO", "MAX"];
        document.getElementById('build-tier').textContent = `Tier: ${tierNames[tier] || 'UNKNOWN'}`;
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
