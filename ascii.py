import sys
from PIL import Image

path = sys.argv[1]
w = int(sys.argv[2]) if len(sys.argv)>2 else 120
img = Image.open(path).convert('L')
ratio = img.height/img.width
h = int(w*ratio*0.5)
img = img.resize((w,h))
chars = " .:-=+*#%@"
for y in range(h):
    line=''
    for x in range(w):
        v = img.getpixel((x,y))
        idx = v//26
        if idx>9: idx=9
        line += chars[idx]
    print(line)
