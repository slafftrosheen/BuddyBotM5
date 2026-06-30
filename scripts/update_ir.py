import os

sticks3_path = "c:/Users/Slaff/BuddyBotM5/firmware/sticks3/platformio.ini"
with open(sticks3_path, 'r', encoding='utf-8') as f:
    data = f.read()
if '-DIR_TX_PIN' not in data:
    data = data.replace('build_flags = \n', 'build_flags = \n\t-DIR_TX_PIN=4\n')
    with open(sticks3_path, 'w', encoding='utf-8') as f:
        f.write(data)

cardputer_path = "c:/Users/Slaff/BuddyBotM5/firmware/cardputer/platformio.ini"
with open(cardputer_path, 'r', encoding='utf-8') as f:
    data = f.read()
if '-DIR_TX_PIN' not in data:
    data = data.replace('build_flags = \n', 'build_flags = \n\t-DIR_TX_PIN=44\n')
    with open(cardputer_path, 'w', encoding='utf-8') as f:
        f.write(data)

print("Updated IR_TX_PIN in platformio.ini")
