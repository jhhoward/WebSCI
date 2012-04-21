#include <stdio.h>
#include <memory.h>
#include <stdlib.h>
#include "image_bmp.h"

image_t* load_bmp(const char* filename)
{
    FILE* fp;
    bmp_header_t file_header;
    bmp_info_header_t info_header;
    image_t* output_image;
    uint16 magic;
    size_t data_size;
    int y;
    size_t bytes_per_pixel;
    
    fp = fopen(filename, "rb");
    if(fp == NULL)
    {
        return NULL;
    }

    fread(&magic, sizeof(uint16), 1, fp);
    if(magic != MAGIC_BMP_TYPE)
    {
        fclose(fp);
        return NULL;
    }
    
    
    fread(&file_header, sizeof(bmp_header_t), 1, fp);
    
    fread(&info_header, sizeof(bmp_info_header_t), 1, fp);

    output_image = create_image(info_header.width, info_header.height, info_header.bit_count);

    if(output_image == NULL)
    {
        fclose(fp);
        return NULL;
    }
    
    if(info_header.bit_count == 8)
    {
        uint8 pal_data[256 * 4];
        int x;
        
        fread(&pal_data, sizeof(uint8) * 256 * 4, 1, fp);
        
        for(x = 0; x<256; x++) 
        {
            output_image->palette.colors[x].b = pal_data[x * 4 + 0];
            output_image->palette.colors[x].g = pal_data[x * 4 + 1];
            output_image->palette.colors[x].r = pal_data[x * 4 + 2];
            output_image->palette.colors[x].a = 0;
        }
    }
    
   /* printf("size: %d width: %d height: %d planes: %d bit_count: %d compression: %d size_image: %d x_pel: %d y_pel: %d clr_used: %d clr_important: %d\n",
    info_header.size, //specifies the number of bytes required by the struct
    info_header.width, //specifies width in pixels
    info_header.height, //species height in pixels
    info_header.planes, //specifies the number of color planes, must be 1
    info_header.bit_count, //specifies the number of bit per pixel
    info_header.compression,//spcifies the type of compression
    info_header.size_image, //size of image in bytes
    info_header.x_pels_per_meter, //number of pixels per meter in x axis
    info_header.y_pels_per_meter, //number of pixels per meter in y axis
    info_header.clr_used, //number of colors used by th ebitmap
    info_header.clr_important);*/
    
    fseek(fp, file_header.offset_bits, SEEK_SET);
    
    bytes_per_pixel = (info_header.bit_count >> 3);
    
    for(y = 0; y<output_image->height; y++)
    {
        uint8* ptr = ((uint8*)output_image->pixel_data) + output_image->width * (output_image->height - y - 1);
        fread(ptr, output_image->width * bytes_per_pixel, 1, fp);
    }
    
    fclose(fp);
    
    return output_image;
}
