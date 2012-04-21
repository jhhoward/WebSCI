#include <stdlib.h>
#include <stdio.h>
#include <memory.h>
#include "image.h"

color_t COLOR_BLACK;

image_t* create_image(int width, int height, int color_depth)
{
    int color_depth_bytes = 1;
    image_t* img;

    printf("Creating image of size: %dx%d:%d\n", width, height, color_depth);

    switch(color_depth)
    {
        case 8:
        color_depth_bytes = 1;
        break;
        
        case 32:
        color_depth_bytes = 4;
        break;
        
        default:
        return NULL;
    }
    
    img = (image_t*) malloc(sizeof(image_t));
    
    img->width = width;
    img->height = height;
    img->color_depth = color_depth;
    
    img->pixel_data = malloc(color_depth_bytes * width * height);
    memset(img->pixel_data, 0xFF, color_depth_bytes * width * height);
    
    return img;
}

void destroy_image(image_t* img)
{
    if(!img)
        return;
        
    free(img->pixel_data);
    free(img);
}

color_t get_pixel(image_t* img, int x, int y)
{
    switch(img->color_depth)
    {
        case 32:
        return ((color_t*) img->pixel_data)[y * img->width + x];
        break;
        
        case 8:
        return img->palette.colors[((uint8*)img->pixel_data)[y * img->width + x]];
        break;
    }
    
    return COLOR_BLACK;
}

uint8 get_pixel_index(image_t* img, int x, int y)
{
    if(img->color_depth == 8)
    {
        return ((uint8*)img->pixel_data)[y * img->width + x];
    }
    
    return 0;
}

void set_pixel(image_t* img, int x, int y, color_t color)
{
    if(img->color_depth == 32)
    {
       ((color_t*)img->pixel_data)[y * img->width + x] = color;
    }
}

void set_pixel_index(image_t* img, int x, int y, uint8 index)
{
    if(img->color_depth == 8)
    {
        ((uint8*)img->pixel_data)[y * img->width + x] = index;
    }
}

void blit_image(image_t* src, image_t* dest, int x, int y)
{
    int copy_width = src->width;
    int copy_height = src->height;
    size_t pixel_bytes = (src->color_depth >> 3);
    int row;
    
    if(src == dest || src->color_depth != dest->color_depth)
        return;

    if(copy_width + x > dest->width) 
        copy_width = dest->width - x;
    if(copy_height + y > dest->height) 
        copy_height = dest->height - y;
        
    for(row = 0; row<copy_height; row++)
    {
        memcpy(((uint8*)dest->pixel_data) + ((row + y) * dest->width + x) * pixel_bytes, 
                ((uint8*)src->pixel_data) + row * src->width * pixel_bytes, pixel_bytes * copy_width);
    }
}

void resize_image_canvas(image_t* img, int new_width, int new_height)
{
    size_t pixel_bytes = (img->color_depth >> 3);
    int y;
    int copy_width = img->width < new_width ? img->width : new_width;
    int copy_height = img->height < new_height ? img->height : new_height;
    uint8* new_data = (uint8*) malloc(new_width * new_height * pixel_bytes);

    memset(new_data, 0xFF, new_width * new_height * pixel_bytes);
    
    for(y = 0; y<copy_height; y++)
    {
        memcpy(new_data + y * new_width, ((uint8*)img->pixel_data) + y * img->width * pixel_bytes, pixel_bytes * copy_width);
    }
    
    free(img->pixel_data);
    img->width = new_width;
    img->height = new_height;
    img->pixel_data = new_data;
}

void set_ega_palette(palette_t* pal)
{
    pal->colors[0].r  = 0x000; pal->colors[0].g  = 0x000; pal->colors[0].b  = 0x000;
    pal->colors[1].r  = 0x000; pal->colors[1].g  = 0x000; pal->colors[1].b  = 0x0AA;
	pal->colors[2].r  = 0x000; pal->colors[2].g  = 0x0AA; pal->colors[2].b  = 0x000;
	pal->colors[3].r  = 0x000; pal->colors[3].g  = 0x0AA; pal->colors[3].b  = 0x0AA;
	pal->colors[4].r  = 0x0AA; pal->colors[4].g  = 0x000; pal->colors[4].b  = 0x000;
	pal->colors[5].r  = 0x0AA; pal->colors[5].g  = 0x000; pal->colors[5].b  = 0x0AA;
	pal->colors[6].r  = 0x0AA; pal->colors[6].g  = 0x055; pal->colors[6].b  = 0x000;
	pal->colors[7].r  = 0x0AA; pal->colors[7].g  = 0x0AA; pal->colors[7].b  = 0x0AA;
	pal->colors[8].r  = 0x055; pal->colors[8].g  = 0x055; pal->colors[8].b  = 0x055;
	pal->colors[9].r  = 0x055; pal->colors[9].g  = 0x055; pal->colors[9].b  = 0x0FF;
	pal->colors[10].r = 0x055; pal->colors[10].g = 0x0FF; pal->colors[10].b = 0x055;
	pal->colors[11].r = 0x055; pal->colors[11].g = 0x0FF; pal->colors[11].b = 0x0FF;
	pal->colors[12].r = 0x0FF; pal->colors[12].g = 0x055; pal->colors[12].b = 0x055;
	pal->colors[13].r = 0x0FF; pal->colors[13].g = 0x055; pal->colors[13].b = 0x0FF;
	pal->colors[14].r = 0x0FF; pal->colors[14].g = 0x0FF; pal->colors[14].b = 0x055;
	pal->colors[15].r = 0x0FF; pal->colors[15].g = 0x0FF; pal->colors[15].b = 0x0FF;
}
