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
