#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "sci_font.h"
#include "sci_view.h"
#include "sci_cursor.h"
#include "image_png.h"
#include "image_bmp.h"

enum process_type
{
    PROCESS_UNDEFINED,
    PROCESS_FONT,
    PROCESS_PIC,
    PROCESS_VIEW,
    PROCESS_CURSOR
};

void print_usage(char* exec_name_)
{
    printf("Usage: %s [-o OUTPUT_FILE] {-font -pic -view} INPUT_FILE\n", exec_name_);
    exit(0);
}

void process_font(char* input_file, char* output_file)
{
    sci_font_t* font = load_font(input_file);
    
    if(font)
    {
        save_font(font, output_file);
        destroy_font(font);
    }
}

void process_cursor(char* input_file, char* output_file)
{
    sci_cursor_t* cursor = load_cursor(input_file);
    
    if(cursor)
    {
        save_cursor(cursor, output_file);
        destroy_cursor(cursor);
    }
}

void process_pic(char* input_file, char* output_file)
{
    char temp[100];
    image_t* view;
    image_t* control;
    image_t* priority;
    
    sprintf(temp, "%s.v.bmp", input_file);
    view = load_bmp(temp);

    sprintf(temp, "%s.p.bmp", input_file);
    priority = load_bmp(temp);

    sprintf(temp, "%s.c.bmp", input_file);
    control = load_bmp(temp);

    if(view && priority && control)
    {
        image_t* combined = create_image(view->width * 17, view->height, 8);
        
        if(combined)
        {
            int p;
            int x, y;
            uint8 pixel_index;
            
            memcpy(&combined->palette, &view->palette, sizeof(palette_t));
            
            for(p = 0; p<16; p ++)
            {
                for(y = 0; y<view->height; y++) 
                {
                    for(x = 0; x<view->width; x++)
                    {
                        if(get_pixel_index(priority, x, y) == p)
                        {
                            pixel_index = get_pixel_index(view, x, y);
                        }
                        else pixel_index = 255;
                    
                        set_pixel_index(combined, p * view->width + x, y,
                                        pixel_index);
                    }
                }
            }
            
            blit_image(control, combined, view->width * 16, 0);
            
            save_png(combined, output_file);
        }
    }
    else
    {
        fprintf(stderr, "Error opening view/priority/control layers\n");
    }
    
    destroy_image(view);
    destroy_image(control);
    destroy_image(priority);
}

void process_view(char* input_file, char* output_file)
{
    sci_view_t* view = load_view(input_file);
    
    if(view)
    {
        save_view(view, output_file);
        destroy_view(view);
    }
}

int main(int argc, char* argv[]) {
    int a;
    process_type process = PROCESS_UNDEFINED;
    char* input_file = NULL;
    char* output_file = NULL;
    
    for(a = 1; a < argc; a++)
    {
        if(!strcmp(argv[a], "-font"))
        {
            if(process == PROCESS_UNDEFINED)
                process = PROCESS_FONT;
            else
                print_usage(argv[0]);
        }
        else if(!strcmp(argv[a], "-pic"))
        {
            if(process == PROCESS_UNDEFINED)
                process = PROCESS_PIC;
            else
                print_usage(argv[0]);
        }
        else if(!strcmp(argv[a], "-view"))
        {
            if(process == PROCESS_UNDEFINED)
                process = PROCESS_VIEW;
            else
                print_usage(argv[0]);
        }
        else if(!strcmp(argv[a], "-cursor"))
        {
            if(process == PROCESS_UNDEFINED)
                process = PROCESS_CURSOR;
            else
                print_usage(argv[0]);
        }
        else if(!strcmp(argv[a], "-o") && a + 1 < argc)
        {
            if(argv[a + 1][0] == '-' || output_file != NULL)
                print_usage(argv[0]);
                
            output_file = argv[a + 1];
            a++;
        }
        else if(input_file == NULL)
        {
            input_file = argv[a];
        }
        else print_usage(argv[0]);
    }

    if(input_file && output_file)
    {
        switch(process)
        {
            case PROCESS_UNDEFINED:
                print_usage(argv[0]);
                break;
            case PROCESS_FONT:
                {
                    process_font(input_file, output_file);
                }
                break;
            case PROCESS_PIC:
                {
                    process_pic(input_file, output_file);
                }
                break;
            case PROCESS_VIEW:
                {
                    process_view(input_file, output_file);
                }
                break;
            case PROCESS_CURSOR:
                {
                    process_cursor(input_file, output_file);
                }
                break;
        }
    }
    else print_usage(argv[0]);

    return 0;
}
