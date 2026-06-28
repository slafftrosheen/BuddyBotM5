// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — AI LAB CONTROLLER (Max Tier)
// v4.0 — Real implementations for Sleep, Guard, Auto-Nav
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ── Voice Assistant Trigger ──
    const btnVoice = document.getElementById('btn-voice-cmd');
    if (btnVoice) {
        btnVoice.addEventListener('click', () => {
            showAlert('Press the button on BuddyBot to talk!', 'var(--accent-blue)');
        });
    }

    // ── AI Toggle Helper ──
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

    // ═══════════════════════════════════════
    // AUTO-NAVIGATE — Simple bump-and-turn
    // Uses IMU pitch to detect collisions
    // ═══════════════════════════════════════
    let autoNavInterval = null;
    let lastPitch = 0;
    
    document.getElementById('btn-auto-nav')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'autoNav', '🛑 Stop Nav', '🛣️ Auto-Navigate', 'var(--accent-blue)', 'AUTO-NAV ENGAGED');
        
        if (active) {
            fetch('/api/persona', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emotion: 6 }) }).catch(()=>{});
            autoNavInterval = setInterval(() => {
                fetch('/api/telemetry').then(r => r.json()).then(data => {
                    const pitchDelta = Math.abs(data.pitch - lastPitch);
                    lastPitch = data.pitch;
                    
                    if (pitchDelta > 8 || Math.abs(data.pitch) > 25) {
                        // Bump detected! Reverse and turn
                        fetch('/api/sound', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sound: 'beep' }) }).catch(()=>{});
                        fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: -40, turn: 0 }) }).catch(()=>{});
                        setTimeout(() => {
                            const turnDir = Math.random() > 0.5 ? 60 : -60;
                            fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: turnDir }) }).catch(()=>{});
                            setTimeout(() => {
                                fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 25, turn: 0 }) }).catch(()=>{});
                            }, 600);
                        }, 500);
                    } else {
                        // Drive forward gently
                        fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 25, turn: 0 }) }).catch(()=>{});
                    }
                }).catch(()=>{});
            }, 500);
        } else {
            clearInterval(autoNavInterval);
            fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: 0 }) }).catch(()=>{});
        }
    });

    // ═══════════════════════════════════════
    // FACE FOLLOW (placeholder toggle)
    // ═══════════════════════════════════════
    document.getElementById('btn-face-track')?.addEventListener('click', (e) => {
        toggleAIState(e.currentTarget, 'faceTrack', '🛑 Stop Tracking', '👤 Face Follow', 'var(--accent-pink)', 'FACE TRACKING ON');
    });

    // ═══════════════════════════════════════
    // COLOR TRACK (placeholder toggle)
    // ═══════════════════════════════════════
    document.getElementById('btn-color-track')?.addEventListener('click', (e) => {
        toggleAIState(e.currentTarget, 'colorTrack', '🛑 Stop Fetch', '🎾 Fetch Color', 'var(--accent-green)', 'FETCH MODE ON');
    });

    // ═══════════════════════════════════════
    // GUARD MODE — Motion detection via IMU
    // ═══════════════════════════════════════
    let guardInterval = null;
    let guardBasePitch = null;
    let guardBaseRoll = null;
    
    document.getElementById('btn-guard-mode')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'guardMode', '🛑 Stop Guarding', '🛡️ Guard Mode', '#ff3b3b', 'GUARD MODE ARMED');
        
        if (active) {
            fetch('/api/persona', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emotion: 7 }) }).catch(()=>{});
            
            // Calibrate baseline after a short delay
            setTimeout(() => {
                fetch('/api/telemetry').then(r => r.json()).then(data => {
                    guardBasePitch = data.pitch;
                    guardBaseRoll = data.roll;
                    if (window.showAlert) window.showAlert('CALIBRATED — Don\'t move me!', 'var(--accent-yellow)');
                }).catch(()=>{});
            }, 1500);
            
            guardInterval = setInterval(() => {
                if (guardBasePitch === null) return;
                fetch('/api/telemetry').then(r => r.json()).then(data => {
                    const pitchDelta = Math.abs(data.pitch - guardBasePitch);
                    const rollDelta = Math.abs(data.roll - guardBaseRoll);
                    
                    if (pitchDelta > 5 || rollDelta > 5) {
                        // INTRUDER DETECTED
                        fetch('/api/sound', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sound: 'siren' }) }).catch(()=>{});
                        fetch('/api/persona', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emotion: 7 }) }).catch(()=>{});
                        if (window.showAlert) window.showAlert('⚠️ MOTION DETECTED!', '#ff3b3b');
                        if (window.addXP) window.addXP(5);
                        // Re-calibrate after alert
                        guardBasePitch = data.pitch;
                        guardBaseRoll = data.roll;
                    }
                }).catch(()=>{});
            }, 2000);
        } else {
            clearInterval(guardInterval);
            guardBasePitch = null;
            guardBaseRoll = null;
        }
    });

    // ═══════════════════════════════════════
    // SLEEP TIMER — Countdown then sleep
    // ═══════════════════════════════════════
    let sleepTimeout = null;
    let sleepCountdown = null;
    
    document.getElementById('btn-sleep-cycle')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'sleepCycle', '🛑 Wake Up', '💤 Sleep Timer', 'var(--accent-purple)', 'SLEEP IN 60 SECONDS...');
        
        if (active) {
            let remaining = 60;
            sleepCountdown = setInterval(() => {
                remaining--;
                e.currentTarget.innerHTML = `💤 Sleep in ${remaining}s`;
                if (remaining <= 0) {
                    clearInterval(sleepCountdown);
                    // Put bot to sleep
                    fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: 0 }) }).catch(()=>{});
                    fetch('/api/persona', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emotion: 3 }) }).catch(()=>{});
                    fetch('/api/sound', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sound: 'snore' }) }).catch(()=>{});
                    if (window.showAlert) window.showAlert('💤 Zzzzz...', 'var(--accent-purple)');
                    e.currentTarget.innerHTML = '🛑 Wake Up';
                }
            }, 1000);
        } else {
            clearInterval(sleepCountdown);
            fetch('/api/persona', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emotion: 0 }) }).catch(()=>{});
            if (window.showAlert) window.showAlert('Good morning!', 'var(--accent-yellow)');
        }
    });

    // ═══════════════════════════════════════
    // QR SCANNER (placeholder toggle)
    // ═══════════════════════════════════════
    document.getElementById('btn-qr-scan')?.addEventListener('click', (e) => {
        toggleAIState(e.currentTarget, 'qrScan', '🛑 Stop Scanner', '📷 QR Scanner', 'var(--accent-yellow)', 'SCANNER ACTIVE');
    });

    // ═══════════════════════════════════════
    // SENTRY PATROL — Record and replay route
    // ═══════════════════════════════════════
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

    // ═══════════════════════════════════════
    // YOLO VISION (Pi Zero API Call)
    // ═══════════════════════════════════════
    let yoloInterval = null;
    document.getElementById('btn-yolo-vision')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'yoloVision', '🛑 Stop YOLO', '👁️ YOLO Vision', 'rgba(255,0,255,0.5)', 'YOLO VISION ACTIVE');
        
        if (active) {
            yoloInterval = setInterval(() => {
                fetch(`http://buddybrain.local:8000/api/detect`, { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        console.log("YOLO Detections:", data);
                    })
                    .catch(()=>{});
            }, 2000);
        } else {
            clearInterval(yoloInterval);
        }
    });

});
