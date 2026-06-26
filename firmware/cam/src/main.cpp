#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <ESPmDNS.h>
#include "esp_camera.h"
#include <ArduinoOTA.h>
#include "VoiceAssistant.h"
WiFiMulti wifiMulti;
const char* password = "Slaff181188";

// ATOM S3R CAM Pin Definition
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     21
#define SIOD_GPIO_NUM     12
#define SIOC_GPIO_NUM     9
#define Y9_GPIO_NUM       13
#define Y8_GPIO_NUM       11
#define Y7_GPIO_NUM       17
#define Y6_GPIO_NUM       4
#define Y5_GPIO_NUM       48
#define Y4_GPIO_NUM       46
#define Y3_GPIO_NUM       42
#define Y2_GPIO_NUM       3
#define VSYNC_GPIO_NUM    10
#define HREF_GPIO_NUM     14
#define PCLK_GPIO_NUM     40

#define POWER_GPIO_NUM 18

WiFiServer server(80);
camera_fb_t* fb    = NULL;
uint8_t* out_jpg   = NULL;
size_t out_jpg_len = 0;

static void jpegStream(WiFiClient* client);

static camera_config_t camera_config = {
    .pin_pwdn     = PWDN_GPIO_NUM,
    .pin_reset    = RESET_GPIO_NUM,
    .pin_xclk     = XCLK_GPIO_NUM,
    .pin_sscb_sda = SIOD_GPIO_NUM,
    .pin_sscb_scl = SIOC_GPIO_NUM,
    .pin_d7       = Y9_GPIO_NUM,
    .pin_d6       = Y8_GPIO_NUM,
    .pin_d5       = Y7_GPIO_NUM,
    .pin_d4       = Y6_GPIO_NUM,
    .pin_d3       = Y5_GPIO_NUM,
    .pin_d2       = Y4_GPIO_NUM,
    .pin_d1       = Y3_GPIO_NUM,
    .pin_d0       = Y2_GPIO_NUM,

    .pin_vsync = VSYNC_GPIO_NUM,
    .pin_href  = HREF_GPIO_NUM,
    .pin_pclk  = PCLK_GPIO_NUM,

    .xclk_freq_hz = 20000000,
    .ledc_timer   = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,

    .pixel_format = PIXFORMAT_JPEG,
    .frame_size   = FRAMESIZE_QVGA,
    .jpeg_quality  = 12,
    .fb_count      = 2,
    .fb_location   = CAMERA_FB_IN_PSRAM,
    .grab_mode     = CAMERA_GRAB_LATEST,
    .sccb_i2c_port = 0,
};

void setup() {
    Serial.begin(115200);
    
    // Enable Camera Power
    pinMode(POWER_GPIO_NUM, OUTPUT);
    digitalWrite(POWER_GPIO_NUM, LOW);
    delay(500);

    Serial.setDebugOutput(true);
    Serial.println();
    Serial.printf("PSRAM size: %d, free: %d\n", ESP.getPsramSize(), ESP.getFreePsram());

    esp_err_t err = esp_camera_init(&camera_config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x\n", err);
        delay(1000);
        esp_restart();
    }

    WiFi.mode(WIFI_STA);
    wifiMulti.addAP("STARLINK.TAK", password);
    wifiMulti.addAP("TAK", password);
    
    while (wifiMulti.run() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.println("WiFi connected");

    server.begin();

    Serial.print("Camera Ready! Use 'http://");
    Serial.print(WiFi.localIP());
    Serial.println("/stream");

    if (!MDNS.begin("buddycam")) {
        Serial.println("Error setting up MDNS responder!");
    } else {
        Serial.println("mDNS responder started: buddycam.local");
    }

    initVoiceAssistant();

    ArduinoOTA.setHostname("BuddyBot-Cam");
    ArduinoOTA.begin();
}

void loop() {
    ArduinoOTA.handle();
    handleVoiceAssistant();
    
    WiFiClient client = server.available();  // listen for incoming clients
    if (client) {                            // if you get a client,
        String req = client.readStringUntil('\r');
        client.flush();
        
        if (req.indexOf("/stream") != -1) {
            jpegStream(&client);
        } else {
            // Index page
            client.println("HTTP/1.1 200 OK");
            client.println("Content-Type: text/html");
            client.println("Connection: close");
            client.println();
            client.println("<!DOCTYPE html><html><head><title>Camera Stream</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head><body style=\"background-color:black;color:white;text-align:center;margin:0;padding:0;\"><h2>BuddyBot Camera Feed</h2><img src=\"/stream\" style=\"width:100%;max-width:640px;\"></body></html>");
            client.stop();
        }
    }
}

// used to image stream
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY     = "--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART         = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

static void jpegStream(WiFiClient* client) {
    Serial.println("Image stream start");
    client->println("HTTP/1.1 200 OK");
    client->printf("Content-Type: %s\r\n", _STREAM_CONTENT_TYPE);
    client->println("Content-Disposition: inline; filename=capture.jpg");
    client->println("Access-Control-Allow-Origin: *");
    client->println();
    
    for (;;) {
        ArduinoOTA.handle(); // keep OTA alive during stream
        
        fb = esp_camera_fb_get();
        if (fb) {
            client->print(_STREAM_BOUNDARY);
            client->printf(_STREAM_PART, fb->len);
            
            int32_t to_sends    = fb->len;
            int32_t now_sends   = 0;
            uint8_t* out_buf    = fb->buf;
            uint32_t packet_len = 8 * 1024;
            
            while (to_sends > 0) {
                now_sends = to_sends > packet_len ? packet_len : to_sends;
                if (client->write(out_buf, now_sends) == 0) {
                    goto client_exit;
                }
                out_buf += now_sends;
                to_sends -= now_sends;
            }

            esp_camera_fb_return(fb);
            fb = NULL;
        } else {
            Serial.println("Camera capture failed");
            delay(100);
        }
    }

client_exit:
    if (fb) {
        esp_camera_fb_return(fb);
        fb = NULL;
    }
    client->stop();
    Serial.printf("Image stream end\r\n");
}
