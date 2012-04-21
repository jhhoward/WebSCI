#include <stdio.h>
#include <stdlib.h>
#include <png.h>
#include <unistd.h>
#include <stdarg.h>
#include "image_png.h"

void abort_(const char * s, ...)
{
    va_list args;
    va_start(args, s);
    vfprintf(stderr, s, args);
    fprintf(stderr, "\n");
    va_end(args);
    abort();
}
//
void save_png(image_t* img, const char* filename)
{
    FILE* fp;
    png_structp png_ptr;
    png_infop info_ptr;
    png_bytep* rows;
    png_color palette[256];
    png_byte pal_alpha[256];
    png_color_16 trans_color[256];
    
    fp = fopen(filename, "wb");
    
    if(fp == NULL)
    {
        return;
    }
    
    png_ptr = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);

    if (!png_ptr)
            abort_("[write_png_file] png_create_write_struct failed");

    info_ptr = png_create_info_struct(png_ptr);
    if (!info_ptr)
            abort_("[write_png_file] png_create_info_struct failed");

    if (setjmp(png_jmpbuf(png_ptr)))
            abort_("[write_png_file] Error during init_io");

    png_init_io(png_ptr, fp);


    /* write header */
    if (setjmp(png_jmpbuf(png_ptr)))
            abort_("[write_png_file] Error during writing header");

    png_set_IHDR(png_ptr, info_ptr, img->width, img->height,
                 img->color_depth, img->color_depth == 8 ? PNG_COLOR_TYPE_PALETTE : PNG_COLOR_TYPE_RGB, 
                 PNG_INTERLACE_NONE, PNG_COMPRESSION_TYPE_BASE, PNG_FILTER_TYPE_BASE);

    if(img->color_depth == 8)
    {
        for(int p = 0; p<256; p++)
        {
            palette[p].red = img->palette.colors[p].r;
            palette[p].green = img->palette.colors[p].g;
            palette[p].blue = img->palette.colors[p].b;
            
            trans_color[p].index = p;
            trans_color[p].red = img->palette.colors[p].r;
            trans_color[p].green = img->palette.colors[p].g;
            trans_color[p].blue = img->palette.colors[p].b;
            trans_color[p].gray = 0;
            pal_alpha[p] = 255;
        }

        pal_alpha[255] = 0;
    
        if (setjmp(png_jmpbuf(png_ptr)))
                abort_("[write_png_file] Error during writing palette");
                
        png_set_PLTE(png_ptr, info_ptr, palette, 256);
        
        png_set_tRNS(png_ptr, info_ptr, pal_alpha, 256, trans_color);
    }
    
    png_write_info(png_ptr, info_ptr);
    
    rows = (png_bytep*) malloc(img->height * sizeof(png_bytep));
    for(int y = 0; y<img->height; y++)
    {
        rows[y] = ((uint8*)img->pixel_data) + y * img->width;
    }

    /* write bytes */
    if (setjmp(png_jmpbuf(png_ptr)))
            abort_("[write_png_file] Error during writing bytes");

    png_write_image(png_ptr, rows);

    /* end write */
    if (setjmp(png_jmpbuf(png_ptr)))
            abort_("[write_png_file] Error during end of write");

    png_write_end(png_ptr, NULL);

    free(rows);

    fclose(fp);    
}
