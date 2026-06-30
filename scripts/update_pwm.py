import os
import re

targets = ['core', 'sticks3', 'cardputer']
for t in targets:
    cpp_path = f"c:/Users/Slaff/BuddyBotM5/firmware/{t}/src/main.cpp"
    if not os.path.exists(cpp_path): continue

    with open(cpp_path, 'r', encoding='utf-8') as f:
        data = f.read()

    new_logic = '''    else if (buddyConfig.driveType == 2) {
        // GPIO Servos (Optimized for precision continuous rotation)
        static int lastFreqL = -1;
        static int lastPinL = -1;
        static int lastFreqR = -1;
        static int lastPinR = -1;

        if (!gpioServoL.attached() || lastFreqL != buddyConfig.pwmFreq || lastPinL != buddyConfig.drivePinL1) {
            if (gpioServoL.attached()) gpioServoL.detach();
            ESP32PWM::allocateTimer(0);
            gpioServoL.setPeriodHertz(buddyConfig.pwmFreq);
            gpioServoL.attach(buddyConfig.drivePinL1, buddyConfig.pwmMin, buddyConfig.pwmMax);
            lastFreqL = buddyConfig.pwmFreq;
            lastPinL = buddyConfig.drivePinL1;
        }
        if (!gpioServoR.attached() || lastFreqR != buddyConfig.pwmFreq || lastPinR != buddyConfig.drivePinR1) {
            if (gpioServoR.attached()) gpioServoR.detach();
            ESP32PWM::allocateTimer(1);
            gpioServoR.setPeriodHertz(buddyConfig.pwmFreq);
            gpioServoR.attach(buddyConfig.drivePinR1, buddyConfig.pwmMin, buddyConfig.pwmMax);
            lastFreqR = buddyConfig.pwmFreq;
            lastPinR = buddyConfig.drivePinR1;
        }

        int centerBaseL = (buddyConfig.pwmMin + buddyConfig.pwmMax) / 2;
        int centerBaseR = (buddyConfig.pwmMin + buddyConfig.pwmMax) / 2;
        
        // Scale legacy angle offsets (~11us per degree)
        int centerPulseL = centerBaseL + (buddyConfig.driveCenterOffsetL * 11);
        int centerPulseR = centerBaseR + (buddyConfig.driveCenterOffsetR * 11);

        int pulseL;
        if (speedPctM1 >= 0) {
            pulseL = map(speedPctM1, 0, 100, centerPulseL, buddyConfig.pwmMax);
        } else {
            pulseL = map(speedPctM1, -100, 0, buddyConfig.pwmMin, centerPulseL);
        }
        
        int pulseR;
        if (speedPctM2 >= 0) {
            pulseR = map(speedPctM2, 0, 100, centerPulseR, buddyConfig.pwmMax);
        } else {
            pulseR = map(speedPctM2, -100, 0, buddyConfig.pwmMin, centerPulseR);
        }

        gpioServoL.writeMicroseconds(pulseL);
        gpioServoR.writeMicroseconds(pulseR);
    }'''
    
    # We need to replace the old driveType == 2 block
    old_logic_pattern = r'    else if \(buddyConfig\.driveType == 2\) \{.*?gpioServoR\.write\(angleR\);\n    \}'
    data = re.sub(old_logic_pattern, new_logic, data, flags=re.DOTALL)

    with open(cpp_path, 'w', encoding='utf-8') as f:
        f.write(data)

print("Updated main.cpp for all targets with PWM optimizations")
