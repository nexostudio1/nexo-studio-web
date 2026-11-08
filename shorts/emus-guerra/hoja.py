import sys
from PIL import Image
pre, fs = sys.argv[1], sys.argv[2].split(",")
ims = [Image.open(f"{pre}{f}.jpg").resize((270, 480)) for f in fs]
sh = Image.new("RGB", (270 * len(ims), 480))
for i, im in enumerate(ims): sh.paste(im, (i * 270, 0))
sh.save(sys.argv[3])
