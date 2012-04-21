#ifndef SCI_CURSOR_H_
#define SCI_CURSOR_H_

#include "image.h"

typedef struct
{
    uint16 hotspot_x, hotspot_y;
    image_t* image;
} sci_cursor_t;

sci_cursor_t* load_cursor(const char* filename);
void save_cursor(sci_cursor_t* cursor, const char* filename);
void destroy_cursor(sci_cursor_t* cursor);

#endif
