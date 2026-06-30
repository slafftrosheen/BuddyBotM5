import sys

path = "c:/Users/Slaff/BuddyBotM5/firmware/core/src/main.cpp"
with open(path, 'r', encoding='utf-8') as f:
    data = f.read()

data = data.replace('CoreS3.', 'M5.')
data = data.replace('CoreS3', 'M5')

with open(path, 'w', encoding='utf-8') as f:
    f.write(data)

print("Updated CoreS3 to M5")
