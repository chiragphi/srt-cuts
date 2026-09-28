import numpy as np
from PIL import Image

SRC = "/Users/chiragphi/.claude/image-cache/96991dcc-d8e2-4cee-ad8d-bac47c05c63e/1.png"
a = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float64)
sub = a[130:830, 600:1020]

# trim the letterbox: keep rows/cols that are not near-black
col_ok = np.where(sub.mean(axis=(0, 2)) > 20)[0]
row_ok = np.where(sub.mean(axis=(1, 2)) > 20)[0]
frame = sub[row_ok[0]:row_ok[-1] + 1, col_ok[0]:col_ok[-1] + 1] / 255.0
print("frame", frame.shape)

# ---- load and apply the actual .cube file with trilinear interpolation ----
vals, size = [], None
for line in open("A7III_PP8_SLog3_SGamut3Cine_to_Rec709.cube"):
    line = line.strip()
    if line.startswith("LUT_3D_SIZE"):
        size = int(line.split()[-1])
    elif line and not line[0].isalpha() and not line.startswith('"'):
        vals.append([float(v) for v in line.split()])
lut = np.array(vals).reshape(size, size, size, 3)   # [b][g][r]

def apply_lut(img):
    idx = np.clip(img, 0, 1) * (size - 1)
    i0 = np.floor(idx).astype(int)
    i1 = np.minimum(i0 + 1, size - 1)
    f = idx - i0
    r0, g0, b0 = i0[..., 0], i0[..., 1], i0[..., 2]
    r1, g1, b1 = i1[..., 0], i1[..., 1], i1[..., 2]
    fr, fg, fb = f[..., 0:1], f[..., 1:2], f[..., 2:3]
    def c(bi, gi, ri): return lut[bi, gi, ri]
    c00 = c(b0, g0, r0) * (1 - fr) + c(b0, g0, r1) * fr
    c01 = c(b0, g1, r0) * (1 - fr) + c(b0, g1, r1) * fr
    c10 = c(b1, g0, r0) * (1 - fr) + c(b1, g0, r1) * fr
    c11 = c(b1, g1, r0) * (1 - fr) + c(b1, g1, r1) * fr
    c0 = c00 * (1 - fg) + c01 * fg
    c1 = c10 * (1 - fg) + c11 * fg
    return c0 * (1 - fb) + c1 * fb

graded = apply_lut(frame)

h, w = frame.shape[:2]
gap = 12
canvas = np.ones((h, w * 2 + gap, 3)) * 0.12
canvas[:, :w] = frame
canvas[:, w + gap:] = graded
Image.fromarray((np.clip(canvas, 0, 1) * 255).astype(np.uint8)).save("preview_before_after.png")
print("before mean/sat:", frame.mean().round(3), (frame.max(-1) - frame.min(-1)).mean().round(3))
print("after  mean/sat:", graded.mean().round(3), (graded.max(-1) - graded.min(-1)).mean().round(3))
