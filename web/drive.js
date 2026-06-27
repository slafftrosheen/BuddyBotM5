// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — DRIVE CONTROLLER
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    
    // ── Joystick Setup ──
    const joystickZone = document.getElementById('joystick-zone');
    const throttleFill = document.getElementById('throttle-fill');
    const throttlePct = document.getElementById('throttle-pct');
    const readout = document.getElementById('drive-readout');

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
        // Map joystick to speed/turn (-100 to 100)
        const forward = Math.sin(data.angle.radian) * data.distance;
        const right = Math.cos(data.angle.radian) * data.distance;
        
        motorData.speed = Math.min(100, Math.max(-100, (forward / 75) * 100));
        motorData.turn = Math.min(100, Math.max(-100, (right / 75) * 100));
        
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

    // Command loop (10Hz)
    motorInterval = setInterval(() => {
        if (Math.abs(motorData.speed) > 2 || Math.abs(motorData.turn) > 2) {
            sendMotorCommand(motorData.speed, motorData.turn);
        }
    }, 100);

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
