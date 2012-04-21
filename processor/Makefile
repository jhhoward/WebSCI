CC = g++
INCLUDEFLAGS = 
CFLAGS = $(INCLUDEFLAGS) 
LDFLAGS =  -lpng
SOURCES = \
	main.c \
	image_bmp.c \
	image.c \
	sci_font.c \
	sci_view.c \
	sci_cursor.c \
	image_png.c
	
OBJECTS = $(SOURCES:.c=.o)
EXECUTABLE = processor

all: $(SOURCES) $(EXECUTABLE)

$(EXECUTABLE): $(OBJECTS) 
	echo $(OBJECTS)
	$(CC) $(INCLUDEFLAGS) $(CFLAGS) $(LDFLAGS) $(SDLMAIN) $(OBJECTS) -o $@

.c.o:
	$(CC) -c $(CFLAGS) $< -o $@

clean:
	rm -f $(OBJECTS)

