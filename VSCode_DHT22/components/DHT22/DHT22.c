#include <stdio.h>
#include "driver/gpio.h"
#include "esp_timer.h"
#include "esp_rom_sys.h"      // <-- REQUIRED for esp_rom_delay_us()
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "DHT22.h"



#define TAG "DHT22"

static int dht_gpio = -1;

static void dht_delay_us(int us)
{
    esp_rom_delay_us(us);
}

esp_err_t dht22_init(int gpio)
{
    dht_gpio = gpio;
    gpio_set_direction(dht_gpio, GPIO_MODE_OUTPUT);
    gpio_set_level(dht_gpio, 1);
    return ESP_OK;
}

static int read_bit()
{
    while (gpio_get_level(dht_gpio) == 1);
    while (gpio_get_level(dht_gpio) == 0);
    esp_rom_delay_us(40);
    return gpio_get_level(dht_gpio);
}

esp_err_t dht22_read(dht22_reading_t *result)
{
    int data[40] = {0};

    gpio_set_direction(dht_gpio, GPIO_MODE_OUTPUT);
    gpio_set_level(dht_gpio, 0);
    dht_delay_us(20000);

    gpio_set_level(dht_gpio, 1);
    dht_delay_us(30);
    gpio_set_direction(dht_gpio, GPIO_MODE_INPUT);

    while (gpio_get_level(dht_gpio) == 1);
    while (gpio_get_level(dht_gpio) == 0);
    while (gpio_get_level(dht_gpio) == 1);

    for (int i = 0; i < 40; i++) {
        data[i] = read_bit();
        while (gpio_get_level(dht_gpio) == 1);
    }

    int hum = 0, temp = 0;

    for (int i = 0; i < 16; i++) hum = (hum << 1) | data[i];
    for (int i = 16; i < 32; i++) temp = (temp << 1) | data[i];

    result->humidity = hum / 10.0;
    result->temperature = temp / 10.0;

    return ESP_OK;
}
