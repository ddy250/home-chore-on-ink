#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <epdiy.h>

#include "peripheral.h"
#include "firasans_20.h"

#define WAVEFORM EPD_BUILTIN_WAVEFORM
#define DEMO_BOARD epd_board_v7
EpdiyHighlevelState hl;

// עדכן כאן שוב את פרטי הרשת והשרת שלך
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASS;
const char* backendUrl = "http://192.168.68.103:3000/api/tasks/generate";

void refreshScreen(const char* text) {
    Serial.println("🔄 Refreshing E-Ink Screen...");
    epd_hl_set_all_white(&hl);

    // חזרה למיקום קרסור פשוט ויציב
    int cursor_x = 20;
    int cursor_y = epd_rotated_display_height() / 2 - 100;

    EpdFontProperties font_props = epd_font_properties_default();
    font_props.flags = EPD_DRAW_ALIGN_LEFT;

    epd_write_string(&FiraSans_20, (char*)text, &cursor_x, &cursor_y, epd_hl_get_framebuffer(&hl), &font_props);

    epd_poweron();
    epd_hl_update_screen(&hl, MODE_GL16, epd_ambient_temperature());
    epd_poweroff();
    Serial.println("✅ Screen Update Done!");
}

void fetchTasksFromNestJS() {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        Serial.print("📡 Connecting to Backend: ");
        Serial.println(backendUrl);

        refreshScreen("Connecting to NestJS Backend...");

        http.begin(backendUrl);
        int httpResponseCode = http.GET();

        if (httpResponseCode > 0) {
            Serial.print("HTTP Response code: ");
            Serial.println(httpResponseCode);

            String payload = http.getString();
            Serial.println("Payload: " + payload);

            // הדפסה פשוטה בשורה אחת כמו שעבד קודם
            String displayMsg = "Status: " + String(httpResponseCode) + "\n\n" + payload;
            refreshScreen(displayMsg.c_str());
        } else {
            Serial.print("❌ Error code: ");
            Serial.println(httpResponseCode);
            String errorMsg = "HTTP Request Failed!\nCode: " + String(httpResponseCode);
            refreshScreen(errorMsg.c_str());
        }

        http.end();
    } else {
        Serial.println("WiFi Disconnected");
    }
}

void setup() {
    Serial.begin(115200);
    delay(2000);

    epd_init(&DEMO_BOARD, &ED047TC1, EPD_LUT_64K);
    hl = epd_hl_init(WAVEFORM);
    epd_set_rotation(EPD_ROT_INVERTED_PORTRAIT);
    epd_set_lcd_pixel_clock_MHz(17);

    epd_poweron();
    epd_clear();
    epd_poweroff();

    WiFi.begin(ssid, password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi Connected!");
        fetchTasksFromNestJS();
    } else {
        refreshScreen("WiFi Connection Failed.");
    }
}

void loop() {
    delay(1000);
}