#include <stdio.h>
#include <stdlib.h>
#include "sci_view.h"
#include "image_png.h"

sci_view_t* load_view(const char* filename)
{
    FILE* fp;
    sci_view_t* view;
    int g;
    
    fp = fopen(filename, "rb");
    
    if(!fp)
    {
        fprintf(stderr, "Could not open %s\n", filename);
        return NULL;
    }
    
    view = (sci_view_t*) malloc(sizeof(sci_view_t));

    fseek(fp, 2, SEEK_SET);     // First 2 bytes are always ignored    
    fread(&view->num_groups, sizeof(uint16), 1, fp);
    
    view->groups = (sci_view_group_t*) calloc(view->num_groups, sizeof(sci_view_group_t));
    
    fread(&view->mirror_bitmask, sizeof(uint16), 1, fp);
    printf("Num groups: %d Mirror mask: 0x%x\n", view->num_groups, view->mirror_bitmask);
    
    for(g = 0; g<view->num_groups; g++)
    {
        sci_view_group_t* group = &view->groups[g];
        uint16 offset;
        int c;
        int mirrored = (0x1 << g) & view->mirror_bitmask;
        
        fseek(fp, 10 + g * 2, SEEK_SET);
        fread(&offset, sizeof(uint16), 1, fp);
        
        fseek(fp, 2 + offset, SEEK_SET);
        fread(&group->num_cells, sizeof(uint16), 1, fp);
        printf("Group %d has %d cells, offset: %d\n", g, group->num_cells, offset);
        
        group->cells = (sci_view_cell_t*) calloc(group->num_cells, sizeof(sci_view_cell_t));
        
        if(mirrored)
            printf("Mirrored!\n");
            
        for(c = 0; c<group->num_cells; c++)
        {
            sci_view_cell_t* cell = &group->cells[c];
            uint16 cell_offset;
            int x = 0, y = 0;
            
            fseek(fp, 6 + offset + c * 2, SEEK_SET);
            fread(&cell_offset, sizeof(uint16), 1, fp);

            fseek(fp, 2 + cell_offset, SEEK_SET);
            
            fread(&cell->w, sizeof(uint16), 1, fp);
            fread(&cell->h, sizeof(uint16), 1, fp);
            fread(&cell->offset_x, sizeof(int8), 1, fp);
            fread(&cell->offset_y, sizeof(int8), 1, fp);
            fread(&cell->transparency, sizeof(uint8), 1, fp);
            
            cell->image = create_image(cell->w, cell->h, 8);
            set_ega_palette(&cell->image->palette);
            
            while(y < cell->h && x < cell->w)
            {
                uint8 b;
                uint8 color;
                int repeat;
                int r;
                
                fread(&b, sizeof(uint8), 1, fp);   
                color = (b & 0xF);
                repeat = (b >> 4);
                
                for(r = 0; r<repeat && y < cell->h; r++)
                {
                    int output_x = x;
                    
                    if(mirrored)
                    {
                        output_x = cell->w - x - 1;
                    }
                    
                    if(color == cell->transparency)
                    {
                        set_pixel_index(cell->image, output_x, y, 0xFF);
                    }
                    else
                        set_pixel_index(cell->image, output_x, y, color);
                
                    x++;
                    if(x >= cell->w)
                    {
                        x = 0;
                        y ++;
                    }
                }
            }
            
            printf("Cell: %dx%d\n", cell->w, cell->h);
        }
    }
    
    fclose(fp);
    
    return view;
}

void save_view(sci_view_t* view, const char* filename)
{
    image_t* atlas;
    int atlas_w = 0;
    int atlas_h = 0;
    int spacing = 1;
    int g, c;
    char temp[100];
    FILE* fp;
    
    for(g = 0; g<view->num_groups; g++)
    {
        for(c = 0; c<view->groups[g].num_cells; c++)
        {
            view->groups[g].cells[c].atlas_x = atlas_w;
            view->groups[g].cells[c].atlas_y = 0;
            atlas_w += view->groups[g].cells[c].w + spacing;
            
            if(view->groups[g].cells[c].h > atlas_h)
                atlas_h = view->groups[g].cells[c].h;
        }
    }

    atlas = create_image(atlas_w, atlas_h, 8);
    set_ega_palette(&atlas->palette);

    for(g = 0; g<view->num_groups; g++)
    {
        for(c = 0; c<view->groups[g].num_cells; c++)
        {
            blit_image(view->groups[g].cells[c].image, atlas, view->groups[g].cells[c].atlas_x, view->groups[g].cells[c].atlas_y);
        }
    }

    sprintf(temp, "%s.png", filename);
    save_png(atlas, temp);
    destroy_image(atlas);
    
    sprintf(temp, "%s.json", filename);
    fp = fopen(temp, "w");
    if(fp)
    {
        fprintf(fp, "{\n");     // Start
//        fprintf(fp, "\t\"numGroups\" : %d\n", view->num_groups);
        fprintf(fp, "\t\"groups\" :\n");
        fprintf(fp, "\t[\n");
        
        for(g = 0; g<view->num_groups; g++)
        {
            sci_view_group_t* group = &view->groups[g];
//            fprintf(fp, "\t\t\"numGroups\" : %d\n", group->num_cells);
            fprintf(fp, "\t\t{ \"cells\" :\n");
            fprintf(fp, "\t\t[\n");
            
            for(c = 0; c<group->num_cells; c++)
            {
                sci_view_cell_t* cell = &group->cells[c];
                fprintf(fp, "\t\t\t{\n");
                fprintf(fp, "\t\t\t\t\"w\" : %d, \"h\" : %d,\n", cell->w, cell->h);
                fprintf(fp, "\t\t\t\t\"offX\" : %d, \"offY\" : %d,\n", cell->offset_x, cell->offset_y);
                fprintf(fp, "\t\t\t\t\"x\" : %d, \"y\" : %d\n", cell->atlas_x, cell->atlas_y);
                fprintf(fp, "\t\t\t}%s\n", 
                    (c == group->num_cells - 1) ? "\n" : ",\n");
            }
            
            fprintf(fp, "\t\t] }%s", g == view->num_groups - 1 ? "\n" : ",\n");
        }
        
        fprintf(fp, "\t]\n");
        fprintf(fp, "}\n");     // End
        
        fclose(fp);
    }
    
}

void destroy_view(sci_view_t* view)
{
    if(view)
    {
        int g, c;
        
        for(g = 0; g<view->num_groups; g++)
        {
            for(c = 0; c<view->groups[g].num_cells; c++)
            {
                image_t* img = view->groups[g].cells[c].image;
                destroy_image(img);
            }
            free(view->groups[g].cells);
        }
        free(view->groups);
        
        free(view);
    }
}
