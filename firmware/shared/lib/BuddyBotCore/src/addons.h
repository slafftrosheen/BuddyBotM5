#pragma once
#include <Arduino.h>

void initAddons();
void updateAddons();

// Exposed telemetry data
extern float addon_env_temp;
extern float addon_env_hum;
extern float addon_env_pres;
extern int addon_tof_dist;
extern bool has_env_unit;
extern bool has_tof_unit;
