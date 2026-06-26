/* ═══════════════════════════════════════════════════════
   BUDDYBOT M5 — AI CHATBOT ENGINE
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    const chatbotPad = document.getElementById('chatbot-pad');
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-chat-send');
    
    document.getElementById('btn-chatbot-open').addEventListener('click', () => {
        chatbotPad.style.display = 'flex';
        // Auto greet
        if (chatHistory.children.length === 1) {
            botReply("Hello! I am BuddyBot. How can I assist you in your tactical mission today?");
        }
    });
    
    document.getElementById('btn-close-chatbot').addEventListener('click', () => {
        chatbotPad.style.display = 'none';
    });

    function appendMessage(sender, text, color) {
        const div = document.createElement('div');
        div.style.color = color;
        div.style.marginBottom = '5px';
        div.textContent = `[${sender}] ${text}`;
        chatHistory.appendChild(div);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            // Try to find a robotic/male voice
            const voices = window.speechSynthesis.getVoices();
            const robotVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Zira') || v.name.includes('David'));
            if (robotVoice) utterance.voice = robotVoice;
            utterance.pitch = 0.8;
            utterance.rate = 1.1;
            window.speechSynthesis.speak(utterance);
        }
    }

    // Load API Key
    const apiKeyInput = document.getElementById('openai-key');
    apiKeyInput.value = localStorage.getItem('openai_key') || '';
    apiKeyInput.addEventListener('change', () => {
        localStorage.setItem('openai_key', apiKeyInput.value);
    });

    async function fetchLLMResponse(text, base64Image = null) {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            botReply("I need an OpenAI API key in the configuration field to process that request.");
            return;
        }

        appendMessage('SYSTEM', 'Transmitting to AI Core...', '#888');

        try {
            let messages = [
                { role: "system", content: `You are BuddyBot, a tactical robot companion. Keep responses short (1-2 sentences), cool, and slightly robotic.
If the user asks you to perform a physical action, you MUST output a JSON block at the very end of your response inside triple backticks like this:
\`\`\`json
{ "action": "drive", "direction": "forward" }
\`\`\`
Valid actions: 
- "drive" (directions: "forward", "backward", "left", "right", "stop")
- "gesture" (types: "wave", "highfive", "grab", "stop")
- "emotion" (types: 0=neutral, 1=happy, 2=angry, 3=sleepy, 4=excited, 5=sad, 6=curious, 7=alert)` }
            ];

            if (base64Image) {
                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: text },
                        { type: "image_url", image_url: { url: base64Image } }
                    ]
                });
            } else {
                messages.push({ role: "user", content: text });
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: base64Image ? "gpt-4o-mini" : "gpt-4o-mini",
                    messages: messages,
                    max_tokens: 100
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0]) {
                const fullText = data.choices[0].message.content;
                let replyText = fullText;
                
                // Parse JSON Action
                const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch) {
                    try {
                        const cmd = JSON.parse(jsonMatch[1]);
                        executeLLMCommand(cmd);
                        replyText = fullText.replace(jsonMatch[0], '').trim();
                    } catch(e) {
                        console.error("Failed to parse LLM JSON", e);
                    }
                }
                
                botReply(replyText);
            } else {
                botReply("Error processing AI response. Check API key.");
            }
        } catch (e) {
            botReply("Network error reaching AI core.");
        }
    }

    // Basic Rule-based Chatbot (ELIZA style) combined with LLM
    function processInput(text) {
        appendMessage('USER', text, '#fff');
        chatInput.value = '';

        const lower = text.toLowerCase();
        
        // Fast hardware triggers first
        if (lower.includes('dance')) {
            botReply("Initiating dance protocol!");
            document.getElementById('btn-dance').click();
            return;
        } else if (lower.includes('food') || lower.includes('hungry') || lower.includes('treat')) {
            botReply("I am always ready for a treat!");
            document.getElementById('btn-treat').click();
            return;
        }

        // If API key is present, use LLM. Else fallback.
        if (apiKeyInput.value.trim() !== '') {
            fetchLLMResponse(text);
        } else {
            setTimeout(() => {
                if (lower.includes('hello') || lower.includes('hi')) {
                    botReply("Greetings commander. Systems are nominal.");
                } else if (lower.includes('status')) {
                    botReply("All systems operational. Telemetry is within acceptable parameters.");
                } else if (lower.includes('thank you') || lower.includes('thanks')) {
                    botReply("You are welcome. Ready for next command.");
                } else {
                    botReply("I am processing that request. Please provide an API key for complex processing.");
                }
            }, 500);
        }
    }

    document.getElementById('btn-chat-vision').addEventListener('click', () => {
        // Grab image from CV Canvas
        const canvas = document.getElementById('cv-canvas');
        const dataUrl = canvas.toDataURL('image/jpeg');
        appendMessage('USER', '[Sent Camera Snapshot]', '#fff');
        fetchLLMResponse("What do you see in this image? Be brief and tactical.", dataUrl);
    });

    btnSend.addEventListener('click', () => {
        if (chatInput.value.trim() !== '') {
            processInput(chatInput.value.trim());
        }
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            processInput(chatInput.value.trim());
        }
    });

    // Hook into Web Speech API from gamification.js
    // We override the existing Comm Link to also feed into the Chatbot
    const btnVoice = document.getElementById('btn-voice-cmd');
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (chatbotPad.style.display !== 'none') {
                processInput(transcript);
            } else {
                document.getElementById('sys-alert').textContent = `CMD: "${transcript}"`;
                // Legacy fast commands
                const lower = transcript.toLowerCase();
                if (lower.includes('dance')) document.getElementById('btn-dance').click();
                else if (lower.includes('happy')) fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 1 }) });
                else if (lower.includes('angry')) fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: 2 }) });
                else if (lower.includes('stop')) {
                    if (document.getElementById('btn-dance').classList.contains('active')) document.getElementById('btn-dance').click();
                    fetch('/api/motors', { method: 'POST', body: JSON.stringify({ speed: 0, turn: 0, trimL:0, trimR:0 }) });
                }
            }
        };

        recognition.onend = () => {
            btnVoice.textContent = '🎙️ COMM LINK';
            btnVoice.style.background = '';
        };

        // Replace the listener
        const newBtnVoice = btnVoice.cloneNode(true);
        btnVoice.parentNode.replaceChild(newBtnVoice, btnVoice);
        
        newBtnVoice.addEventListener('click', () => {
            newBtnVoice.textContent = 'LISTENING...';
            newBtnVoice.style.background = '#ff0055';
            recognition.start();
        });
    }

    // ── Execute Physical Commands from LLM ──
    function executeLLMCommand(cmd) {
        if (cmd.action === 'drive') {
            let s = 0, t = 0;
            if (cmd.direction === 'forward') s = 80;
            if (cmd.direction === 'backward') s = -80;
            if (cmd.direction === 'left') t = -80;
            if (cmd.direction === 'right') t = 80;
            
            fetch('/api/motors', { method: 'POST', body: JSON.stringify({ speed: s, turn: t, trimL:0, trimR:0 }) });
            if (s !== 0 || t !== 0) {
                setTimeout(() => {
                    fetch('/api/motors', { method: 'POST', body: JSON.stringify({ speed: 0, turn: 0, trimL:0, trimR:0 }) });
                }, 1000); // Drive for 1 sec
            }
        } else if (cmd.action === 'emotion') {
            fetch('/api/persona', { method: 'POST', body: JSON.stringify({ emotion: parseInt(cmd.type) }) });
        } else if (cmd.action === 'gesture') {
            // Trigger macro by simulating a button click (since macroEngine is in app.js scope)
            const btnMap = {
                'wave': 'btn-macro-wave',
                'highfive': 'btn-macro-highfive',
                'grab': 'btn-macro-grab',
                'stop': 'btn-macro-stop'
            };
            const btnId = btnMap[cmd.type];
            if (btnId) {
                const btn = document.getElementById(btnId);
                if (btn) btn.click();
            }
        }
    }

});
