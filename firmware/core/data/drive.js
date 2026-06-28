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

    speedSlider.addEventListener('input', (e) => {
        speedVal.textContent = e.target.value;
    });

    const manager = nipplejs.create({
        zone: joystickZone,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'var(--accent-blue)',
        size: 150
    });

    let motorData = { speed: 0, turn: 0 };
    let motorInterval = null;

    manager.on('move', (evt, data) => {
        // NippleJS angle.radian maps 0=Right, PI/2=Up, PI=Left, 3PI/2=Down
        // We want 'Up' (forward) to be positive, 'Down' (backward) to be negative.
        const forward = Math.sin(data.angle.radian) * data.distance;
        // 'Right' (0) should result in a positive turn, 'Left' (PI) in a negative turn.
        const right = Math.cos(data.angle.radian) * data.distance;
        
        const limitLevel = parseInt(speedSlider.value);
        const limitMultiplier = limitLevel * 0.2; // Level 1=20%, 5=100%
        
        // Ensure distance maps from -100 to 100 correctly (max distance is usually 50-75)
        const maxDist = manager.options.size / 2;
        
        motorData.speed = Math.min(100, Math.max(-100, (forward / maxDist) * 100)) * limitMultiplier;
        motorData.turn = Math.min(100, Math.max(-100, (right / maxDist) * 100)) * limitMultiplier;
        
        updateThrottleUI();
    });

    manager.on('end', () => {
        motorData.speed = 0;
        motorData.turn = 0;
        updateThrottleUI();
        sendMotorCommand(0, 0); // Force immediate stop
    });

    function updateThrottleUI() {
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

    // Command loop (debounced/throttled)
    let isSending = false;
    motorInterval = setInterval(() => {
        if (!isSending && (Math.abs(motorData.speed) > 2 || Math.abs(motorData.turn) > 2)) {
            isSending = true;
            sendMotorCommand(motorData.speed, motorData.turn);
            setTimeout(() => { isSending = false; }, 100); // Wait at least 100ms before next send
        }
    }, 50);

    // ── Action Buttons ──
    const danceBtn = document.getElementById('btn-dance');
    let danceActive = false;
    let danceSeq = null;

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
            showAlert('Dancing!', 'var(--accent-pink)');
        } else {
            danceBtn.innerHTML = '💃 Dance!';
            clearInterval(danceSeq);
            sendMotorCommand(0, 0);
        }
    });

    const wanderBtn = document.getElementById('btn-wander');
    let wanderActive = false;
    let wanderSeq = null;

    wanderBtn.addEventListener('click', () => {
        wanderActive = !wanderActive;
        wanderBtn.classList.toggle('active');
        
        if (wanderActive) {
            wanderBtn.innerHTML = '🛑 Stop Explore';
            wanderSeq = setInterval(() => {
                sendMotorCommand(30 + Math.random()*30, (Math.random()-0.5)*60);
            }, 2000);
            showAlert('Exploring...', 'var(--accent-blue)');
        } else {
            wanderBtn.innerHTML = '🧭 Explore';
            clearInterval(wanderSeq);
            sendMotorCommand(0, 0);
        }
    });

});
