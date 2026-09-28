#!/usr/bin/env python3
"""Emit both LUT variants."""
import numpy as np, generate_lut as G

VARIANTS = [
    dict(name="A7III_PP8_SLog3_SGamut3Cine_to_Rec709.cube",
         title="a7III PP8 SLog3/SGamut3.Cine to Rec709 - Neutral",
         wb=None),
    dict(name="A7III_PP8_to_Rec709_WarmInterior.cube",
         title="a7III PP8 to Rec709 - Warm Interior (barbershop WB)",
         wb=(1.119, 0.971, 0.984)),
]

grid = G.build_grid(G.LUT_SIZE)
for v in VARIANTS:
    G.WB_SCENE_WHITE = v["wb"]
    out = G.transform(grid)
    with open(v["name"], "w") as f:
        f.write(f'TITLE "{v["title"]}"\n')
        f.write(f"LUT_3D_SIZE {G.LUT_SIZE}\n")
        f.write("DOMAIN_MIN 0.0 0.0 0.0\nDOMAIN_MAX 1.0 1.0 1.0\n\n")
        for r, g, b in out:
            f.write(f"{r:.6f} {g:.6f} {b:.6f}\n")
    grey = G.transform(np.array([[420/1023]*3]))[0]
    print(f"{v['name']}\n    grey -> {grey[0]:.4f} {grey[1]:.4f} {grey[2]:.4f}  ({grey[0]*255:.1f}/255)")
G.WB_SCENE_WHITE = None
