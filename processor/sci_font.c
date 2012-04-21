#include <stdio.h>
#include <stdlib.h>
#include <memory.h>
#include "sci_font.h"
#include "image_png.h"

sci_font_t* load_font(const char* filename)
{
    FILE* fp;
    uint16 magic_header;
    uint16 num_characters;
    uint16 line_height;
    sci_font_t* font;
    int c;
    int characters_per_line = 20;
    int font_sheet_width = 0;
    int font_sheet_height = 0;
    int sheet_x_offset = 0;
    int sheet_y_offset = 0;
    int char_line_count = 0;
    int next_line_offset = 0;
    int char_spacing = 1;
    
    fp = fopen(filename, "rb");
    
    if(!fp)
    {
        return NULL;
    }
    
    fread(&magic_header, sizeof(uint16), 1, fp);
    fread(&magic_header, sizeof(uint16), 1, fp);
    fread(&num_characters, sizeof(uint16), 1, fp);
    fread(&line_height, sizeof(uint16), 1, fp);

    printf("Magic number: %d Num characters: %d Line height: %d\n", magic_header, num_characters, line_height);
    
    font = (sci_font_t*) malloc(sizeof(sci_font_t));
    font->num_characters = num_characters;
    font->characters = (sci_char_t*) calloc(num_characters, sizeof(sci_char_t));
    font->line_height = line_height;
    font->font_sheet = NULL;
    
    for(c = 0; c<num_characters; c++)
    {
        uint16 offset;
        sci_char_t* character = &font->characters[c];
        
        fseek(fp, 8 + c * 2, SEEK_SET);
        fread(&offset, sizeof(uint16), 1, fp);
        printf("Offset: %x\n", offset);
        
        fseek(fp, offset + 2, SEEK_SET);
        fread(&character->w, sizeof(uint8), 1, fp);
        fread(&character->h, sizeof(uint8), 1, fp);
        printf("Character is %dx%d\n", character->w, character->h);
    
        if(char_line_count > characters_per_line)
        {
            char_line_count = 0;
            sheet_x_offset = 0;
            sheet_y_offset += next_line_offset;
            next_line_offset = 0;
        }

        if(sheet_x_offset + character->w + char_spacing > font_sheet_width)
            font_sheet_width = sheet_x_offset + character->w + char_spacing;
            
        if(sheet_y_offset + character->h + char_spacing > font_sheet_height)
            font_sheet_height = sheet_y_offset + character->h + char_spacing;
            
        if(character->h + char_spacing > next_line_offset)
            next_line_offset = character->h + char_spacing;
            
        character->x = sheet_x_offset;
        character->y = sheet_y_offset;
            
        sheet_x_offset += character->w + char_spacing;
            
        char_line_count++;
        
        character->image = create_image(character->w, character->h, 8);
        
        if(character->image != NULL)
        {
            int x, y;
            uint8 b;
            
            for(y = 0; y<character->h; y++)
            {
                for(x = 0; x<character->w; x++)
                {
                    if((x & 7) == 0)
                    {
                        fread(&b, sizeof(uint8), 1, fp);
                    }
                    
                    if(b & 0x80)
                    {
                        set_pixel_index(character->image, x, y, 0x1);
                    }
                    else
                        set_pixel_index(character->image, x, y, 255);
                    
                    b = b << 1;

                    //set_pixel_index(character->image, x, y, (y & 0x1) ^ (x & 0x1));
                }
            }
        }
    }

    font->font_sheet = create_image(font_sheet_width, font_sheet_height, 8);
    font->font_sheet->palette.colors[1].r = 255;
    font->font_sheet->palette.colors[1].g = 255;
    font->font_sheet->palette.colors[1].b = 255;

    for(c = 0; c<num_characters; c++)
    {
        sci_char_t* character = &font->characters[c];

        blit_image(character->image, font->font_sheet, character->x, character->y);
    }

    fclose(fp);
    
//    return NULL;
    return font;
}

void save_font(sci_font_t* font, const char* output_file)
{
    char temp[100];
    FILE* fp;
    int c;
    
    sprintf(temp, "%s.png", output_file);
    save_png(font->font_sheet, temp);

    sprintf(temp, "%s.json", output_file);
    
    fp = fopen(temp, "w");
    
    if(!fp)
    {
        return;
    }

    fprintf(fp, "{\n");     // Start
    
    fprintf(fp, "\t\"lineHeight\" : %d,\n", font->line_height);
    fprintf(fp, "\t\"characters\" :\n");
    fprintf(fp, "\t[\n");
    
    for(c = 0; c<font->num_characters; c++)
    {
        sci_char_t* character = &font->characters[c];
        
        fprintf(fp, "\t\t{ \"x\" : %d, \"y\" : %d, \"w\" : %d, \"h\" : %d }", 
                    character->x, character->y, character->w, character->h);
                    
        if(c + 1 == font->num_characters)
            fprintf(fp, "\n");
        else
            fprintf(fp, ",\n");
    }
    
    fprintf(fp, "\t]\n");
    
    fprintf(fp, "}\n");     // End
    
    fclose(fp);
}

void destroy_font(sci_font_t* font)
{
    if(font != NULL)
    {
        int c;
        
        for(c = 0; c<font->num_characters; c++)
        {
            destroy_image(font->characters[c].image);
        }
        
        destroy_image(font->font_sheet);
        free(font->characters);
        free(font);
    }
}
