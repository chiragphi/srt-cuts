import numpy as np
from PIL import Image
a = np.asarray(Image.open("/Users/chiragphi/.claude/image-cache/96991dcc-d8e2-4cee-ad8d-bac47c05c63e/2.png").convert("RGB")).astype(float)
# cheek / jaw / forehead patches on the graded frame
patches = {"cheek":(430,470,800,850), "jaw":(500,540,780,830),
           "forehead":(330,360,860,900), "neck":(560,590,760,810)}
for n,(y0,y1,x0,x1) in patches.items():
    p = a[y0:y1, x0:x1].reshape(-1,3).mean(0)
    r,g,b = p
    print(f"{n:9s} RGB {r:6.1f}{g:6.1f}{b:6.1f}   G/R {g/r:.3f}  B/R {b/r:.3f}")
