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
