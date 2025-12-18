#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"

#include "DHT22.h"

#define DHT_GPIO 4   // <<< Change GPIO here (D4 recommended)

static const char *TAG = "MAIN";

void app_main(void)
{
    ESP_LOGI(TAG, "Initializing DHT22...");
    dht22_init(DHT_GPIO);

    while (1)
    {
        dht22_reading_t r;

        if (dht22_read(&r) == ESP_OK)
        {
            ESP_LOGI(TAG, "Temp: %.1f°C Hum: %.1f%%", r.temperature, r.humidity);
        }
        else
        {
            ESP_LOGE(TAG, "Failed to read DHT22");
        }

        vTaskDelay(pdMS_TO_TICKS(2000)); // 2s delay
    }
}
