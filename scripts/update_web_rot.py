import os

path_html = "c:/Users/Slaff/BuddyBotM5/web/index.html"
with open(path_html, 'r', encoding='utf-8') as f:
    html = f.read()

if 'id="screenRotation"' not in html:
    new_html = html.replace(
        '<input type="number" id="driveCenterOffsetR" class="w-full bg-slate-700 rounded p-2 text-white border border-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none" min="-90" max="90">',
        '<input type="number" id="driveCenterOffsetR" class="w-full bg-slate-700 rounded p-2 text-white border border-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none" min="-90" max="90">\n                        </div>\n                        <div>\n                            <label class="block text-sm text-slate-400 mb-1">Screen Rotation (0-3)</label>\n                            <input type="number" id="screenRotation" class="w-full bg-slate-700 rounded p-2 text-white border border-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none" min="0" max="3">'
    )
    with open(path_html, 'w', encoding='utf-8') as f:
        f.write(new_html)

path_js = "c:/Users/Slaff/BuddyBotM5/web/settings.js"
with open(path_js, 'r', encoding='utf-8') as f:
    js = f.read()

if 'document.getElementById("screenRotation").value' not in js:
    js = js.replace('document.getElementById("driveCenterOffsetR").value = config.driveCenterOffsetR;', 'document.getElementById("driveCenterOffsetR").value = config.driveCenterOffsetR;\n        document.getElementById("screenRotation").value = config.screenRotation;')
    js = js.replace('driveCenterOffsetR: parseInt(document.getElementById("driveCenterOffsetR").value),', 'driveCenterOffsetR: parseInt(document.getElementById("driveCenterOffsetR").value),\n        screenRotation: parseInt(document.getElementById("screenRotation").value),')
    with open(path_js, 'w', encoding='utf-8') as f:
        f.write(js)

print("Updated Web UI with screenRotation")
