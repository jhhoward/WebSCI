#ifndef IMAGE_H_
#define IMAGE_H_

#include "custom_types.h"

typedef struct
{
    uint8 r, g, b, a;
} color_t;

typedef struct 
{
    color_t colors[256];
} palette_t;

typedef struct
{
    int width;
    int height;
    int color_depth;
    void* pixel_data;   
    
    palette_t palette;
} image_t;

image_t* create_image(int width, int height, int color_depth);
void destroy_image(image_t* img);

void resize_image_canvas(image_t* img, int new_width, int new_height);

color_t get_pixel(image_t* img, int x, int y);
uint8 get_pixel_index(image_t* img, int x, int y);
void set_pixel(image_t* img, int x, int y, color_t color);
void set_pixel_index(image_t* img, int x, int y, uint8 index);
void blit_image(image_t* src, image_t* dest, int x, int y);

void set_ega_palette(palette_t* img);

#endif

