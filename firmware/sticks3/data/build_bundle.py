import os

js_files = [
    "app.js",
    "hardware.js",
    "drive.js",
    "play.js",
    "buddy.js",
    "ai.js",
    "settings.js"
]

with open("bundle.js", "w", encoding="utf-8") as outfile:
    for f in js_files:
        with open(f, "r", encoding="utf-8") as infile:
            outfile.write(infile.read())
            outfile.write("\n\n")

print("Successfully created bundle.js (UTF-8)")
