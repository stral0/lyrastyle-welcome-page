import sys
from PIL import Image
# usage: sheet.py out.png cols scale a.png b.png ...
out, cols, scale = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]); files = sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in files]
ims = [im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS) for im in ims]
w = max(i.width for i in ims); h = max(i.height for i in ims); rows = (len(ims)+cols-1)//cols
sh = Image.new('RGB', (cols*w+(cols-1)*6, rows*h+(rows-1)*6), (60,0,60))
for k, im in enumerate(ims): sh.paste(im, ((k%cols)*(w+6), (k//cols)*(h+6)))
sh.save(out); print(out, sh.size)
