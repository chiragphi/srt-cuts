import numpy as np
from PIL import Image
import generate_lut as G

L = G.LUMA_709
def inv_sat(o,s):
    lum=(o@L)[...,None]; return lum+(o-lum)/s
def inv_encode(x): return np.where(x<=0.04045, x/12.92, ((x+0.055)/1.055)**2.4)
def inv_tonemap(y):
    a,b,c,d,e=2.51,0.03,2.43,0.59,0.14
    A=a-y*c; B=b-y*d; C=-y*e
    return (-B+np.sqrt(np.maximum(B*B-4*A*C,0)))/(2*A)/0.6

a = np.asarray(Image.open("/Users/chiragphi/.claude/image-cache/96991dcc-d8e2-4cee-ad8d-bac47c05c63e/2.png").convert("RGB")).astype(float)
graded = a[143:816, 622:1001]/255.0

# invert the neutral LUT to recover scene-linear (in S-Gamut3.Cine)
lin709 = inv_tonemap(inv_encode(inv_sat(graded, G.SATURATION)))
lin_cam = lin709 @ np.linalg.inv(G.SG3C_TO_709).T

def render(wb, ev):
    G.WB_SCENE_WHITE = wb
    lin = lin_cam * (2**ev)
    M = G.SG3C_TO_709
    if wb is not None:
        CAT = G.chromatic_adaptation(wb)
        M = np.linalg.inv(G.REC709_TO_XYZ) @ CAT @ G.REC709_TO_XYZ @ M
    x = G.gamut_compress(lin @ M.T)
    out = G.encode_709(G.tonemap(x))
    lum=(out@L)[...,None]
    return np.clip(lum+(out-lum)*G.SATURATION,0,1)

WB = (1.119, 0.971, 0.984)
panels = [("current (neutral)", graded),
          ("+ warm-interior WB", render(WB, 0.0)),
          ("+ WB and +1.2 EV",   render(WB, 1.2))]

def skin(img):
    p = img[287:327, 178:228].reshape(-1,3).mean(0)   # cheek
    return f"cheek {p[0]*255:5.1f}{p[1]*255:6.1f}{p[2]*255:6.1f}  G/R {p[1]/p[0]:.3f} B/R {p[2]/p[0]:.3f}"
for n,p in panels: print(f"{n:22s} {skin(p)}")
print(f"{'TARGET':22s} cheek 203.0 150.0 120.0  G/R 0.739 B/R 0.591")

h,w,_ = graded.shape; gap=10
canvas = np.ones((h, w*3+gap*2, 3))*0.12
for i,(n,p) in enumerate(panels): canvas[:, i*(w+gap):i*(w+gap)+w] = p
Image.fromarray((np.clip(canvas,0,1)*255).astype(np.uint8)).save("preview_face.png")
G.WB_SCENE_WHITE=None
