// ═══════════════════════════════════════════════════════
// BUDDYBOT M5 — HARDWARE (SERVO/MACRO) CONTROLLER
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    const servoMap = [
        { id: 0, name: "STR", grid: "servo-drive-grid", init: 90 },
        { id: 1, name: "PAN", grid: "servo-gimbal-grid", init: 90 },
        { id: 2, name: "TILT", grid: "servo-gimbal-grid", init: 90 },
        { id: 3, name: "SHLD", grid: "servo-arm-grid", init: 90 },
        { id: 4, name: "ELBW", grid: "servo-arm-grid", init: 90 },
        { id: 5, name: "WRST", grid: "servo-arm-grid", init: 90 },
        { id: 6, name: "SPIN", grid: "servo-arm-grid", init: 90 },
        { id: 7, name: "GRAB", grid: "servo-arm-grid", init: 90 }
    ];

    // Build sliders dynamically
    servoMap.forEach(s => {
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
