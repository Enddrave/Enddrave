#ifndef DHT22_H
#define DHT22_H

#include "esp_err.h"

typedef struct {
    float temperature;
    float humidity;
} dht22_reading_t;

esp_err_t dht22_init(int gpio);
esp_err_t dht22_read(dht22_reading_t *result);

#endif
