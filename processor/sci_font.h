#ifndef SCI_FONT_H_
#define SCI_FONT_H_

#include "custom_types.h"
#include "image.h"

typedef struct
{
    uint8 w, h;
    int x, y;   // Offset into font sheet
    image_t* image;
} sci_char_t;

typedef struct
{
    int num_characters;
    int line_height;
    sci_char_t* characters;

    image_t* font_sheet;
} sci_font_t;

sci_font_t* load_font(const char* filename);
void save_font(sci_font_t* font, const char* output_file);
void destroy_font(sci_font_t* font);

#endif
