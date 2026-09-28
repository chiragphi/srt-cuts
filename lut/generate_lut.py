#!/usr/bin/env python3
"""
Sony a7III PP8 (S-Log3 / S-Gamut3.Cine) -> Rec.709 conversion LUT.

This is a colorimetric transform, not a stylised look:
  1. S-Log3 EOTF decode  -> scene linear (18% grey = 0.18)
  2. S-Gamut3.Cine -> Rec.709 primaries (both D65, no CAT needed)
  3. Out-of-gamut compression (negatives pulled toward luminance, not clipped)
  4. Filmic tone curve placing 18% grey at ~0.41 code value
  5. Rec.709 / sRGB-style encode + gentle saturation restore

Tunables live in the CONFIG block.
"""
import numpy as np

# ---------------------------------------------------------------- CONFIG ----
LUT_SIZE     = 33      # 33^3 = 35937 entries. 65 also works, bigger file.
EXPOSURE     = 1.0     # 1.0 = shot to Sony spec. 0.5 = you overexposed 1 stop.
SATURATION   = 1.05    # gentle restore after the tone curve. 1.0 = pure math.
CONTRAST     = 1.00    # pivot contrast in display space. 1.0 = curve as-is.
OUT_NAME     = "A7III_PP8_SLog3_SGamut3Cine_to_Rec709.cube"
LUT_TITLE    = "a7III PP8 SLog3/SGamut3.Cine to Rec709 - Neutral"

# Scene illuminant as it lands in linear Rec.709, or None for no white balance.
# Measured off the barbershop footage (warm interior): the lighting reads
# red-heavy by green x1.15 / blue x1.14 relative to a neutral D65 source.
WB_SCENE_WHITE = None
# -----------------------------------------------------------------------------


def slog3_to_linear(x):
    """Sony S-Log3 EOTF (Sony technical white paper). x: 0-1 full range."""
    cut = 171.2102946929 / 1023.0
    hi = (10.0 ** ((x * 1023.0 - 420.0) / 261.5)) * (0.18 + 0.01) - 0.01
    lo = (x * 1023.0 - 95.0) * 0.01125000 / (171.2102946929 - 95.0)
    return np.where(x >= cut, hi, lo)


def rgb_to_xyz_matrix(primaries, white_xy):
    """Build an RGB->XYZ matrix from chromaticities (SMPTE RP 177)."""
    (xr, yr), (xg, yg), (xb, yb) = primaries
    M = np.array([
        [xr / yr,             xg / yg,             xb / yb            ],
        [1.0,                 1.0,                 1.0                ],
        [(1 - xr - yr) / yr,  (1 - xg - yg) / yg,  (1 - xb - yb) / yb ],
    ])
    xw, yw = white_xy
    W = np.array([xw / yw, 1.0, (1 - xw - yw) / yw])
    scale = np.linalg.solve(M, W)
    return M * scale


D65 = (0.3127, 0.3290)
SGAMUT3_CINE = [(0.766, 0.275), (0.225, 0.800), (0.089, -0.087)]
REC709       = [(0.640, 0.330), (0.300, 0.600), (0.150, 0.060)]

SG3C_TO_709 = np.linalg.inv(rgb_to_xyz_matrix(REC709, D65)) @ \
              rgb_to_xyz_matrix(SGAMUT3_CINE, D65)

LUMA_709 = np.array([0.2126, 0.7152, 0.0722])

REC709_TO_XYZ = rgb_to_xyz_matrix(REC709, D65)

# CAT02 cone response (CIECAM02) - von Kries adaptation in a cone space keeps
# hues stable far better than raw per-channel RGB gains.
M_CAT02 = np.array([[ 0.7328,  0.4296, -0.1624],
                    [-0.7036,  1.6975,  0.0061],
                    [ 0.0030,  0.0136,  0.9834]])


def chromatic_adaptation(scene_white_rgb709):
    """Adapt from the scene illuminant to D65, in XYZ."""
    src_xyz = REC709_TO_XYZ @ np.asarray(scene_white_rgb709, dtype=float)
    xw, yw = D65
    dst_xyz = np.array([xw / yw, 1.0, (1 - xw - yw) / yw])
    src_lms = M_CAT02 @ src_xyz
    dst_lms = M_CAT02 @ dst_xyz
    return np.linalg.inv(M_CAT02) @ np.diag(dst_lms / src_lms) @ M_CAT02


def gamut_compress(rgb):
    """S-Gamut3.Cine is wider than 709. Colours that fall outside come back
    negative. Rather than clipping (which flattens the hue), pull the pixel
    toward its own luminance just far enough to land on the gamut boundary."""
    luma = rgb @ LUMA_709
    luma = luma[..., None]
    lo = rgb.min(axis=-1, keepdims=True)
    denom = luma - lo
    # blend factor t so that (1-t)*rgb + t*luma has min channel == 0
    t = np.where(lo < 0.0, np.divide(-lo, np.maximum(denom, 1e-9)), 0.0)
    t = np.clip(t, 0.0, 1.0)
    return rgb * (1.0 - t) + luma * t


def tonemap(x):
    """ACES-derived filmic curve (Narkowicz fit) with the pre-exposure that
    places 18% scene grey near 0.41 display code value, per the Rec.709 ODT."""
    x = np.maximum(x, 0.0) * 0.6
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0)


def encode_709(x):
    """sRGB-style piecewise encode. Displays are ~2.2-2.4 gamma either way, and
    the linear toe keeps the deep shadows from crushing or banding."""
    x = np.clip(x, 0.0, 1.0)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def transform(rgb):
    lin = slog3_to_linear(rgb) * EXPOSURE          # 1. decode
    M = SG3C_TO_709
    if WB_SCENE_WHITE is not None:                 # 2a. white balance in XYZ
        CAT = chromatic_adaptation(WB_SCENE_WHITE)
        M = np.linalg.inv(REC709_TO_XYZ) @ CAT @ REC709_TO_XYZ @ M
    lin = lin @ M.T                                # 2b. primaries
    lin = gamut_compress(lin)                      # 3. keep hues on the boundary
    disp = tonemap(lin)                            # 4. tone curve
    out = encode_709(disp)                         # 5. encode

    if CONTRAST != 1.0:                            # pivot on 18% grey
        pivot = encode_709(tonemap(0.18))
        out = np.clip((out - pivot) * CONTRAST + pivot, 0.0, 1.0)
    if SATURATION != 1.0:
        luma = (out @ LUMA_709)[..., None]
        out = np.clip(luma + (out - luma) * SATURATION, 0.0, 1.0)
    return out


def build_grid(size):
    """.cube ordering: red index varies fastest, then green, then blue."""
    axis = np.linspace(0.0, 1.0, size)
    b, g, r = np.meshgrid(axis, axis, axis, indexing="ij")
    return np.stack([r, g, b], axis=-1).reshape(-1, 3)


def main():
    grid = build_grid(LUT_SIZE)
    out = transform(grid)

    with open(OUT_NAME, "w") as f:
        f.write(f'TITLE "{LUT_TITLE}"\n')
        f.write(f"LUT_3D_SIZE {LUT_SIZE}\n")
        f.write("DOMAIN_MIN 0.0 0.0 0.0\n")
        f.write("DOMAIN_MAX 1.0 1.0 1.0\n\n")
        for r, g, b in out:
            f.write(f"{r:.6f} {g:.6f} {b:.6f}\n")

    print(f"wrote {OUT_NAME}  ({LUT_SIZE}^3 = {len(out)} entries)")
    print("\nS-Gamut3.Cine -> Rec.709 matrix:")
    for row in SG3C_TO_709:
        print("  " + "  ".join(f"{v: .6f}" for v in row))

    print("\nsanity checks (in -> out, 0-1):")
    for name, cv in [("black  (95/1023)",  95 / 1023),
                     ("18% grey (420)",   420 / 1023),
                     ("90% white",        598 / 1023),
                     ("clip   (1.0)",     1.0)]:
        p = transform(np.array([[cv, cv, cv]]))[0]
        print(f"  {name:<18} {cv:.4f} -> {p[0]:.4f}  ({p[0]*255:5.1f}/255)")


if __name__ == "__main__":
    main()
