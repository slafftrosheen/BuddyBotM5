/* ═══════════════════════════════════════════════════════
   BUDDYBOT M5 — GAMIFICATION ENGINE (HYBRID ARCHITECTURE)
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ── 1. TAMAGOTCHI & LEVELING SYSTEM ──
    const state = {
        xp: parseInt(localStorage.getItem('botXP') || '0'),
        level: parseInt(localStorage.getItem('botLevel') || '1'),
        health: parseFloat(localStorage.getItem('botHealth') || '100'),
        hunger: parseFloat(localStorage.getItem('botHunger') || '100'),
        energy: parseFloat(localStorage.getItem('botEnergy') || '100'),
        happiness: parseFloat(localStorage.getItem('botHappiness') || '100'),
        guardMode: false,
        colorGame: false,
        autoNav: false,
        faceTrack: false,
        colorTrack: false,
        qrScan: false
    };

    function updateNeedsUI() {
        document.getElementById('val-xp').textContent = `${state.xp}/${state.level * 100}`;
        document.getElementById('bar-xp').style.width = Math.min(100, (state.xp / (state.level * 100)) * 100) + '%';
        document.getElementById('lvl-badge').textContent = `LVL ${state.level}`;

        document.getElementById('val-hunger').textContent = Math.round(state.hunger) + '%';
        document.getElementById('bar-hunger').style.width = state.hunger + '%';
        document.getElementById('val-energy').textContent = Math.round(state.energy) + '%';
        document.getElementById('bar-energy').style.width = state.energy + '%';
        document.getElementById('val-happy').textContent = Math.round(state.happiness) + '%';
        document.getElementById('bar-happy').style.width = state.happiness + '%';
        document.getElementById('val-hp').textContent = Math.round(state.health) + '%';
        document.getElementById('bar-hp').style.width = state.health + '%';

        // Warning colors
        document.getElementById('bar-hunger').style.background = state.hunger < 30 ? '#ff0000' : '#ffaa00';
        document.getElementById('bar-energy').style.background = state.energy < 30 ? '#ff0000' : '#00ffaa';
        document.getElementById('bar-happy').style.background = state.happiness < 30 ? '#ff0000' : '#ff00ff';
    }

    function addXP(amount) {
        state.xp += amount;
        const required = state.level * 100;
        if (state.xp >= required) {
            state.xp -= required;
            state.level++;
            // Level Up Celebration!
            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 4 }) }); // Excited
            fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: 'melody' }) });
            document.getElementById('sys-alert').textContent = `★ LEVEL UP: ${state.level} ★`;
            setTimeout(() => { document.getElementById('sys-alert').textContent = ''; }, 3000);
        }
        saveNeeds();
    }

    function saveNeeds() {
        localStorage.setItem('botXP', state.xp);
        localStorage.setItem('botLevel', state.level);
        localStorage.setItem('botHealth', state.health);
        localStorage.setItem('botHunger', state.hunger);
        localStorage.setItem('botEnergy', state.energy);
        localStorage.setItem('botHappiness', state.happiness);
        updateNeedsUI();
    }

    // Decay loop (runs every 5 seconds)
    setInterval(() => {
        // Hunger & Happiness decay naturally
        state.hunger = Math.max(0, state.hunger - 0.5); // Slow decay
        state.happiness = Math.max(0, state.happiness - 0.2);
        state.health = Math.min(100, state.health + 0.5); // Slow regen
        
        // Energy logic
        if (window.isDriving) {
            state.energy = Math.max(0, state.energy - 1.5); // Fast drain when driving
        } else if (window.sleepMode || state.guardMode) {
            state.energy = Math.min(100, state.energy + 2.0); // Recharge when sleeping/sentry
        } else {
            state.energy = Math.max(0, state.energy - 0.1); // Idle drain
        }
        
        saveNeeds();

        // Needs-based Persona Override
        if (state.happiness < 20) {
            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 2 }) }); // Angry
        } else if (state.hunger < 20 && Math.random() < 0.3) {
            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 5 }) }); // Sad
        } else if (state.energy < 15 && Math.random() < 0.3) {
            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 3 }) }); // Sleepy
        }
    }, 5000);

    // Tie treat button to hunger
    document.getElementById('btn-treat').addEventListener('click', () => {
        state.hunger = Math.min(100, state.hunger + 25);
        addXP(5); // Reward for feeding
        saveNeeds();
    });

    updateNeedsUI();

    // ── 2. PARROT RECORDER ──
    const btnParrot = document.getElementById('btn-parrot');
    btnParrot.addEventListener('click', () => {
        btnParrot.textContent = '🔴 RECORDING...';
        btnParrot.style.background = '#ff0000';
        fetch('/api/record', { method: 'POST' }).then(() => {
            btnParrot.textContent = '▶ PLAYING...';
            btnParrot.style.background = '#00ffaa';
            // Playback with random pitch (0.7 to 1.5)
            const pitch = (Math.random() * 0.8 + 0.7).toFixed(2);
            return fetch(`/api/playback?pitch=${pitch}`, { method: 'POST' });
        }).then(() => {
            setTimeout(() => {
                btnParrot.textContent = '🦜 PARROT REC';
                btnParrot.style.background = '';
                state.happiness = Math.min(100, state.happiness + 5);
                addXP(10);
            }, 1000);
        }).catch(() => {
            btnParrot.textContent = '🦜 PARROT REC';
            btnParrot.style.background = '';
        });
    });

    // ── 3. VOICE COMMANDS (Web Speech API) ──
    const btnVoice = document.getElementById('btn-voice-cmd');
    let recognition = null;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            document.getElementById('sys-alert').textContent = `CMD: "${transcript}"`;
            
            if (transcript.includes('dance')) {
                document.getElementById('btn-dance').click();
            } else if (transcript.includes('stop') || transcript.includes('halt')) {
                if (document.getElementById('btn-dance').classList.contains('active')) document.getElementById('btn-dance').click();
                if (document.getElementById('btn-wander').classList.contains('active')) document.getElementById('btn-wander').click();
            } else if (transcript.includes('happy')) {
                document.querySelector('.emo-btn[data-emotion="1"]').click();
            } else if (transcript.includes('angry')) {
                document.querySelector('.emo-btn[data-emotion="2"]').click();
            } else if (transcript.includes('treat') || transcript.includes('food')) {
                document.getElementById('btn-treat').click();
            }

            addXP(5);
            setTimeout(() => { document.getElementById('sys-alert').textContent = ''; }, 3000);
        };

        recognition.onend = () => {
            btnVoice.textContent = '🎙️ COMM LINK';
            btnVoice.style.background = '';
        };

        btnVoice.addEventListener('click', () => {
            btnVoice.textContent = 'LISTENING...';
            btnVoice.style.background = '#ff0055';
            recognition.start();
        });
    } else {
        btnVoice.style.opacity = '0.5';
        btnVoice.title = 'Speech API not supported in this browser';
    }

    // ── 4. HIDE AND SEEK PING ──
    document.getElementById('btn-hide-seek').addEventListener('click', () => {
        fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: 'beep' }) });
        addXP(2);
    });

    // ── 5. MUSIC DJ BEATBOX ──
    const djPad = document.getElementById('dj-pad');
    document.getElementById('btn-dj-open').addEventListener('click', () => djPad.style.display = 'block');
    document.getElementById('btn-close-dj').addEventListener('click', () => djPad.style.display = 'none');

    document.querySelectorAll('.dj-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sound = e.target.dataset.sound;
            // Send sound request
            const map = {
                'kick': 'beep',
                'snare': 'laugh',
                'hihat': 'eat',
                'scratch': 'siren'
            };
            fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: map[sound] || 'beep' }) });
            
            // Send quick motor bob
            fetch('/api/motors', { method: 'POST', body: JSON.stringify({ speed: 40, turn: 0, trimL:0, trimR:0 }) });
            setTimeout(() => {
                fetch('/api/motors', { method: 'POST', body: JSON.stringify({ speed: 0, turn: 0, trimL:0, trimR:0 }) });
            }, 100);
            
            addXP(1);
        });
    });

    // ── 6. SIMON SAYS GAME ──
    const simonPad = document.getElementById('simon-pad');
    const simonScore = document.getElementById('simon-score');
    const simonStatus = document.getElementById('simon-status');
    const colors = ['red', 'blue', 'green', 'yellow'];
    let simonSeq = [];
    let playerSeq = [];
    let simonPlaying = false;

    document.getElementById('btn-simon').addEventListener('click', () => {
        simonPad.style.display = 'block';
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
        
        let i = 0;
        const interval = setInterval(() => {
            if (i >= simonSeq.length) {
                clearInterval(interval);
                simonStatus.textContent = "YOUR TURN!";
                return;
            }
            playSimonColor(simonSeq[i]);
            i++;
        }, 1000);
    }

    function playSimonColor(color) {
        // Flash UI
        const btn = document.querySelector(`.simon-btn[data-color="${color}"]`);
        btn.style.opacity = '1';
        setTimeout(() => btn.style.opacity = '0.5', 500);

        // Flash Robot Eyes
        const emoMap = { 'red': 2, 'blue': 5, 'green': 1, 'yellow': 4 };
        fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: emoMap[color] }) });
        fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: 'beep' }) });
    }

    document.querySelectorAll('.simon-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!simonPlaying || simonStatus.textContent !== "YOUR TURN!") return;
            
            const color = e.target.dataset.color;
            playSimonColor(color);
            playerSeq.push(color);

            // Check correctness
            const currentIdx = playerSeq.length - 1;
            if (playerSeq[currentIdx] !== simonSeq[currentIdx]) {
                // FAIL
                simonStatus.textContent = "GAME OVER!";
                fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 5 }) }); // Sad
                fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: 'siren' }) });
                simonPlaying = false;
            } else if (playerSeq.length === simonSeq.length) {
                // SUCCESS ROUND
                simonStatus.textContent = "CORRECT!";
                addXP(5); // XP per round
                setTimeout(nextSimonRound, 1000);
            }
        });
    });

    // ── 7. COMPUTER VISION BASE ──
    const camImg = document.getElementById('cam-stream');
    const canvas = document.createElement('canvas');
    canvas.width = 160; // downscale for processing
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // -- VISIBLE OVERLAY --
    const overlayCanvas = document.getElementById('cam-overlay');
    const overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;

    let lastImageData = null;
    
    document.getElementById('btn-guard-mode').addEventListener('click', (e) => {
        state.guardMode = !state.guardMode;
        e.target.style.background = state.guardMode ? '#ff0000' : '';
        e.target.textContent = state.guardMode ? '🛑 STOP GUARD' : '🛡️ GUARD MODE';
        if (state.guardMode) {
            document.getElementById('sys-alert').textContent = 'GUARD MODE ARMED';
            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 7 }) }); // Alert
            lastImageData = null; // reset
        }
    });

    document.getElementById('btn-color-game').addEventListener('click', (e) => {
        state.colorGame = !state.colorGame;
        e.target.style.background = state.colorGame ? '#ff00aa' : '';
        e.target.textContent = state.colorGame ? '🛑 STOP COLOR' : '🎨 COLOR GAME';
        if (state.colorGame) {
            document.getElementById('sys-alert').textContent = 'SHOW ME RED!';
        }
    });

    document.getElementById('btn-auto-nav').addEventListener('click', (e) => {
        state.autoNav = !state.autoNav;
        e.target.style.background = state.autoNav ? '#00f3ff' : '';
        e.target.style.color = state.autoNav ? '#000' : '';
        e.target.textContent = state.autoNav ? '🛑 STOP AUTO-NAV' : '🛣️ AUTO-NAV';
        if (state.autoNav) {
            document.getElementById('sys-alert').textContent = 'AUTO-NAV ENGAGED';
            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 6 }) }); // Curious
        } else {
            // Stop motors when disengaging
            fetch('/api/motors', { method: 'POST', body: JSON.stringify({ speed: 0, turn: 0, trimL:0, trimR:0 }) });
            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 0 }) }); // Neutral
        }
    });

    document.getElementById('btn-face-track').addEventListener('click', (e) => {
        state.faceTrack = !state.faceTrack;
        e.target.style.background = state.faceTrack ? '#00f3ff' : '';
        e.target.style.color = state.faceTrack ? '#000' : '';
        if(state.faceTrack) {
            document.getElementById('sys-alert').textContent = 'BLOB TRACKING ENGAGED';
            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 6 }) }); // Curious
        }
    });

    document.getElementById('btn-color-track').addEventListener('click', (e) => {
        state.colorTrack = !state.colorTrack;
        e.target.style.background = state.colorTrack ? '#ffaa00' : '';
        e.target.style.color = state.colorTrack ? '#000' : '';
        if(state.colorTrack) {
            document.getElementById('sys-alert').textContent = 'FETCHING GREEN BLOB';
        } else {
            fetch('/api/motors', { method: 'POST', body: JSON.stringify({ speed: 0, turn: 0, trimL:0, trimR:0 }) });
        }
    });

    document.getElementById('btn-qr-scan').addEventListener('click', (e) => {
        state.qrScan = !state.qrScan;
        e.target.style.background = state.qrScan ? '#ff00aa' : '';
        e.target.style.color = state.qrScan ? '#fff' : '';
        if(state.qrScan) document.getElementById('sys-alert').textContent = 'SCANNING WAYPOINTS';
    });

    // CV Variables
    let lastAvgLuma = 0;
    let isStunned = false;

    // CV Loop
    function cvLoop() {
        if (!state.guardMode && !state.colorGame && !state.autoNav && !state.faceTrack && !state.colorTrack && !state.qrScan) {
            requestAnimationFrame(cvLoop);
            return;
        }

        if (camImg.complete && camImg.naturalWidth !== 0) {
            // Draw current camera frame to hidden canvas for processing
            try {
                ctx.drawImage(camImg, 0, 0, canvas.width, canvas.height);
                
                // Clear and prep the visible overlay canvas
                if (overlayCanvas && overlayCtx) {
                    // Match coordinate system so x,y maps perfectly
                    if (overlayCanvas.width !== canvas.width) overlayCanvas.width = canvas.width;
                    if (overlayCanvas.height !== canvas.height) overlayCanvas.height = canvas.height;
                    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                    
                    // If stunned, draw a red tint to the visible UI!
                    if (isStunned) {
                        overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                        overlayCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                    }
                }
                
                const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = currentImageData.data;

                // -- LASER TAG HIT DETECTION --
                if (!isStunned) {
                    let totalLuma = 0;
                    for (let i = 0; i < data.length; i += 16) { // Sparse check
                        totalLuma += (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
                    }
                    let avgLuma = totalLuma / (data.length / 16);
                    
                    if (lastAvgLuma > 0 && avgLuma - lastAvgLuma > 60) {
                        // Flash detected! (Damage)
                        state.health = Math.max(0, state.health - 25);
                        document.getElementById('sys-alert').textContent = '⚠ HIT DETECTED! ⚠';
                        fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: 'sneeze' }) }); // Hurt sound
                        fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 2 }) }); // Angry
                        saveNeeds();
                        
                        isStunned = true;
                        setTimeout(() => { isStunned = false; }, 2000);
                    }
                    lastAvgLuma = avgLuma;
                }

                // If stunned, skip other tracking
                if (!isStunned) {

                // -- GUARD MODE (Motion Detection) --
                if (state.guardMode) {
                    if (lastImageData) {
                        let diffPixels = 0;
                        for (let i = 0; i < data.length; i += 4) {
                            const rDiff = Math.abs(data[i] - lastImageData.data[i]);
                            const gDiff = Math.abs(data[i+1] - lastImageData.data[i+1]);
                            const bDiff = Math.abs(data[i+2] - lastImageData.data[i+2]);
                            if (rDiff + gDiff + bDiff > 100) diffPixels++;
                        }
                        // If more than 5% of pixels changed significantly -> Motion Detected
                        if (diffPixels > (canvas.width * canvas.height * 0.05)) {
                            document.getElementById('sys-alert').textContent = '⚠ MOTION DETECTED! ⚠';
                            fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: 'siren' }) });
                            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 2 }) }); // Angry
                            // Wait a bit before checking again
                            state.guardMode = false;
                            setTimeout(() => { document.getElementById('btn-guard-mode').click(); }, 5000);
                            addXP(15);
                        }
                    }
                    lastImageData = currentImageData;
                }

                // -- COLOR GAME --
                if (state.colorGame) {
                    let rSum = 0, gSum = 0, bSum = 0;
                    // Check center 100x100 box
                    const cx = canvas.width / 2;
                    const cy = canvas.height / 2;
                    let pxCount = 0;
                    for (let y = cy - 50; y < cy + 50; y++) {
                        for (let x = cx - 50; x < cx + 50; x++) {
                            const i = (y * canvas.width + x) * 4;
                            rSum += data[i];
                            gSum += data[i+1];
                            bSum += data[i+2];
                            pxCount++;
                        }
                    }
                    const rAvg = rSum / pxCount;
                    const gAvg = gSum / pxCount;
                    const bAvg = bSum / pxCount;

                    // Simple check for predominant RED
                    if (rAvg > 150 && rAvg > gAvg * 1.5 && rAvg > bAvg * 1.5) {
                        document.getElementById('sys-alert').textContent = 'I SEE RED! GOOD JOB!';
                        fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 1 }) }); // Happy
                        fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: 'melody' }) });
                        state.colorGame = false;
                        document.getElementById('btn-color-game').click(); // toggle off
                        addXP(20);
                    }
                }
                // -- AUTO NAVIGATION --
                if (state.autoNav) {
                    // Analyze bottom third of the screen for dark obstacles
                    let leftDark = 0, rightDark = 0;
                    const startY = Math.floor(canvas.height * 0.66); // Bottom third
                    const halfX = Math.floor(canvas.width / 2);

                    for (let y = startY; y < canvas.height; y += 4) {
                        for (let x = 0; x < canvas.width; x += 4) {
                            const i = (y * canvas.width + x) * 4;
                            const luma = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
                            if (luma < 50) { // Threshold for "obstacle"
                                if (x < halfX) leftDark++;
                                else rightDark++;
                            }
                        }
                    }

                    // Simple logic: if path is clear, go forward. If blocked, turn.
                    const obstacleThreshold = 100; // pixels
                    let speed = 40; // slow cruising speed
                    let turn = 0;

                    if (leftDark > obstacleThreshold && rightDark > obstacleThreshold) {
                        // Blocked completely!
                        speed = -30; // backup
                        turn = 100; // hard turn
                    } else if (leftDark > obstacleThreshold) {
                        // Blocked left, turn right
                        speed = 30;
                        turn = 100;
                    } else if (rightDark > obstacleThreshold) {
                        // Blocked right, turn left
                        speed = 30;
                        turn = -100;
                    }

                    // Send command to motors & steering
                    fetch('/api/motors', { method: 'POST', body: JSON.stringify({ speed: speed, turn: turn, trimL:0, trimR:0 }) });
                }

                // -- BLOB/FACE TRACKING --
                if (state.faceTrack || state.colorTrack) {
                    // Find the brightest / greenest blob
                    let maxBrightness = 0;
                    let targetX = -1;
                    let targetY = -1;
                    let matchCount = 0;
                    
                    for (let y = 0; y < canvas.height; y += 4) {
                        for (let x = 0; x < canvas.width; x += 4) {
                            const i = (y * canvas.width + x) * 4;
                            let val = 0;
                            if (state.colorTrack) {
                                // Green tracker
                                if (data[i+1] > 150 && data[i+1] > data[i] * 1.2 && data[i+1] > data[i+2] * 1.2) {
                                    val = data[i+1];
                                    matchCount++;
                                }
                            } else {
                                // Brightness tracker
                                val = data[i] + data[i+1] + data[i+2];
                            }

                            if (val > maxBrightness && val > (state.colorTrack ? 150 : 600)) {
                                maxBrightness = val;
                                targetX = x;
                                targetY = y;
                            }
                        }
                    }

                    if (targetX !== -1) {
                        const centerX = canvas.width / 2;
                        const centerY = canvas.height / 2;
                        const errorX = targetX - centerX;
                        const errorY = targetY - centerY;
                        
                        // -- TACTICAL TARGET LOCK UI --
                        // Draw a sci-fi bounding box directly onto the visible canvas overlay
                        if (overlayCtx) {
                            overlayCtx.strokeStyle = state.colorTrack ? '#00ffaa' : '#00f3ff';
                            overlayCtx.lineWidth = 2;
                            
                            // Draw corners
                            const s = 15; // size of box
                            const len = 5; // length of corner marks
                            overlayCtx.beginPath();
                            // Top-left
                            overlayCtx.moveTo(targetX - s, targetY - s + len); overlayCtx.lineTo(targetX - s, targetY - s); overlayCtx.lineTo(targetX - s + len, targetY - s);
                            // Top-right
                            overlayCtx.moveTo(targetX + s - len, targetY - s); overlayCtx.lineTo(targetX + s, targetY - s); overlayCtx.lineTo(targetX + s, targetY - s + len);
                            // Bottom-left
                            overlayCtx.moveTo(targetX - s, targetY + s - len); overlayCtx.lineTo(targetX - s, targetY + s); overlayCtx.lineTo(targetX - s + len, targetY + s);
                            // Bottom-right
                            overlayCtx.moveTo(targetX + s - len, targetY + s); overlayCtx.lineTo(targetX + s, targetY + s); overlayCtx.lineTo(targetX + s, targetY + s - len);
                            overlayCtx.stroke();

                            // Draw cross center
                            overlayCtx.beginPath();
                            overlayCtx.moveTo(targetX - 3, targetY); overlayCtx.lineTo(targetX + 3, targetY);
                            overlayCtx.moveTo(targetX, targetY - 3); overlayCtx.lineTo(targetX, targetY + 3);
                            overlayCtx.stroke();
                        }
                        
                        let pan = 0;
                        let tilt = 0;

                        if (errorX < -20) pan = -50;
                        else if (errorX > 20) pan = 50;

                        if (errorY < -20) tilt = -50;
                        else if (errorY > 20) tilt = 50;

                        if (state.faceTrack) {
                            // Only move camera gimbal (CH1 pan, CH2 tilt)
                            if (pan !== 0) fetch('/api/servo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 1, angle: Math.round(90 + (pan * 90 / 100)) }) });
                            if (tilt !== 0) fetch('/api/servo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 2, angle: Math.round(90 + (tilt * 90 / 100)) }) });
                        }

                        if (state.colorTrack) {
                            // Fetch color: steer robot (CH0/Motors) to target, and keep camera centered if possible
                            let turn = 0;
                            if (errorX < -20) turn = -50;
                            else if (errorX > 20) turn = 50;
                            
                            let speed = 40; // Move forward if fetching
                            
                            // Tamagotchi: Eat the ball if it's very close!
                            if (matchCount > 200) {
                                speed = 0; // Stop
                                document.getElementById('sys-alert').textContent = 'CHOMP! TASTY!';
                                fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: 'melody' }) });
                                fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 1 }) }); // Happy
                                state.hunger = Math.min(100, state.hunger + 30);
                                state.happiness = Math.min(100, state.happiness + 20);
                                saveNeeds();
                                addXP(15);
                                
                                // Turn off color track
                                state.colorTrack = false;
                                const btn = document.getElementById('btn-color-track');
                                if (btn) btn.click();
                            }
                            
                            fetch('/api/motors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ speed: speed, turn: turn, trimL:0, trimR:0 }) });
                        }
                    }
                }

                // -- QR WAYPOINT SCANNER --
                if (state.qrScan && window.jsQR) {
                    const code = jsQR(currentImageData.data, currentImageData.width, currentImageData.height);
                    if (code) {
                        document.getElementById('sys-alert').textContent = `WP REACHED: ${code.data}`;
                        fetch('/api/sound', { method: 'POST', body: JSON.stringify({ sound: 'melody' }) });
                        fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 1 }) }); // Happy
                        state.qrScan = false; // Scan once
                        document.getElementById('btn-qr-scan').click(); // toggle off
                        addXP(50);
                    }
                }
                } // End if (!isStunned)

            } catch (err) {
                // Ignore cross-origin canvas errors if running locally without properly configured server
            }
        }
        
        // Run at ~5 FPS to save CPU (200ms)
        // If tracking, run faster (100ms)
        const delay = (state.autoNav || state.faceTrack || state.colorTrack) ? 100 : 200;
        setTimeout(() => requestAnimationFrame(cvLoop), delay);
    }
    
    cvLoop();

});
