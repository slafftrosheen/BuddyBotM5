import os

html_path = "C:/Users/Slaff/BuddyBotM5/web/index.html"
with open(html_path, 'r', encoding='utf-8') as f:
    data = f.read()

script_new = '''    <script src="ui.js"></script>
    <script>
        // Custom Logic for IR and Keybinds
        function addIrButton() {
            const label = document.getElementById('ir-label').value;
            const proto = document.getElementById('ir-protocol').value;
            const hex = document.getElementById('ir-hex').value;
            if(!label || !proto || !hex) return;
            
            fetch('/api/ir_add', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({label: label, protocol: proto, hex: hex})
            }).then(() => {
                loadIrButtons();
                document.getElementById('ir-label').value = "";
                document.getElementById('ir-hex').value = "";
            });
        }
        function loadIrButtons() {
            fetch('/api/ir_list').then(res => res.json()).then(data => {
                const list = document.getElementById('ir-button-list');
                if(!list) return;
                list.innerHTML = "";
                data.forEach(b => {
                    const btn = document.createElement('button');
                    btn.className = 'action-btn';
                    btn.style.width = '100%';
                    btn.innerText = ??  ();
                    btn.onclick = () => {
                        fetch('/api/ir_send', {
                            method:'POST', 
                            headers:{'Content-Type':'application/json'}, 
                            body:JSON.stringify({protocol:b.protocol, hex:b.hex})
                        });
                    };
                    list.appendChild(btn);
                });
            }).catch(e => {});
        }
        
        function addKeybind() {
            const key = document.getElementById('kb-key').value;
            const action = document.getElementById('kb-action').value;
            if(!key || !action) return;
            fetch('/api/kb_add', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({key: key, action: action})
            }).then(() => {
                loadKeybinds();
                document.getElementById('kb-key').value = "";
                document.getElementById('kb-action').value = "";
            });
        }
        function loadKeybinds() {
            fetch('/api/kb_list').then(res => res.json()).then(data => {
                const list = document.getElementById('kb-button-list');
                if(!list) return;
                list.innerHTML = "";
                data.forEach(b => {
                    const div = document.createElement('div');
                    div.style = "background:rgba(255,255,255,0.1); padding:5px; border-radius:5px;";
                    div.innerText = Key '' ? ;
                    list.appendChild(div);
                });
            }).catch(e => {});
        }

        // Load on init
        setTimeout(() => {
            loadIrButtons();
            loadKeybinds();
            
            // Sync RTC
            const d = new Date();
            fetch('/api/rtc_sync', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    y: d.getFullYear(), m: d.getMonth()+1, d: d.getDate(),
                    h: d.getHours(), min: d.getMinutes(), s: d.getSeconds()
                })
            });
        }, 2000);
    </script>
</body>'''
data = data.replace('    <script src="ui.js"></script>\n</body>', script_new)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(data)

print("Updated index.html with JS")
