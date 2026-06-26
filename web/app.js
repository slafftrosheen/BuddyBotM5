/* ═══════════════════════════════════════════════════════
   BUDDYBOT M5 — TACTICAL COMMAND JS
   Full control: drive, servos, persona, entertainment
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ── State ──
    const state = {
        connected: false,
        missionStart: Date.now(),
        currentEmotion: 0,
        servoInverts: JSON.parse(localStorage.getItem('servoInverts') || '[false,false,false,false,false,false,false,false]'),
        motorTrimL: parseInt(localStorage.getItem('motorTrimL') || '0'),
        motorTrimR: parseInt(localStorage.getItem('motorTrimR') || '0'),
        camFlip: localStorage.getItem('camFlip') === 'true',
        camMirror: localStorage.getItem('camMirror') === 'true',
        hudTheme: localStorage.getItem('hudTheme') || 'green',
        danceMode: false,
        wanderMode: false,
        currentSpeed: 0,
        currentTurn: 0,
        servoValues: [0, 0, 0, 0, 0, 0, 0, 0], // -100 to +100, 0 = stop
        sentryMode: 0, // 0: off, 1: recording, 2: playing
        sentryRoute: JSON.parse(localStorage.getItem('sentryRoute') || '[]'),
        sentryStartTime: 0,
        sentryPlayIndex: 0,
        gasHistory: []
    };

    // Apply Theme
    if (state.hudTheme !== 'green') {
        document.body.classList.add(`theme-${state.hudTheme}`);
    }

    // ══════════════════════════════════════════
    // 1. MISSION CLOCK
    // ══════════════════════════════════════════
    const clockEl = document.getElementById('mission-clock');
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.missionStart) / 1000);
        const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
        const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        clockEl.textContent = `T+ ${h}:${m}:${s}`;
    }, 1000);

    // ══════════════════════════════════════════
    // MISSION TIMER (STOPWATCH)
    // ══════════════════════════════════════════
    let timerInterval = null;
    let timerStartTime = 0;
    let timerElapsed = 0;
    const timerDisplay = document.getElementById('timer-display');

    function updateTimerDisplay(ms) {
        const mins = String(Math.floor(ms / 60000)).padStart(2, '0');
        const secs = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
        const centis = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}.${centis}`;
    }

    document.getElementById('btn-timer-start').addEventListener('click', () => {
        if (!timerInterval) {
            timerStartTime = Date.now() - timerElapsed;
            timerInterval = setInterval(() => {
                timerElapsed = Date.now() - timerStartTime;
                updateTimerDisplay(timerElapsed);
            }, 10);
        }
    });

    document.getElementById('btn-timer-stop').addEventListener('click', () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    });

    document.getElementById('btn-timer-reset').addEventListener('click', () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timerElapsed = 0;
        updateTimerDisplay(0);
    });

    // ══════════════════════════════════════════
    // 2. JOYSTICK — DRIVE SYSTEM
    // ══════════════════════════════════════════
    const joystickZone = document.getElementById('joystick-zone');
    const manager = nipplejs.create({
        zone: joystickZone,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#00ff41',
        size: 120
    });

    const driveReadout = document.getElementById('drive-readout');
    const throttleFill = document.getElementById('throttle-fill');
    const throttlePct = document.getElementById('throttle-pct');

    manager.on('move', (evt, data) => {
        const force = Math.min(data.force, 1);
        const angle = data.angle.radian;
        state.currentSpeed = Math.sin(angle) * force * 100;
        state.currentTurn = Math.cos(angle) * force * 100;

        // Update HUD readouts
        const absPct = Math.abs(Math.round(state.currentSpeed));
        const hdg = Math.round(state.currentTurn);
        driveReadout.textContent = `SPD ${absPct}% | HDG ${hdg > 0 ? '+' : ''}${hdg}°`;
        throttleFill.style.height = absPct + '%';
        throttlePct.textContent = absPct + '%';

        // Update camera heading overlay from turn
        document.getElementById('cam-heading').textContent = `HDG ${(180 + hdg).toFixed(0)}°`;

        // Steering CH0 Control
        const steeringSpeed = hdg;
        state.servoValues[0] = steeringSpeed;
        const ch0Slider = document.getElementById('servo-slider-0');
        if (ch0Slider) {
            ch0Slider.value = steeringSpeed;
            const valDisplay = document.getElementById('servo-val-0');
            if (valDisplay) {
                if (steeringSpeed === 0) valDisplay.textContent = 'STOP';
                else valDisplay.textContent = (steeringSpeed > 0 ? '+' : '') + steeringSpeed + '%';
            }
        }
        sendServoCommand(0, steeringSpeed);
    });

    manager.on('end', () => {
        state.currentSpeed = 0;
        state.currentTurn = 0;
        sendMotorCommand(0, 0);
        driveReadout.textContent = 'SPD 0% | HDG 0°';
        throttleFill.style.height = '0%';
        throttlePct.textContent = '0%';

        // Reset CH0 Steering
        state.servoValues[0] = 0;
        const ch0Slider = document.getElementById('servo-slider-0');
        if (ch0Slider) {
            ch0Slider.value = 0;
            const valDisplay = document.getElementById('servo-val-0');
            if (valDisplay) valDisplay.textContent = 'STOP';
        }
        sendServoCommand(0, 0);
    });

    // Periodic motor command send (and Patrol Record/Playback)
    setInterval(() => {
        const now = Date.now();
        
        // Patrol Recording
        if (state.sentryMode === 1) {
            const timeOffset = now - state.sentryStartTime;
            const lastFrame = state.sentryRoute.length > 0 ? state.sentryRoute[state.sentryRoute.length - 1] : null;
            // Only record if state changed or every 500ms to keep it small
            if (!lastFrame || lastFrame.s !== state.currentSpeed || lastFrame.t !== state.currentTurn || (timeOffset - lastFrame.time) > 500) {
                state.sentryRoute.push({ time: timeOffset, s: state.currentSpeed, t: state.currentTurn, ch0: state.servoValues[0] });
                localStorage.setItem('sentryRoute', JSON.stringify(state.sentryRoute));
            }
        }
        
        // Patrol Playback
        if (state.sentryMode === 2 && state.sentryRoute.length > 0) {
            const timeOffset = (now - state.sentryStartTime) % state.sentryRoute[state.sentryRoute.length - 1].time;
            
            // Find current frame
            let frame = state.sentryRoute[0];
            for (let i = 0; i < state.sentryRoute.length; i++) {
                if (state.sentryRoute[i].time > timeOffset) break;
                frame = state.sentryRoute[i];
            }
            
            state.currentSpeed = frame.s;
            state.currentTurn = frame.t;
            if (frame.ch0 !== undefined) sendServoCommand(0, frame.ch0);
        }

        if (state.currentSpeed !== 0 || state.currentTurn !== 0) {
            sendMotorCommand(state.currentSpeed, state.currentTurn);
        }
    }, 100);

    function sendMotorCommand(speed, turn) {
        fetch('/api/motors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                speed: Math.round(speed),
                turn: Math.round(turn),
                trimL: state.motorTrimL,
                trimR: state.motorTrimR
            })
        }).catch(() => {});
    }

    // ══════════════════════════════════════════
    // 3. SERVO ARRAY — CONTINUOUS ROTATION
    // ══════════════════════════════════════════
    const driveGrid = document.getElementById('servo-drive-grid');
    const gimbalGrid = document.getElementById('servo-gimbal-grid');
    const armGrid = document.getElementById('servo-arm-grid');

    for (let i = 0; i < 8; i++) {
        const ch = document.createElement('div');
        ch.className = 'servo-ch' + (i === 0 ? ' steering' : '');

        const label = document.createElement('span');
        label.className = 'servo-ch-label';
        
        if (i === 0) label.textContent = 'CH0 STR';
        else if (i === 1) label.textContent = 'CH1 PAN';
        else if (i === 2) label.textContent = 'CH2 TILT';
        else label.textContent = `CH${i} ARM${i-2}`;

        const sliderWrap = document.createElement('div');
        sliderWrap.className = 'servo-slider-wrap';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '-100';
        slider.max = '100';
        slider.value = '0';
        slider.style.writingMode = 'vertical-lr';
        slider.style.direction = 'rtl';
        slider.dataset.channel = i;
        slider.id = `servo-slider-${i}`;

        const valDisplay = document.createElement('span');
        valDisplay.className = 'servo-val';
        valDisplay.id = `servo-val-${i}`;
        valDisplay.textContent = 'STOP';

        const invertBtn = document.createElement('button');
        invertBtn.className = 'servo-invert' + (state.servoInverts[i] ? ' active' : '');
        invertBtn.textContent = 'INV';
        invertBtn.dataset.channel = i;

        // Slider event — continuous rotation: -100 to +100
        slider.addEventListener('input', (e) => {
            const channel = parseInt(e.target.dataset.channel);
            let speed = parseInt(e.target.value);
            state.servoValues[channel] = speed;

            // Display
            if (speed === 0) valDisplay.textContent = 'STOP';
            else valDisplay.textContent = (speed > 0 ? '+' : '') + speed + '%';

            sendServoCommand(channel, speed);
        });

        // Return to center on release (snap to stop)
        slider.addEventListener('change', (e) => {
            // Only auto-center CH0 (steering) when joystick isn't active
            if (parseInt(e.target.dataset.channel) === 0) {
                e.target.value = 0;
                state.servoValues[0] = 0;
                valDisplay.textContent = 'STOP';
                sendServoCommand(0, 0);
            }
        });

        // Invert toggle
        invertBtn.addEventListener('click', (e) => {
            const channel = parseInt(e.target.dataset.channel);
            state.servoInverts[channel] = !state.servoInverts[channel];
            e.target.classList.toggle('active');
            localStorage.setItem('servoInverts', JSON.stringify(state.servoInverts));
        });

        sliderWrap.appendChild(slider);
        ch.appendChild(label);
        ch.appendChild(sliderWrap);
        ch.appendChild(valDisplay);
        ch.appendChild(invertBtn);

        if (i === 0) {
            if (driveGrid) driveGrid.appendChild(ch);
        } else if (i === 1 || i === 2) {
            if (gimbalGrid) gimbalGrid.appendChild(ch);
        } else {
            if (armGrid) armGrid.appendChild(ch);
        }
    }

    // Zero all servos
    const btnResetServos = document.getElementById('btn-reset-servos');

    function sendServoCommand(channel, speed) {
        // Apply inversion
        let actualSpeed = state.servoInverts[channel] ? -speed : speed;
        // Map -100..+100 to 0..180 for continuous rotation (90 = stop)
        let pulse = Math.round(90 + (actualSpeed * 90 / 100));
        pulse = Math.max(0, Math.min(180, pulse));

        fetch('/api/servo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: channel, angle: pulse })
        }).catch(() => {});
    }

    // ══════════════════════════════════════════
    // 4. TELEMETRY POLLING
    // ══════════════════════════════════════════
    setInterval(() => {
        fetch('/api/telemetry')
            .then(res => res.json())
            .then(data => {
                // Temperature
                const temp = data.temp || 0;
                document.getElementById('val-temp').textContent = temp.toFixed(1) + '°C';
                const tempPct = Math.min(100, Math.max(0, (temp / 60) * 100));
                const barTemp = document.getElementById('bar-temp');
                barTemp.style.width = tempPct + '%';
                if (temp > 50) {
                    barTemp.className = 'telem-bar danger';
                    document.getElementById('val-temp').className = 'telem-value danger';
                } else if (temp > 40) {
                    barTemp.className = 'telem-bar warning';
                    document.getElementById('val-temp').className = 'telem-value warning';
                } else {
                    barTemp.className = 'telem-bar';
                    document.getElementById('val-temp').className = 'telem-value';
                }

                // Humidity
                const hum = data.hum || 0;
                document.getElementById('val-hum').textContent = hum.toFixed(1) + '%';
                document.getElementById('bar-hum').style.width = hum + '%';

                // Pressure (normalize 950-1050 hPa to 0-100%)
                const pres = data.pres || 0;
                document.getElementById('val-pres').textContent = pres.toFixed(0) + 'hPa';
                const presPct = Math.min(100, Math.max(0, ((pres - 950) / 100) * 100));
                document.getElementById('bar-pres').style.width = presPct + '%';

                // Gas
                const gasK = (data.gas || 0) / 1000;
                document.getElementById('val-gas').textContent = gasK.toFixed(1) + 'KΩ';
                const gasPct = Math.min(100, Math.max(0, gasK / 5 * 100));
                document.getElementById('bar-gas').style.width = gasPct + '%';

                // Log Gas History
                state.gasHistory.push(gasK);
                if (state.gasHistory.length > 50) state.gasHistory.shift();

                // Sleep Cycle Logic
                const hour = new Date().getHours();
                if (window.sleepCycleEnabled) {
                    if (hour >= 22 || hour < 6) {
                        // Sleepy time!
                        if (state.currentEmotion !== 4) {
                            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 4 }) }); // Sleepy
                            state.currentEmotion = 4;
                            document.getElementById('cam-frame').style.opacity = '0.3'; // dim screen
                        }
                        if (Math.random() < 0.05) fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: 'snore' }) });
                    } else {
                        document.getElementById('cam-frame').style.opacity = '1';
                    }
                }

                // IMU Roll/Pitch (center at 50% for -90..+90)
                if (data.roll !== undefined) {
                    document.getElementById('val-roll').textContent = data.roll.toFixed(1) + '°';
                    document.getElementById('bar-roll').style.width = (50 + (data.roll / 180) * 50) + '%';
                }
                if (data.pitch !== undefined) {
                    document.getElementById('val-pitch').textContent = data.pitch.toFixed(1) + '°';
                    document.getElementById('bar-pitch').style.width = (50 + (data.pitch / 180) * 50) + '%';
                    document.getElementById('cam-pitch').textContent = `PIT ${data.pitch.toFixed(1)}°`;
                }

                // Heap / RSSI from extended telemetry
                if (data.heap) document.getElementById('heap-info').textContent = `HEAP: ${(data.heap / 1024).toFixed(0)}KB`;
                if (data.rssi) document.getElementById('wifi-rssi').textContent = `RSSI: ${data.rssi}dBm`;

                // Connection status
                document.getElementById('conn-status').textContent = '⬤ ONLINE';
                document.getElementById('conn-status').className = 'conn-badge online';
                document.getElementById('sys-alert').textContent = '';
                state.connected = true;
            })
            .catch(() => {
                document.getElementById('conn-status').textContent = '⬤ OFFLINE';
                document.getElementById('conn-status').className = 'conn-badge offline';
                document.getElementById('sys-alert').textContent = '⚠ NO LINK';
                state.connected = false;
            });
    }, 2000);

    // ══════════════════════════════════════════
    // 5. CAMERA STREAM
    // ══════════════════════════════════════════
    fetch('/api/config')
        .then(res => res.json())
        .then(data => {
            if (data.cam_ip) {
                document.getElementById('cam-stream').src = `http://${data.cam_ip}/stream`;
            }
        }).catch(() => {});

    // ══════════════════════════════════════════
    // 6. PERSONA / EMOTIONS
    // ══════════════════════════════════════════
    const emotionGrid = document.getElementById('emotion-grid');
    emotionGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.emo-btn');
        if (!btn) return;

        const emotion = parseInt(btn.dataset.emotion);
        state.currentEmotion = emotion;

        // Update active button
        emotionGrid.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Get custom params
        const eyeColor = document.getElementById('eye-color').value;
        const eyeSize = parseInt(document.getElementById('eye-size').value);
        const blinkRate = parseInt(document.getElementById('blink-rate').value);

        fetch('/api/persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emotion: emotion,
                eyeColor: eyeColor,
                eyeSize: eyeSize,
                blinkRate: blinkRate
            })
        }).catch(() => {});
    });

    // Persona settings toggle
    document.getElementById('persona-settings-btn').addEventListener('click', () => {
        const panel = document.getElementById('persona-custom');
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    });

    // Live persona customization
    ['eye-color', 'eye-size', 'blink-rate'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            // Send current persona with updated params
            fetch('/api/persona', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emotion: state.currentEmotion,
                    eyeColor: document.getElementById('eye-color').value,
                    eyeSize: parseInt(document.getElementById('eye-size').value),
                    blinkRate: parseInt(document.getElementById('blink-rate').value)
                })
            }).catch(() => {});
        });
    });

    // ══════════════════════════════════════════
    // 7. ENTERTAINMENT
    // ══════════════════════════════════════════
    document.querySelectorAll('.sfx-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sound = e.target.closest('.sfx-btn').dataset.sound;
            fetch('/api/sound', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sound: sound })
            }).catch(() => {});
            // Visual feedback
            e.target.closest('.sfx-btn').style.boxShadow = '0 0 15px ' + getComputedStyle(document.documentElement).getPropertyValue('--accent-green');
            setTimeout(() => { e.target.closest('.sfx-btn').style.boxShadow = ''; }, 300);
        });
    });

    // Dance mode
    const danceBtn = document.getElementById('btn-dance');
    let danceInterval = null;
    danceBtn.addEventListener('click', () => {
        state.danceMode = !state.danceMode;
        danceBtn.classList.toggle('active');
        if (state.danceMode) {
            danceBtn.textContent = '⏹ STOP DANCE';
            let step = 0;
            const danceSequence = [
                { speed: 50, turn: -80 },
                { speed: 50, turn: 80 },
                { speed: -30, turn: 0 },
                { speed: 60, turn: 0 },
                { speed: 0, turn: -100 },
                { speed: 0, turn: 100 },
            ];
            danceInterval = setInterval(() => {
                const cmd = danceSequence[step % danceSequence.length];
                sendMotorCommand(cmd.speed, cmd.turn);
                step++;
            }, 500);
        } else {
            danceBtn.textContent = '💃 DANCE MODE';
            clearInterval(danceInterval);
            sendMotorCommand(0, 0);
        }
    });

    // Auto wander
    const wanderBtn = document.getElementById('btn-wander');
    let wanderInterval = null;
    wanderBtn.addEventListener('click', () => {
        state.wanderMode = !state.wanderMode;
        wanderBtn.classList.toggle('active');
        if (state.wanderMode) {
            wanderBtn.textContent = '⏹ STOP WANDER';
            wanderInterval = setInterval(() => {
                const speed = 30 + Math.random() * 30;
                const turn = (Math.random() - 0.5) * 60;
                sendMotorCommand(speed, turn);
            }, 2000);
        } else {
            wanderBtn.textContent = '🧭 AUTO WANDER';
            clearInterval(wanderInterval);
            sendMotorCommand(0, 0);
        }
    });

    // Toss Treat
    document.getElementById('btn-treat').addEventListener('click', () => {
        fetch('/api/action?cmd=treat').catch(() => {});
        document.getElementById('btn-treat').style.transform = 'scale(0.95)';
        setTimeout(() => { document.getElementById('btn-treat').style.transform = ''; }, 150);
        // Ensure UI updates to happy
        document.querySelector('.emo-btn[data-emotion="1"]').click();
    });

    // ══════════════════════════════════════════
    // 8. SETTINGS
    // ══════════════════════════════════════════
    document.getElementById('settings-toggle').addEventListener('click', () => {
        const body = document.getElementById('settings-body');
        const btn = document.getElementById('settings-toggle');
        if (body.style.display === 'none') {
            body.style.display = 'block';
            btn.textContent = '▲';
        } else {
            body.style.display = 'none';
            btn.textContent = '▼';
        }
    });

    // Motor trim
    const trimL = document.getElementById('trim-left');
    const trimR = document.getElementById('trim-right');
    trimL.value = state.motorTrimL;
    trimR.value = state.motorTrimR;
    document.getElementById('trim-left-val').textContent = state.motorTrimL;
    document.getElementById('trim-right-val').textContent = state.motorTrimR;

    trimL.addEventListener('input', (e) => {
        state.motorTrimL = parseInt(e.target.value);
        document.getElementById('trim-left-val').textContent = state.motorTrimL;
    });
    trimR.addEventListener('input', (e) => {
        state.motorTrimR = parseInt(e.target.value);
        document.getElementById('trim-right-val').textContent = state.motorTrimR;
    });

    // Cam flip/mirror toggles
    const camFlipBtn = document.getElementById('cam-flip');
    const camMirrorBtn = document.getElementById('cam-mirror');
    if (state.camFlip) camFlipBtn.classList.add('active');
    if (state.camMirror) camMirrorBtn.classList.add('active');
    camFlipBtn.textContent = state.camFlip ? 'ON' : 'OFF';
    camMirrorBtn.textContent = state.camMirror ? 'ON' : 'OFF';

    camFlipBtn.addEventListener('click', () => {
        state.camFlip = !state.camFlip;
        camFlipBtn.classList.toggle('active');
        camFlipBtn.textContent = state.camFlip ? 'ON' : 'OFF';
        localStorage.setItem('camFlip', state.camFlip);
    });
    camMirrorBtn.addEventListener('click', () => {
        state.camMirror = !state.camMirror;
        camMirrorBtn.classList.toggle('active');
        camMirrorBtn.textContent = state.camMirror ? 'ON' : 'OFF';
        localStorage.setItem('camMirror', state.camMirror);
    });

    // Theme selector
    const themeSelect = document.getElementById('hud-theme');
    if (themeSelect) {
        themeSelect.value = state.hudTheme;
        themeSelect.addEventListener('change', (e) => {
            state.hudTheme = e.target.value;
            localStorage.setItem('hudTheme', state.hudTheme);
            document.body.className = state.hudTheme === 'green' ? '' : `theme-${state.hudTheme}`;
            // Update joystick color if needed
            manager.options.color = getComputedStyle(document.body).getPropertyValue('--accent-green').trim();
        });
    }

    // Save config
    document.getElementById('btn-save-config').addEventListener('click', () => {
        localStorage.setItem('motorTrimL', state.motorTrimL);
        localStorage.setItem('motorTrimR', state.motorTrimR);
        localStorage.setItem('servoInverts', JSON.stringify(state.servoInverts));

        // Also push to device
        fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trimL: state.motorTrimL,
                trimR: state.motorTrimR,
                servoInverts: state.servoInverts,
                camFlip: state.camFlip,
                camMirror: state.camMirror
            })
        }).then(() => {
            document.getElementById('sys-alert').textContent = '✓ CONFIG SAVED';
            document.getElementById('sys-alert').style.color = '#00ff41';
            setTimeout(() => {
                document.getElementById('sys-alert').textContent = '';
                document.getElementById('sys-alert').style.color = '';
            }, 2000);
        }).catch(() => {});
    });

    // Reboot
    document.getElementById('btn-reboot').addEventListener('click', () => {
        if (confirm('Reboot BuddyBot Core?')) {
            fetch('/api/reboot', { method: 'POST' }).catch(() => {});
        }
    });

    // ══════════════════════════════════════════
    // PHASE 4 ADVANCED AI TRIGGERS
    // ══════════════════════════════════════════
    document.getElementById('btn-sentry-patrol').addEventListener('click', (e) => {
        state.sentryMode = (state.sentryMode + 1) % 3;
        const btn = e.target;
        
        if (state.sentryMode === 0) {
            btn.style.background = '';
            btn.style.color = '';
            btn.textContent = '👮 SENTRY PATROL';
            document.getElementById('sys-alert').textContent = 'PATROL OFF';
        } else if (state.sentryMode === 1) {
            btn.style.background = '#ff0055';
            btn.style.color = '#fff';
            btn.textContent = '🔴 RECORDING ROUTE';
            document.getElementById('sys-alert').textContent = 'RECORDING ROUTE. DRIVE NOW.';
            state.sentryRoute = []; // clear old
            state.sentryStartTime = Date.now();
        } else if (state.sentryMode === 2) {
            btn.style.background = '#00ff41';
            btn.style.color = '#000';
            btn.textContent = '▶️ PLAYING ROUTE';
            document.getElementById('sys-alert').textContent = 'AUTO-PATROL ENGAGED';
            state.sentryStartTime = Date.now();
        }
    });

    document.getElementById('btn-sleep-cycle').addEventListener('click', (e) => {
        window.sleepCycleEnabled = !window.sleepCycleEnabled;
        e.target.style.background = window.sleepCycleEnabled ? '#5500ff' : '';
        e.target.style.color = window.sleepCycleEnabled ? '#fff' : '';
        document.getElementById('sys-alert').textContent = window.sleepCycleEnabled ? 'SLEEP TIMER ON' : 'SLEEP TIMER OFF';
    });
});
