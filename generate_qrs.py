import qrcode
import os

waypoints = [
    "WAYPOINT_ALPHA",
    "WAYPOINT_BRAVO",
    "WAYPOINT_CHARLIE",
    "COMMAND_DANCE",
    "COMMAND_SPIN"
]

os.makedirs("qrcodes", exist_ok=True)

for wp in waypoints:
    img = qrcode.make(wp)
    img.save(f"qrcodes/{wp}.png")
    print(f"Generated qrcodes/{wp}.png")

print("QR Codes generated successfully! You can print these out to use with the robot's Waypoint Scanner.")
