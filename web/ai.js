// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — AI LAB CONTROLLER (Max Tier)
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ── Voice Assistant Trigger ──
    const btnVoice = document.getElementById('btn-voice-cmd');
    if (btnVoice) {
        btnVoice.addEventListener('click', () => {
            // In v3.0, voice is handled by Pi Zero natively when the physical button is pressed,
            // or we can ping the Pi's API to start listening if it has a mic.
            showAlert('Press the button on BuddyBot to talk!', 'var(--accent-blue)');
        });
    }

    // ── AI Toggles ──
    function toggleAIState(btn, stateVar, onText, offText, onColor, onAlert) {
        window.aiState = window.aiState || {};
        window.aiState[stateVar] = !window.aiState[stateVar];
        
        if (window.aiState[stateVar]) {
            btn.classList.add('active');
            btn.style.background = onColor;
            btn.style.borderColor = onColor;
            btn.innerHTML = onText;
            if (onAlert && window.showAlert) window.showAlert(onAlert, onColor);
        } else {
            btn.classList.remove('active');
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.innerHTML = offText;
        }
        return window.aiState[stateVar];
    }

    document.getElementById('btn-auto-nav')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'autoNav', '🛑 Stop Nav', '🛣️ Auto-Navigate', 'var(--accent-blue)', 'AUTO-NAV ENGAGED');
        if (active) fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 6 }) }).catch(()=>{}); // Curious
        else fetch('/api/motors', { method: 'POST', body: JSON.stringify({ speed: 0, turn: 0 }) }).catch(()=>{});
    });

    document.getElementById('btn-face-track')?.addEventListener('click', (e) => {
        toggleAIState(e.currentTarget, 'faceTrack', '🛑 Stop Tracking', '👤 Face Follow', 'var(--accent-pink)', 'FACE TRACKING ON');
    });

    document.getElementById('btn-color-track')?.addEventListener('click', (e) => {
        toggleAIState(e.currentTarget, 'colorTrack', '🛑 Stop Fetch', '🎾 Fetch Color', 'var(--accent-green)', 'FETCH MODE ON');
    });

    document.getElementById('btn-guard-mode')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'guardMode', '🛑 Stop Guarding', '🛡️ Guard Mode', '#ff3b3b', 'GUARD MODE ARMED');
        if (active) fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 7 }) }).catch(()=>{}); // Alert
    });

    document.getElementById('btn-sleep-cycle')?.addEventListener('click', (e) => {
        toggleAIState(e.currentTarget, 'sleepCycle', '🛑 Wake Up', '💤 Sleep Timer', 'var(--accent-purple)', 'SLEEP MODE ON');
    });

    document.getElementById('btn-qr-scan')?.addEventListener('click', (e) => {
        toggleAIState(e.currentTarget, 'qrScan', '🛑 Stop Scanner', '📷 QR Scanner', 'var(--accent-yellow)', 'SCANNER ACTIVE');
    });

    let sentryStep = 0;
    document.getElementById('btn-sentry-patrol')?.addEventListener('click', (e) => {
        sentryStep = (sentryStep + 1) % 3;
        const btn = e.currentTarget;
        
        if (sentryStep === 0) {
            btn.classList.remove('active');
            btn.style.background = '';
            btn.innerHTML = '👮 Sentry Patrol';
            if (window.showAlert) window.showAlert('PATROL CANCELLED', 'var(--accent-pink)');
        } else if (sentryStep === 1) {
            btn.classList.add('active');
            btn.style.background = 'var(--accent-pink)';
            btn.innerHTML = '🔴 Recording Route...';
            if (window.showAlert) window.showAlert('RECORDING ROUTE. DRIVE NOW.', 'var(--accent-pink)');
        } else if (sentryStep === 2) {
            btn.style.background = 'var(--accent-green)';
            btn.innerHTML = '▶️ Playing Route';
            if (window.showAlert) window.showAlert('AUTO-PATROL ENGAGED', 'var(--accent-green)');
        }
    });

    // ── YOLO Vision (Pi Zero API Call) ──
    let yoloInterval = null;
    document.getElementById('btn-yolo-vision')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'yoloVision', '🛑 Stop YOLO', '👁️ YOLO Vision', 'rgba(255,0,255,0.5)', 'YOLO VISION ACTIVE');
        
        if (active) {
            // Periodically ping Pi Zero for bounding boxes
            yoloInterval = setInterval(() => {
                fetch(`http://buddybrain.local:8000/api/detect`, { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        // In future, draw bounding boxes on canvas overlay
                        console.log("YOLO Detections:", data);
                    })
                    .catch(()=>{});
            }, 1000);
        } else {
            clearInterval(yoloInterval);
        }
    });

});
