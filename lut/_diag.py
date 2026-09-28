import numpy as np, generate_lut as G

L = G.LUMA_709
def inv_sat(o, s):
    lum = (o @ L)[...,None]
    return lum + (o - lum)/s
def inv_encode(x):
    return np.where(x <= 0.04045, x/12.92, ((x+0.055)/1.055)**2.4)
def inv_tonemap(y):
    a,b,c,d,e = 2.51,0.03,2.43,0.59,0.14
    A = a - y*c; B = b - y*d; C = -y*e
    x = (-B + np.sqrt(np.maximum(B*B - 4*A*C, 0)))/(2*A)
    return x/0.6
INV_M = np.linalg.inv(G.SG3C_TO_709)

skin = {"cheek":[154.2,85.4,63.1], "jaw":[146.9,75.5,58.4],
        "forehead":[126.5,72.7,53.1], "neck":[163.8,98.0,70.1]}

print("recovered SCENE-LINEAR values (what the sensor actually saw, in 709 primaries):")
for n,v in skin.items():
    o = np.array(v)/255.0
    lin709 = inv_tonemap(inv_encode(inv_sat(o, G.SATURATION)))
    r,g,b = lin709
    print(f"  {n:9s} lin709 {r:.4f} {g:.4f} {b:.4f}   G/R {g/r:.3f}  B/R {b/r:.3f}")

print("\nfor reference, neutrally-lit caucasian skin in linear 709 sits near G/R 0.55  B/R 0.40")
print("\n--- how much of the redness does the tone curve itself add? ---")
ref = np.array([0.25, 0.1375, 0.10])   # textbook neutral skin, linear 709
out = G.encode_709(G.tonemap(ref))
print(f"  linear in   G/R {ref[1]/ref[0]:.3f}  B/R {ref[2]/ref[0]:.3f}")
print(f"  after curve G/R {out[1]/out[0]:.3f}  B/R {out[2]/out[0]:.3f}   <- saturation added by the curve")

print("\n=== white neck-strip (should be R=G=B) ===")
strip = np.array([216.2,202.0,181.5])/255.0
lin = inv_tonemap(inv_encode(inv_sat(strip, G.SATURATION)))
print(f"  linear 709: {lin[0]:.4f} {lin[1]:.4f} {lin[2]:.4f}")
gains = lin[0]/lin          # normalise to red (preserve the brighter channel)
gains = gains/gains.max()   # rescale so nothing exceeds 1.0 -> no clipping
print(f"  gains to neutralise (R,G,B): {gains[0]:.4f} {gains[1]:.4f} {gains[2]:.4f}")
print(f"  i.e. green x{lin[0]/lin[1]:.3f}, blue x{lin[0]/lin[2]:.3f} relative to red")

print("\n  skin after applying those gains:")
for n,v in skin.items():
    o = np.array(v)/255.0
    l = inv_tonemap(inv_encode(inv_sat(o, G.SATURATION))) * (lin[0]/lin)
    print(f"    {n:9s} G/R {l[1]/l[0]:.3f}  B/R {l[2]/l[0]:.3f}   (neutral skin target 0.55 / 0.40)")
