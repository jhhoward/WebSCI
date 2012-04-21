#ifndef SCI_VIEW_H_
#define SCI_VIEW_H_

#include "custom_types.h"
#include "image.h"

typedef struct
{
    uint16 w;
    uint16 h;
    int8 offset_x;
    int8 offset_y;
    int atlas_x;
    int atlas_y;
    uint8 transparency;
    image_t* image;
} sci_view_cell_t;

typedef struct
{
    uint16 num_cells;
    sci_view_cell_t* cells;
} sci_view_group_t;

typedef struct
{
    uint16 num_groups;
    uint16 mirror_bitmask;    
    
    sci_view_group_t* groups;
} sci_view_t;

sci_view_t* load_view(const char* filename);
void save_view(sci_view_t* view, const char* filename);
void destroy_view(sci_view_t* view);

#endif
