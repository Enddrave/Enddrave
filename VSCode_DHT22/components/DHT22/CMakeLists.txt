idf_component_register(
    SRCS "DHT22 2.c" "DHT22.c"
    INCLUDE_DIRS "."
    REQUIRES driver esp_timer
)
