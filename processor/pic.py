import Image
import sys;

for arg in sys.argv:
    im = Image.open(arg)
    im.show()