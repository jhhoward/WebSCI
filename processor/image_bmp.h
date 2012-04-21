#ifndef BMP_H_
#define BMP_H_

#include "image.h"

#define MAGIC_BMP_TYPE 0x4D42

typedef struct
{
    uint32 size;
    uint16 reserved1;
    uint16 reserved2;
    uint32 offset_bits;
} bmp_header_t;

typedef struct
{
    uint32 size; //specifies the number of bytes required by the struct
    int32 width; //specifies width in pixels
    int32 height; //species height in pixels
    uint16 planes; //specifies the number of color planes, must be 1
    uint16 bit_count; //specifies the number of bit per pixel
    uint32 compression;//spcifies the type of compression
    uint32 size_image; //size of image in bytes
    int32 x_pels_per_meter; //number of pixels per meter in x axis
    int32 y_pels_per_meter; //number of pixels per meter in y axis
    uint32 clr_used; //number of colors used by th ebitmap
    uint32 clr_important; //number of colors that are important
} bmp_info_header_t;

image_t* load_bmp(const char* filename);

#endif
