#include <stdio.h>
#include <stdlib.h>
#include "sci_cursor.h"
#include "image_png.h"

#define CURSOR_WIDTH 16
#define CURSOR_HEIGHT 16

sci_cursor_t* load_cursor(const char* filename)
{
    FILE* fp;
    sci_cursor_t* cursor;
    int y, x;
    
    fp = fopen(filename, "rb");
    
    if(fp == NULL)
    {
        return NULL;
    }
    
    cursor = (sci_cursor_t*) malloc(sizeof(sci_cursor_t));
    
    fseek(fp, 2, SEEK_SET);
    fread(&cursor->hotspot_x, sizeof(uint16), 1, fp);
    fread(&cursor->hotspot_y, sizeof(uint16), 1, fp);
    
    cursor->image = create_image(16, 16, 8);
    
    for(y = 0; y<CURSOR_HEIGHT; y++)
    {
        uint16 mask;
        fread(&mask, sizeof(uint16), 1, fp);

        for(x = 0; x<CURSOR_WIDTH; x++)
        {
            if(mask & (0x1 << (CURSOR_WIDTH - x - 1)))
            {
                set_pixel_index(cursor->image, x, y, 255);
            }
            else
            {
                set_pixel_index(cursor->image, x, y, 0);
            }
        }
    }
    
    for(y = 0; y<CURSOR_HEIGHT; y++)
    {
        uint16 mask;
        fread(&mask, sizeof(uint16), 1, fp);

        for(x = 0; x<CURSOR_WIDTH; x++)
        {
            if(get_pixel_index(cursor->image, x, y) != 255)
            {
                if(mask & (0x1 << (CURSOR_WIDTH - x - 1)))
                {
                    set_pixel_index(cursor->image, x, y, 15);
                }
                else
                {
                    set_pixel_index(cursor->image, x, y, 0);
                }
            }
        }
    }
    set_ega_palette(&cursor->image->palette);
    
    fclose(fp);
    return cursor;
}

void save_cursor(sci_cursor_t* cursor, const char* filename)
{
    char temp[100];
    FILE* fp;

    if(cursor != NULL)
    {
        sprintf(temp, "%s.png", filename);
        save_png(cursor->image, temp);

        sprintf(temp, "%s.json", filename);
        fp = fopen(temp, "w");
        if(fp != NULL)
        {
            fprintf(fp, "{\n");
            fprintf(fp, "\t\"hotspotX\" : %d,\n", cursor->hotspot_x);
            fprintf(fp, "\t\"hotspotY\" : %d\n", cursor->hotspot_y);
            fprintf(fp, "}\n");
        
            fclose(fp);
        }
    }
}

void destroy_cursor(sci_cursor_t* cursor)
{
    if(cursor != NULL)
    {
        destroy_image(cursor->image);
        free(cursor);
    }
}

