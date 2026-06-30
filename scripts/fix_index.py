import os

html_path = "C:/Users/Slaff/BuddyBotM5/web/index.html"
with open(html_path, 'r', encoding='utf-8') as f:
    data = f.read()

data = data.replace('<script src="ui.js"></script>', '')
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(data)

print("Fixed index.html script tag")
