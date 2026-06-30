// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — AI LAB CONTROLLER (Max Tier)
// v4.0 — Real implementations for Sleep, Guard, Auto-Nav
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════
    // COLOR TRACK (Feature 2)
    // ═══════════════════════════════════════
    document.getElementById('btn-color-track')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'colorTrack', '🛑 Stop Fetch', '🎾 Fetch Color', 'var(--accent-green)', 'FETCH MODE ON');
        const piHost = (state.config.piIp && state.config.piIp.trim() !== '') ? state.config.piIp : '192.168.8.175';
        fetch(`http://${piHost}:8000/api/cv/track`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({enabled: active})
        }).catch(err => console.error(err));
    });

    // ═══════════════════════════════════════
    // FALL PREVENTION (Feature 7)
    // ═══════════════════════════════════════
    document.getElementById('btn-fall-prevent')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'fallPrevent', '🛑 Disable Fall Prevent', '🛑 Fall Prevention', '#ff9800', 'FALL PREVENTION ARMED');
        const piHost = (state.config.piIp && state.config.piIp.trim() !== '') ? state.config.piIp : '192.168.8.175';
        fetch(`http://${piHost}:8000/api/cv/fall`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({enabled: active})
        }).catch(err => console.error(err));
    });


    // ── Vision Trigger (What do you see?) ──
    const btnVision = document.getElementById('btn-vision');
    if (btnVision) {
        btnVision.addEventListener('click', () => {
            if (!state.config.hasPi) {
                if (window.showAlert) window.showAlert('Raspberry Pi required for Vision API!', 'var(--accent-red)');
                return;
            }
            const origText = btnVision.innerHTML;
            btnVision.innerHTML = '👁️ Looking...';
            btnVision.disabled = true;
            
            // Get piIp from config, fallback to buddy.local
            const piHost = (state.config.piIp && state.config.piIp.trim() !== '') ? state.config.piIp : '192.168.8.175';
            
            fetch(`http://${piHost}:8000/api/vision`)
                .then(r => r.json())
                .then(data => {
                    btnVision.innerHTML = origText;
                    btnVision.disabled = false;
                    if (data.error) {
                        if (window.showAlert) window.showAlert(data.error, 'var(--accent-red)');
                    } else {
                        if (window.showAlert) window.showAlert('👀 Buddy says: ' + data.response, 'var(--accent-green)');
                        if (window.awardXP) window.awardXP(15);
                    }
                })
                .catch(err => {
                    btnVision.innerHTML = origText;
                    btnVision.disabled = false;
                    if (window.showAlert) window.showAlert('Failed to contact AI Brain!', 'var(--accent-red)');
                });
        });
    }


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
    // FACE FOLLOW (tracking.js)
    // ═══════════════════════════════════════
    let faceTrackerTask = null;
    document.getElementById('btn-face-track')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'faceTrack', '🛑 Stop Tracking', '👤 Face Follow', 'var(--accent-pink)', 'FACE TRACKING ON');
        
        if (active) {
            if (window.tracking) {
                const canvas = document.getElementById('cv-canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const img = document.getElementById('cam-stream');
                
                const tracker = new tracking.ObjectTracker('face');
                tracker.setInitialScale(4);
                tracker.setStepSize(2);
                tracker.setEdgesDensity(0.1);
                
                faceTrackerTask = setInterval(() => {
                    if (!img || !img.complete || img.naturalWidth === 0) return;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    tracking.track('#cv-canvas', tracker);
                }, 300);
                
                tracker.on('track', function(event) {
                    if (event.data.length === 0) {
                        // No face
                        fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: 0 }) }).catch(()=>{});
                    } else {
                        // Get largest face
                        const face = event.data.reduce((prev, current) => (prev.width * prev.height > current.width * current.height) ? prev : current);
                        
                        // Center is 160
                        const faceCenter = face.x + (face.width / 2);
                        const error = faceCenter - 160;
                        
                        // Deadzone
                        if (Math.abs(error) > 30) {
                            const turn = (error > 0) ? 35 : -35;
                            fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: turn }) }).catch(()=>{});
                        } else {
                            fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: 0 }) }).catch(()=>{});
                        }
                    }
                });
            }
        } else {
            clearInterval(faceTrackerTask);
            fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: 0 }) }).catch(()=>{});
        }
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
        const btn = e.currentTarget;
        const active = toggleAIState(btn, 'sleepCycle', '🛑 Wake Up', '💤 Sleep Timer', 'var(--accent-purple)', 'SLEEP IN 60 SECONDS...');
        
        if (active) {
            let remaining = 60;
            sleepCountdown = setInterval(() => {
                remaining--;
                if (btn) btn.innerHTML = `💤 Sleep in ${remaining}s`;
                if (remaining <= 0) {
                    clearInterval(sleepCountdown);
                    // Put bot to sleep
                    fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: 0 }) }).catch(()=>{});
                    fetch('/api/persona', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emotion: 3 }) }).catch(()=>{});
                    fetch('/api/sound', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sound: 'snore' }) }).catch(()=>{});
                    if (window.showAlert) window.showAlert('💤 Zzzzz...', 'var(--accent-purple)');
                    if (btn) btn.innerHTML = '🛑 Wake Up';
                }
            }, 1000);
        } else {
            clearInterval(sleepCountdown);
            fetch('/api/persona', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emotion: 0 }) }).catch(()=>{});
            if (window.showAlert) window.showAlert('Good morning!', 'var(--accent-yellow)');
        }
    });

    // ═══════════════════════════════════════
    // QR SCANNER (jsQR)
    // ═══════════════════════════════════════
    let qrInterval = null;
    document.getElementById('btn-qr-scan')?.addEventListener('click', (e) => {
        const active = toggleAIState(e.currentTarget, 'qrScan', '🛑 Stop Scanner', '📷 QR Scanner', 'var(--accent-yellow)', 'SCANNER ACTIVE');
        const canvas = document.getElementById('cv-canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const img = document.getElementById('cam-stream');
        
        if (active) {
            qrInterval = setInterval(() => {
                if (!img || !img.complete || img.naturalWidth === 0) return;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                if (window.jsQR) {
                    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
                    if (code) {
                        console.log("Found QR:", code.data);
                        if (window.showAlert) window.showAlert(`QR: ${code.data}`, 'var(--accent-green)');
                        
                        if (code.data === "COMMAND_DANCE") {
                            fetch('/api/persona', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emotion: 1 }) }).catch(()=>{});
                            fetch('/api/sound', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sound: 'melody' }) }).catch(()=>{});
                            fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: 50 }) }).catch(()=>{});
                            setTimeout(() => fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: -50 }) }).catch(()=>{}), 1000);
                            setTimeout(() => fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: 0 }) }).catch(()=>{}), 2000);
                            // Pause scanning momentarily
                            clearInterval(qrInterval);
                            setTimeout(() => document.getElementById('btn-qr-scan').click(), 3000);
                        } else if (code.data === "COMMAND_SPIN") {
                            fetch('/api/persona', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emotion: 8 }) }).catch(()=>{});
                            fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: 80 }) }).catch(()=>{});
                            setTimeout(() => fetch('/api/motors', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ speed: 0, turn: 0 }) }).catch(()=>{}), 1500);
                            clearInterval(qrInterval);
                            setTimeout(() => document.getElementById('btn-qr-scan').click(), 2500);
                        }
                    }
                }
            }, 500);
        } else {
            clearInterval(qrInterval);
        }
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
        
        // Ensure bounding box container exists
        let bboxContainer = document.getElementById('bbox-container');
        if (!bboxContainer) {
            bboxContainer = document.createElement('div');
            bboxContainer.id = 'bbox-container';
            bboxContainer.style.position = 'absolute';
            bboxContainer.style.top = '0';
            bboxContainer.style.left = '0';
            bboxContainer.style.width = '100%';
            bboxContainer.style.height = '100%';
            bboxContainer.style.pointerEvents = 'none';
            document.querySelector('.fpv-bg').appendChild(bboxContainer);
        }
        
        if (active) {
            yoloInterval = setInterval(() => {
                const piHost = (state.config.piIp && state.config.piIp.trim() !== '') ? state.config.piIp : '192.168.8.175';
                fetch(`http://${piHost}:8000/api/detect`, { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        bboxContainer.innerHTML = ''; // clear old boxes
                        if (data.detections) {
                            data.detections.forEach(det => {
                                const box = document.createElement('div');
                                box.style.position = 'absolute';
                                // Assuming detect API returns % based coordinates
                                box.style.left = `${det.x}%`;
                                box.style.top = `${det.y}%`;
                                box.style.width = `${det.w}%`;
                                box.style.height = `${det.h}%`;
                                box.style.border = '2px solid var(--neon-magenta)';
                                box.style.boxShadow = '0 0 10px var(--neon-magenta-glow)';
                                
                                const label = document.createElement('span');
                                label.textContent = `${det.label} (${Math.round(det.confidence*100)}%)`;
                                label.style.position = 'absolute';
                                label.style.top = '-20px';
                                label.style.left = '0';
                                label.style.background = 'var(--neon-magenta)';
                                label.style.color = '#fff';
                                label.style.padding = '2px 4px';
                                label.style.fontSize = '10px';
                                label.style.fontWeight = 'bold';
                                
                                box.appendChild(label);
                                bboxContainer.appendChild(box);
                            });
                        }
                    })
                    .catch(()=>{});
            }, 1000); // 1 FPS for YOLO
        } else {
            clearInterval(yoloInterval);
            bboxContainer.innerHTML = '';
        }
    });

});
