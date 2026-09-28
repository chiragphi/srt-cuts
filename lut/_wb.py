import numpy as np
from PIL import Image
a = np.asarray(Image.open("/Users/chiragphi/.claude/image-cache/96991dcc-d8e2-4cee-ad8d-bac47c05c63e/2.png").convert("RGB")).astype(float)
frame = a[143:816, 622:1001]
# the white barber neck-strip is the brightest thing on the subject; scan for it
h,w,_ = frame.shape
best=[]
for y in range(400, 560, 6):
    for x in range(20, w-20, 6):
        p = frame[y:y+6, x:x+6].reshape(-1,3).mean(0)
        if p.mean() > 90:
            best.append((p.mean(), y, x, p))
best.sort(reverse=True, key=lambda t:t[0])
print("brightest patches on the subject (candidate neck-strip / neutrals):")
for m,y,x,p in best[:8]:
    print(f"  y{y+143} x{x+622}  RGB {p[0]:6.1f}{p[1]:6.1f}{p[2]:6.1f}   G/R {p[1]/p[0]:.3f} B/R {p[2]/p[0]:.3f}")
