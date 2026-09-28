import numpy as np, generate_lut as G
L = G.LUMA_709
def inv_sat(o,s):
    lum=(o@L)[...,None]; return lum+(o-lum)/s
def inv_encode(x): return np.where(x<=0.04045, x/12.92, ((x+0.055)/1.055)**2.4)
def inv_tonemap(y):
    a,b,c,d,e=2.51,0.03,2.43,0.59,0.14
    A=a-y*c; B=b-y*d; C=-y*e
    return (-B+np.sqrt(np.maximum(B*B-4*A*C,0)))/(2*A)/0.6

# 1. reference skin, inverted through OUR OWN pipeline -> reference scene-linear
ref_disp = np.array([203,150,120])/255.0
ref_lin  = inv_tonemap(inv_encode(inv_sat(ref_disp, G.SATURATION)))

# 2. measured scene-linear skin (avg cheek/jaw/neck)
meas_lin = np.array([0.3521, 0.1382, 0.0945])

# 3. match luminance so the comparison is exposure-independent
meas_matched = meas_lin * ((ref_lin@L)/(meas_lin@L))
print(f"reference scene-linear skin (lum-matched): {ref_lin[0]:.4f} {ref_lin[1]:.4f} {ref_lin[2]:.4f}")
print(f"measured  scene-linear skin (lum-matched): {meas_matched[0]:.4f} {meas_matched[1]:.4f} {meas_matched[2]:.4f}")

# 4. chromatic gains, luminance-preserving
gains = ref_lin/meas_matched
gains = gains/ (gains@L)
print(f"\nchromatic gains (luminance-preserving): R {gains[0]:.3f}  G {gains[1]:.3f}  B {gains[2]:.3f}")
print(f"  relative to red: green x{gains[1]/gains[0]:.3f}   blue x{gains[2]/gains[0]:.3f}")
print(f"  neck-strip said: green x1.342   blue x1.893  (red clipped -> blue overstated)")

# verify: push corrected skin through the pipeline
for name, v in [("cheek",[0.3464,0.1353,0.0929]),("jaw",[0.3128,0.1147,0.0842]),
                ("neck",[0.3971,0.1646,0.1065]),("forehead",[0.2384,0.1087,0.0751])]:
    out = G.encode_709(G.tonemap(np.array(v)*gains))
    print(f"  {name:9s} -> display {out[0]*255:5.1f}{out[1]*255:6.1f}{out[2]*255:6.1f}   G/R {out[1]/out[0]:.3f} B/R {out[2]/out[0]:.3f}")
print(f"  {'TARGET':9s} -> display {203:5.1f}{150:6.1f}{120:6.1f}   G/R {150/203:.3f} B/R {120/203:.3f}")

print("\n=== is the residual gap exposure rather than colour? ===")
cheek = np.array([0.3464,0.1353,0.0929])
for ev in [0.0, 0.5, 1.0, 1.5, 2.0]:
    out = G.encode_709(G.tonemap(cheek*gains*(2**ev)))
    print(f"  {ev:+.1f} EV -> display {out[0]*255:5.1f}{out[1]*255:6.1f}{out[2]*255:6.1f}   G/R {out[1]/out[0]:.3f} B/R {out[2]/out[0]:.3f}")
print(f"  TARGET    -> display {203:5.1f}{150:6.1f}{120:6.1f}   G/R {150/203:.3f} B/R {120/203:.3f}")
