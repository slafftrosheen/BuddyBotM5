import sys

path_h = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/persona.h"
with open(path_h, 'r', encoding='utf-8') as f:
    h_data = f.read()

if 'EMO_WONDER' not in h_data:
    h_data = h_data.replace('EMO_SHOCKED,', 'EMO_SHOCKED,\n    EMO_WONDER,')
    with open(path_h, 'w', encoding='utf-8') as f:
        f.write(h_data)

path_cpp = "c:/Users/Slaff/BuddyBotM5/firmware/shared/lib/BuddyBotCore/src/persona.cpp"
with open(path_cpp, 'r', encoding='utf-8') as f:
    cpp_data = f.read()

if 'case EMO_WONDER:' not in cpp_data:
    cpp_data = cpp_data.replace('case EMO_SHOCKED:', 'case EMO_WONDER:\n            roboEyes.curious = 1;\n            roboEyes.happy = 1;\n            break;\n        case EMO_SHOCKED:')
    with open(path_cpp, 'w', encoding='utf-8') as f:
        f.write(cpp_data)

print("Added EMO_WONDER")
