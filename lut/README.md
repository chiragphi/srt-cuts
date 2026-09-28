# a7III PP8 → Rec.709

`A7III_PP8_SLog3_SGamut3Cine_to_Rec709.cube` — a 33³ conversion LUT for Sony a7III
Picture Profile 8 (S-Log3 gamma, S-Gamut3.Cine colour). It is a colour-space
*conversion*, not a look: no tint, no split-tone, no crushed blacks for style.

## Using it in Premiere

Lumetri Color → **Basic Correction → Input LUT → Browse**. It must go there, not in
Creative → Look, so that your exposure/white-balance tweaks happen in log before
the conversion rather than on top of it.

Grade *after* the LUT. Don't stack a second 709 LUT on top.

## What it does

1. S-Log3 EOTF decode → scene linear (18% grey = 0.18)
2. S-Gamut3.Cine → Rec.709 primaries (both D65, so no chromatic adaptation)
3. Gamut compression — wide-gamut colours that fall outside 709 are pulled toward
   their own luminance instead of clipped, so saturated reds keep their hue
4. Filmic tone curve, 18% grey → 104/255, with a highlight shoulder
5. Rec.709 encode + 5% saturation restore

Verified: grey lands at 0.410, 90% white at 0.822, nothing clips before 1.0.

## Regenerating / tuning

Edit the CONFIG block in `generate_lut.py`, then `python3 generate_lut.py`.

| Setting | Default | When to change |
| --- | --- | --- |
| `EXPOSURE` | `1.0` | You rated S-Log3 hot. Shot +1 stop → `0.5`, +2 stops → `0.25` |
| `SATURATION` | `1.05` | `1.0` for pure colorimetry, `1.10`–`1.15` if it reads flat |
| `CONTRAST` | `1.00` | `0.92` for a flatter base to grade on, `1.08` for punchier |
| `LUT_SIZE` | `33` | `65` for a finer grid (8× the file size) |

`python3 preview.py` renders `preview_before_after.png` from the frame in your
screenshot by applying the actual .cube file.

## Caveat on the preview

The before/after was made from a screenshot of your program monitor, so it is a
close approximation, not the real 10-bit pipeline. Judge the final result on the
actual footage.
