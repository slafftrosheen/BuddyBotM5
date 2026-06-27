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
                body: JSON.stringify({ emotion: 4 }) // Excited
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

        const emoMap = { 'red': 2, 'blue': 5, 'green': 1, 'yellow': 4 };
        
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
                setTimeout(nextSimonRound, 1000);
            }
        });
    });

});
