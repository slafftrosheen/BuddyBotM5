import os

files = {
    'index_html': 'web/index.html',
    'style_css': 'web/style.css',
    'app_js': 'web/app.js'
}

out_file = 'firmware/core/include/web_assets.h'
with open(out_file, 'w', encoding='utf-8') as f:
    f.write('#pragma once\n#include <Arduino.h>\n\n')
    for var_name, filepath in files.items():
        with open(filepath, 'r', encoding='utf-8') as infile:
            content = infile.read()
        f.write(f'const char {var_name}[] PROGMEM = R"rawliteral(\n')
        f.write(content)
        f.write('\n)rawliteral";\n\n')
print("Generated web_assets.h")
