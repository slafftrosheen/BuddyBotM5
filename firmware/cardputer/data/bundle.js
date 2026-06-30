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


// ── RPG SYSTEM ──
window.awardXP = window.addXP = function(amount) {
    fetch('/api/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: amount })
    })
    .then(res => res.json())
    .then(data => {
        const lvlBadge = document.getElementById('lvl-badge');
        const oldLevel = parseInt(lvlBadge.textContent.replace('LVL ', '')) || 1;
        
        lvlBadge.textContent = `LVL ${data.level}`;
        document.getElementById('val-xp').textContent = `${data.xp} XP`;
        document.getElementById('bar-xp').style.width = `${data.xp % 100}%`;

        if (data.level > oldLevel) {
            showAlert(`🎉 LEVEL UP! You reached LVL ${data.level}!`, 'var(--accent-green)');
        }
    }).catch(()=>{});
};

document.addEventListener('DOMContentLoaded', () => {
    
    // ── 1. LOAD CONFIG ──
    fetch('/api/config')
        .then(res => res.json())
        .then(data => {
            state.config = data;
            applyTierVisibility();
            populateSettings();
            
            // Start Cam Stream with Auto-Reconnect Logic
            {
                const img = document.getElementById('cam-stream');
                const camHost = (data.camIp && data.camIp.trim() !== '') ? data.camIp : '192.168.8.189';
                const streamUrl = `http://${camHost}/stream`;
                let retryTimeout;
                
                const connectCam = () => {
                    img.src = streamUrl;
                    document.getElementById('cam-status').textContent = 'CONNECTING...';
                    document.getElementById('cam-status').style.background = 'var(--neon-amber)';
                    document.getElementById('cam-status').style.color = '#000';
                };

                img.onload = () => {
                    clearTimeout(retryTimeout);
                    document.getElementById('cam-status').textContent = 'LIVE';
                    document.getElementById('cam-status').style.background = 'var(--accent-green)';
                    document.getElementById('cam-status').style.color = '#000';
                };

                img.onerror = () => {
                    document.getElementById('cam-status').textContent = 'OFFLINE';
                    document.getElementById('cam-status').style.background = '#ff3b3b';
                    document.getElementById('cam-status').style.color = '#fff';
                    // Clear previous source to prevent browser memory leak loops
                    img.src = "";
                    // Auto-reconnect after 3 seconds
                    clearTimeout(retryTimeout);
                    retryTimeout = setTimeout(connectCam, 3000);
                };
                
                if (data.camFlip) img.style.transform += ' scaleY(-1)';
                if (data.camMirror) img.style.transform += ' scaleX(-1)';
                
                // Initial connection
                connectCam();
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
            
            // Close the overlay if it's open
            const overlay = document.getElementById('nav-overlay');
            if (overlay) overlay.style.display = 'none';

            // Play subtle UI sound if available
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
                audio.volume = 0.2;
                audio.play().catch(()=>{});
            } catch(e){}
        });
    });

    // ── Hamburger Menu Logic ──
    const btnMenu = document.getElementById('btn-menu');
    const btnMenuClose = document.getElementById('btn-menu-close');
    const navOverlay = document.getElementById('nav-overlay');

    if (btnMenu && navOverlay) {
        btnMenu.addEventListener('click', () => {
            navOverlay.style.display = 'flex';
        });
    }
    if (btnMenuClose && navOverlay) {
        btnMenuClose.addEventListener('click', () => {
            navOverlay.style.display = 'none';
        });
    }

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
                if (data.level !== undefined) {
                    document.getElementById('lvl-badge').textContent = `LVL ${data.level}`;
                    document.getElementById('val-xp').textContent = `${data.xp} XP`;
                    document.getElementById('bar-xp').style.width = `${data.xp % 100}%`;
                }
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
                document.getElementById('bar-gas').style.width = `${Math.min(100, data.gas / 1000)}%`;
                
                if (data.tof !== undefined) {
                    document.getElementById('val-tof').textContent = `${data.tof}mm`;
                    document.getElementById('bar-tof').style.width = `${Math.min(100, data.tof / 20)}%`;
                }

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


document.getElementById('btn-say-tts')?.addEventListener('click', () => {
    const text = document.getElementById('tts-text')?.value;
    if (text) {
        fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        document.getElementById('tts-text').value = '';
    }
});


// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — HARDWARE (SERVO/MACRO) CONTROLLER
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    const servos = [];
    for (let i = 0; i < 8; i++) {
        servos.push({ id: i, name: `Servo ${i}`, grid: "servo-manipulator-grid", init: 90 });
    }

    // Build sliders dynamically
    servos.forEach(s => {
        const grid = document.getElementById(s.grid);
        if (!grid) return;

        const row = document.createElement('div');
        row.className = 'servo-row';
        row.innerHTML = `
            <span class="servo-name">${s.name}</span>
            <input type="range" class="servo-slider" id="servo-${s.id}" min="0" max="180" value="${s.init}">
            <span class="servo-val" id="servo-val-${s.id}">${s.init}°</span>
        `;
        
        grid.appendChild(row);

        const slider = document.getElementById(`servo-${s.id}`);
        const valDisp = document.getElementById(`servo-val-${s.id}`);

        slider.addEventListener('input', (e) => {
            const angle = parseInt(e.target.value);
            valDisp.textContent = `${angle}°`;
            sendServoCommand(s.id, angle);
        });

        // Snap to center for continuous rotation servos (90 = stop)
        const snapToCenter = () => {
            slider.value = 90;
            valDisp.textContent = `90°`;
            sendServoCommand(s.id, 90);
        };
        slider.addEventListener('mouseup', snapToCenter);
        slider.addEventListener('touchend', snapToCenter);
    });

    let servoTimeout = null;
    function sendServoCommand(channel, angle) {
        // Debounce to prevent flooding I2C
        if (servoTimeout) clearTimeout(servoTimeout);
        servoTimeout = setTimeout(() => {
            fetch('/api/servo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel, angle })
            }).catch(()=>{});
        }, 50);
    }

    // ── Macros ──
    let macroTimeout = null;

    function runMacro(sequence) {
        if (macroTimeout) clearTimeout(macroTimeout);
        
        let step = 0;
        function nextStep() {
            if (step >= sequence.length) {
                if (window.showAlert) window.showAlert('MACRO COMPLETE', 'var(--accent-green)');
                return;
            }
            const action = sequence[step];
            
            if (action.servos) {
                for (const [ch, angle] of Object.entries(action.servos)) {
                    const channel = parseInt(ch);
                    
                    // Update UI slider
                    const slider = document.getElementById(`servo-${channel}`);
                    if (slider) slider.value = angle;
                    const valDisplay = document.getElementById(`servo-val-${channel}`);
                    if (valDisplay) valDisplay.textContent = `${angle}°`;
                    
                    // Send to robot (immediate)
                    fetch('/api/servo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ channel, angle })
                    }).catch(()=>{});
                }
            }

            step++;
            if (action.duration > 0) {
                macroTimeout = setTimeout(nextStep, action.duration);
            } else {
                nextStep();
            }
        }
        
        if (window.showAlert) window.showAlert('EXECUTING MACRO...', 'var(--accent-purple)');
        nextStep();
    }

    // Bind Macro Buttons
    document.getElementById('btn-macro-stop')?.addEventListener('click', () => {
        runMacro([{ servos: { 3: 90, 4: 90, 5: 90, 6: 90, 7: 90 }, duration: 0 }]);
    });

    document.getElementById('btn-macro-wave')?.addEventListener('click', () => {
        runMacro([
            { servos: { 3: 40 }, duration: 400 },
            { servos: { 3: 140 }, duration: 400 },
            { servos: { 3: 40 }, duration: 400 },
            { servos: { 3: 140 }, duration: 400 },
            { servos: { 3: 90 }, duration: 0 }
        ]);
    });

    document.getElementById('btn-macro-highfive')?.addEventListener('click', () => {
        runMacro([
            { servos: { 3: 160, 4: 120 }, duration: 500 }, // Raise arm and extend
            { servos: { 3: 90, 4: 90 }, duration: 1500 },  // Hold for high five
            { servos: { 3: 0, 4: 30 }, duration: 500 },    // Lower back down
            { servos: { 3: 90, 4: 90 }, duration: 0 }
        ]);
    });

    document.getElementById('btn-macro-grab')?.addEventListener('click', () => {
        runMacro([
            { servos: { 3: 50, 4: 140 }, duration: 600 }, // Reach down/forward
            { servos: { 7: 180 }, duration: 400 },        // Close gripper
            { servos: { 3: 140, 4: 60 }, duration: 600 }, // Lift object up
            { servos: { 3: 90, 4: 90 }, duration: 0 }
        ]);
    });

});


// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — DRIVE CONTROLLER
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // ── Joystick Setup ──
    const joystickZone = document.getElementById('joystick-zone');
    const throttleFill = document.getElementById('throttle-fill');
    const throttlePct = document.getElementById('throttle-pct');
    const readout = document.getElementById('drive-readout');
    
    const speedSlider = document.getElementById('speed-limit-slider');
    const speedVal = document.getElementById('speed-limit-val');

    if(speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            speedVal.textContent = e.target.value;
        });
    }

    let manager = null;
    if (joystickZone) {
        manager = nipplejs.create({
            zone: joystickZone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'var(--accent-blue)',
            size: 150
        });
    }

    let motorData = { speed: 0, turn: 0 };
    let motorInterval = null;

    if (manager) {
        manager.on('move', (evt, data) => {
            const forward = Math.sin(data.angle.radian) * data.distance;
            const right = Math.cos(data.angle.radian) * data.distance;
            
            const limitLevel = parseInt(speedSlider ? speedSlider.value : 3);
            const limitMultiplier = limitLevel * 0.2; 
            
            const maxDist = manager.options.size / 2;
            
            motorData.speed = Math.min(100, Math.max(-100, (forward / maxDist) * 100)) * limitMultiplier;
            motorData.turn = Math.min(100, Math.max(-100, (right / maxDist) * 100)) * limitMultiplier;
            
            updateThrottleUI();
        });

        manager.on('end', () => {
            motorData.speed = 0;
            motorData.turn = 0;
            updateThrottleUI();
            sendMotorCommand(0, 0); 
        });
    }

    let isSending = false;
    motorInterval = setInterval(() => {
        if (!isSending && (Math.abs(motorData.speed) > 2 || Math.abs(motorData.turn) > 2)) {
            isSending = true;
            sendMotorCommand(motorData.speed, motorData.turn);
            setTimeout(() => { isSending = false; }, 100); 
        }
    }, 50);

    const danceBtn = document.getElementById('btn-dance');
    let danceActive = false;
    let danceSeq = null;

    if (danceBtn) {
        danceBtn.addEventListener('click', () => {
            danceActive = !danceActive;
            danceBtn.classList.toggle('active');
            
            if (danceActive) {
                danceBtn.innerHTML = '🛑 Stop Dance';
                let step = 0;
                const moves = [
                    { s: 50, t: -80 }, { s: 50, t: 80 }, 
                    { s: -30, t: 0 }, { s: 60, t: 0 }, 
                    { s: 0, t: -100 }, { s: 0, t: 100 }
                ];
                danceSeq = setInterval(() => {
                    const cmd = moves[step % moves.length];
                    sendMotorCommand(cmd.s, cmd.t);
                    step++;
                }, 500);
                if (typeof showAlert !== 'undefined') showAlert('Dancing!', 'var(--accent-pink)');
                if (window.awardXP) window.awardXP(10);
            } else {
                danceBtn.innerHTML = '💃 Dance';
                clearInterval(danceSeq);
                sendMotorCommand(0, 0);
            }
        });
    }

    const wanderBtn = document.getElementById('btn-wander');
    let wanderActive = false;
    let wanderSeq = null;

    if (wanderBtn) {
        wanderBtn.addEventListener('click', () => {
            wanderActive = !wanderActive;
            wanderBtn.classList.toggle('active');
            
            if (wanderActive) {
                wanderBtn.innerHTML = '🛑 Stop Explore';
                wanderSeq = setInterval(() => {
                    sendMotorCommand(30 + Math.random()*30, (Math.random()-0.5)*60);
                }, 2000);
                if (typeof showAlert !== 'undefined') showAlert('Exploring...', 'var(--accent-blue)');
                if (window.awardXP) window.awardXP(10);
            } else {
                wanderBtn.innerHTML = '🧭 Explore';
                clearInterval(wanderSeq);
                sendMotorCommand(0, 0);
            }
        });
    }

    function updateThrottleUI() {
        if(!throttleFill || !throttlePct || !readout) return;
        const absSpeed = Math.abs(motorData.speed);
        throttleFill.style.height = `${absSpeed}%`;
        throttlePct.textContent = `${Math.round(motorData.speed)}%`;
        
        if (absSpeed > 5) {
            readout.textContent = 'MOVING';
            readout.style.background = 'var(--accent-green)';
            readout.style.color = '#000';
        } else {
            readout.textContent = 'STOPPED';
            readout.style.background = 'rgba(255,255,255,0.1)';
            readout.style.color = '#fff';
        }
    }

    function sendMotorCommand(speed, turn) {
        fetch('/api/motors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                speed: Math.round(speed), 
                turn: Math.round(turn) 
            })
        }).catch(()=>{});
    }

    // ── GAMEPAD API SUPPORT ──
    let gamepadIndex = null;
    let gamepadInterval = null;

    window.addEventListener("gamepadconnected", (e) => {
        console.log("Gamepad connected:", e.gamepad.id);
        gamepadIndex = e.gamepad.index;
        if(typeof showAlert !== 'undefined') showAlert('🎮 Controller Connected!', 'var(--accent-green)');
        if (!gamepadInterval) {
            requestAnimationFrame(pollGamepad);
        }
    });

    window.addEventListener("gamepaddisconnected", (e) => {
        if (e.gamepad.index === gamepadIndex) {
            console.log("Gamepad disconnected");
            gamepadIndex = null;
            if(typeof showAlert !== 'undefined') showAlert('🎮 Controller Disconnected', 'var(--accent-red)');
            sendMotorCommand(0, 0);
        }
    });

    let servoAngles = {
        1: 90, 
        2: 90  
    };

    let lastGpMotor = { speed: 0, turn: 0 };
    let gpDebounce = 0;

    function pollGamepad() {
        if (gamepadIndex !== null) {
            const gp = navigator.getGamepads()[gamepadIndex];
            if (gp) {
                const deadzone = 0.15;
                let axisX = gp.axes[0];
                let axisY = gp.axes[1];
                
                if (Math.abs(axisX) < deadzone) axisX = 0;
                if (Math.abs(axisY) < deadzone) axisY = 0;

                const limitLevel = parseInt(speedSlider ? speedSlider.value : 3);
                const limitMultiplier = limitLevel * 0.2;

                motorData.speed = (-axisY * 100) * limitMultiplier;
                motorData.turn = (axisX * 100) * limitMultiplier;

                if (Math.abs(motorData.speed - lastGpMotor.speed) > 2 || Math.abs(motorData.turn - lastGpMotor.turn) > 2) {
                    if (Date.now() - gpDebounce > 50) {
                        sendMotorCommand(motorData.speed, motorData.turn);
                        updateThrottleUI();
                        lastGpMotor.speed = motorData.speed;
                        lastGpMotor.turn = motorData.turn;
                        gpDebounce = Date.now();
                    }
                }

                let axisRX = gp.axes[2];
                let axisRY = gp.axes[3];
                
                if (Math.abs(axisRX) < deadzone) axisRX = 0;
                if (Math.abs(axisRY) < deadzone) axisRY = 0;

                if (axisRX !== 0) {
                    servoAngles[1] += axisRX * 3; 
                    servoAngles[1] = Math.max(0, Math.min(180, servoAngles[1]));
                    const slider1 = document.getElementById('group-1');
                    if(slider1) { slider1.value = servoAngles[1]; slider1.dispatchEvent(new Event('input')); }
                }
                if (axisRY !== 0) {
                    servoAngles[2] += axisRY * 3; 
                    servoAngles[2] = Math.max(0, Math.min(180, servoAngles[2]));
                    const slider2 = document.getElementById('group-2');
                    if(slider2) { slider2.value = servoAngles[2]; slider2.dispatchEvent(new Event('input')); }
                }

                if (gp.buttons[0].pressed && gp.buttons[0].value > 0.5) {
                    if (!danceActive && Date.now() - gpDebounce > 500) {
                        if(danceBtn) danceBtn.click();
                        gpDebounce = Date.now();
                    }
                }
            }
            requestAnimationFrame(pollGamepad);
        }
    }
});


// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — PLAY & GAMES CONTROLLER
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ── Sound Board ──
    document.querySelectorAll('.sfx-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sound = e.currentTarget.dataset.sound;
            fetch('/api/sound', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sound: sound })
            }).catch(()=>{});
            
            // Visual bounce
            const el = e.currentTarget;
            el.style.transform = 'scale(0.9)';
            setTimeout(() => el.style.transform = '', 150);
            
            if (window.addXP) window.addXP(2);
        });
    });

    // ── Treat Button ──
    const treatBtn = document.getElementById('btn-treat');
    if (treatBtn) {
        treatBtn.addEventListener('click', () => {
            fetch('/api/action?cmd=treat').catch(()=>{});
            treatBtn.style.transform = 'scale(0.9)';
            setTimeout(() => treatBtn.style.transform = '', 150);
            
            // Trigger happy face
            const happyBtn = document.querySelector('.emo-btn[data-emotion="1"]');
            if (happyBtn) happyBtn.click();
            
            if (window.addXP) window.addXP(10);
            if (window.refillVitals) window.refillVitals('hunger', 30);
        });
    }

    // ── Parrot Mode ──
    // Plays a random sound through the robot's speaker (parrot-like)
    const btnParrot = document.getElementById('btn-parrot');
    if (btnParrot) {
        const parrotSounds = ['r2d2', 'laugh', 'whistle', 'sneeze', 'horn'];
        btnParrot.addEventListener('click', () => {
            const pick = parrotSounds[Math.floor(Math.random() * parrotSounds.length)];
            fetch('/api/sound', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sound: pick }) 
            }).catch(()=>{});
            fetch('/api/persona', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emotion: 8 }) // Excited
            }).catch(()=>{});
            showAlert(`🦜 Squawk! (${pick})`, 'var(--accent-green)');
            if (window.addXP) window.addXP(3);
        });
    }

    // ── Hide & Seek ──
    const btnHide = document.getElementById('btn-hide-seek');
    if (btnHide) {
        btnHide.addEventListener('click', () => {
            fetch('/api/sound', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sound: 'r2d2' }) 
            }).catch(()=>{});
            showAlert('Marco!', 'var(--accent-green)');
            if (window.addXP) window.addXP(5);
        });
    }

    // ── Color Quiz Game ──
    const colorQuizColors = [
        { name: 'Red', hex: '#ff3b3b' },
        { name: 'Blue', hex: '#0f9bff' },
        { name: 'Green', hex: '#00e676' },
        { name: 'Yellow', hex: '#ffd600' },
        { name: 'Pink', hex: '#ff6b9d' },
        { name: 'Purple', hex: '#b388ff' }
    ];
    let colorQuizAnswer = null;
    
    document.getElementById('btn-color-game')?.addEventListener('click', () => {
        const pick = colorQuizColors[Math.floor(Math.random() * colorQuizColors.length)];
        colorQuizAnswer = pick.name;
        
        // Change robot's eye color to the quiz color
        fetch('/api/persona', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eyeColor: pick.hex, emotion: 6 }) // Curious
        }).catch(()=>{});
        
        // Show prompt — after 3 seconds reveal the answer
        showAlert('🎨 What color are my eyes?', pick.hex);
        
        setTimeout(() => {
            showAlert(`It was ${pick.name}!`, pick.hex);
            fetch('/api/persona', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emotion: 1 }) // Happy
            }).catch(()=>{});
            fetch('/api/sound', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sound: 'levelup' }) 
            }).catch(()=>{});
            if (window.addXP) window.addXP(5);
        }, 4000);
    });

    // ── DJ Pad Overlay ──
    const djPad = document.getElementById('dj-pad');
    document.getElementById('btn-dj-open').addEventListener('click', () => {
        djPad.style.display = 'flex';
    });
    document.getElementById('btn-close-dj').addEventListener('click', () => {
        djPad.style.display = 'none';
    });

    document.querySelectorAll('.dj-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sound = e.currentTarget.dataset.sound;
            fetch('/api/sound', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sound: sound }) 
            }).catch(()=>{});
            
            if (window.refillVitals) {
                window.refillVitals('energy', -1);
                window.refillVitals('happiness', 2);
            }
            
            // Micro motor bob
            fetch('/api/motors', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ speed: 30, turn: 0 }) 
            }).catch(()=>{});
            
            setTimeout(() => {
                fetch('/api/motors', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ speed: 0, turn: 0 }) 
                }).catch(()=>{});
            }, 80);
        });
    });

    // ── Simon Says ──
    const simonPad = document.getElementById('simon-pad');
    const simonScore = document.getElementById('simon-score');
    const simonStatus = document.getElementById('simon-status');
    const colors = ['red', 'blue', 'green', 'yellow'];
    
    let simonSeq = [];
    let playerSeq = [];
    let simonPlaying = false;

    document.getElementById('btn-simon').addEventListener('click', () => {
        simonPad.style.display = 'flex';
        simonSeq = [];
        simonPlaying = true;
        nextSimonRound();
    });
    
    document.getElementById('btn-close-simon').addEventListener('click', () => {
        simonPad.style.display = 'none';
        simonPlaying = false;
    });

    function nextSimonRound() {
        playerSeq = [];
        simonSeq.push(colors[Math.floor(Math.random() * colors.length)]);
        simonScore.textContent = `SCORE: ${simonSeq.length - 1}`;
        simonStatus.textContent = "WATCH...";
        simonStatus.style.color = '#fff';
        
        let i = 0;
        const interval = setInterval(() => {
            if (i >= simonSeq.length) {
                clearInterval(interval);
                simonStatus.textContent = "YOUR TURN!";
                simonStatus.style.color = 'var(--accent-yellow)';
                return;
            }
            playSimonColor(simonSeq[i]);
            i++;
        }, 800);
    }

    function playSimonColor(color) {
        const btn = document.querySelector(`.simon-btn.${color}`);
        btn.style.opacity = '1';
        setTimeout(() => btn.style.opacity = '0.5', 400);

        const emoMap = { 'red': 2, 'blue': 5, 'green': 1, 'yellow': 8 };
        
        fetch('/api/persona', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emotion: emoMap[color] }) 
        }).catch(()=>{});
        
        fetch('/api/sound', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sound: 'beep' }) 
        }).catch(()=>{});
    }

    document.querySelectorAll('.simon-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!simonPlaying || simonStatus.textContent !== "YOUR TURN!") return;
            
            const color = e.currentTarget.dataset.color;
            playSimonColor(color);
            playerSeq.push(color);

            const currentIdx = playerSeq.length - 1;
            if (playerSeq[currentIdx] !== simonSeq[currentIdx]) {
                // FAIL
                simonStatus.textContent = "GAME OVER!";
                simonStatus.style.color = 'var(--accent-pink)';
                fetch('/api/sound', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sound: 'siren' }) 
                }).catch(()=>{});
                simonPlaying = false;
            } else if (playerSeq.length === simonSeq.length) {
                // SUCCESS
                simonStatus.textContent = "CORRECT!";
                simonStatus.style.color = 'var(--accent-green)';
                if (window.addXP) window.addXP(10);
                if (window.refillVitals) {
                    window.refillVitals('energy', -5);
                    window.refillVitals('happiness', 10);
                }
                setTimeout(nextSimonRound, 1000);
            }
        });
    });

});


// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — BUDDY (VITALS/PERSONA) CONTROLLER
// ═══════════════════════════════════════════════════════

// Global Gamification State
window.buddyState = {
    xp: parseInt(localStorage.getItem('buddy_xp')) || 0,
    level: 1,
    hp: 100,
    hunger: 100,
    energy: 100,
    happiness: 100
};

// Global Functions for other modules
window.refillVitals = function(stat, amount) {
    window.buddyState[stat] = Math.min(100, window.buddyState[stat] + amount);
    updateVitalsUI();
};


function updateVitalsUI() {
    ['hp', 'hunger', 'energy', 'happiness'].forEach(stat => {
        const val = window.buddyState[stat];
        const bar = document.getElementById(`bar-${stat === 'happiness' ? 'happy' : stat}`);
        const text = document.getElementById(`val-${stat === 'happiness' ? 'happy' : stat}`);
        
        if (bar) bar.style.width = `${val}%`;
        if (text) text.textContent = `${Math.round(val)}%`;
        
        // Color shifts if low
        if (bar) {
            if (val < 25) bar.style.background = 'var(--accent-pink)';
            else bar.style.background = ''; // Use CSS default
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    
    updateVitalsUI();

    // ── Emotion Picker ──
    const emoGrid = document.getElementById('emotion-grid');
    if (emoGrid) {
        emoGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.emo-btn');
            if (!btn) return;

            const emotion = parseInt(btn.dataset.emotion);
            
            // Update active state in UI
            document.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Send to robot
            fetch('/api/persona', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emotion: emotion })
            }).catch(()=>{});
        });
    }

    // ── Vitals Decay Loop ──
    setInterval(() => {
        // Very slow decay (kids shouldn't feel stressed)
        window.buddyState.hunger = Math.max(0, window.buddyState.hunger - 0.5);
        window.buddyState.energy = Math.max(0, window.buddyState.energy - 0.2);
        
        // Happiness drops if hungry/tired
        if (window.buddyState.hunger < 30 || window.buddyState.energy < 30) {
            window.buddyState.happiness = Math.max(0, window.buddyState.happiness - 1);
        } else {
            window.buddyState.happiness = Math.min(100, window.buddyState.happiness + 0.5);
        }

        // HP drops if everything is terrible
        if (window.buddyState.happiness < 10) {
            window.buddyState.hp = Math.max(0, window.buddyState.hp - 1);
        } else {
            window.buddyState.hp = Math.min(100, window.buddyState.hp + 2);
        }
        
        updateVitalsUI();
        
        // Auto-change emotion if things are bad
        if (window.buddyState.hunger < 20) {
            const currentEmoBtn = document.querySelector('.emo-btn.active');
            if (currentEmoBtn && parseInt(currentEmoBtn.dataset.emotion) !== 5) {
                document.querySelector('.emo-btn[data-emotion="5"]').click(); // Sad
            }
        }
    }, 10000); // Check every 10s
});


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

    // ── TTS Trigger (Speak) ──
    const btnSayTTS = document.getElementById('btn-say-tts');
    const ttsText = document.getElementById('tts-text');
    if (btnSayTTS && ttsText) {
        btnSayTTS.addEventListener('click', () => {
            const text = ttsText.value.trim();
            if (!text) return;
            
            fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            }).then(() => {
                if (window.showAlert) window.showAlert('Speaking...', 'var(--accent-green)');
                ttsText.value = '';
            }).catch(err => {
                if (window.showAlert) window.showAlert('TTS Failed', 'var(--accent-red)');
            });
        });
    }

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
    const sendLivePersona = () => {
        fetch('/api/persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eyeSizeX: parseInt(document.getElementById('eye-w').value),
                eyeSizeY: parseInt(document.getElementById('eye-h').value)
            })
        }).catch(()=>{});
    };

    document.getElementById('eye-w')?.addEventListener('input', (e) => {
        document.getElementById('val-eye-w').textContent = e.target.value;
        sendLivePersona();
    });
    document.getElementById('eye-h')?.addEventListener('input', (e) => {
        document.getElementById('val-eye-h').textContent = e.target.value;
        sendLivePersona();
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


