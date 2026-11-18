"""Rebuild A1_final_mirrored.png from Higgsfield job 350ecb11-03b3-4f0b-a02e-f2b15c795b71.
1) Replace the TV screen (ghost reflections) with a smooth plane fit. 2) Mirror horizontally.
Usage: python3 prepare_A1.py assets/A1_v1.png assets/A1_final_mirrored.png"""
import sys
import numpy as np
from PIL import Image, ImageOps

src, dst = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert('RGB')).astype(float)
x0, x1, y0, y1 = 2524, 3161, 1124, 1488  # TV screen inside bezel (5504x3072 plate)
reg = a[y0:y1, x0:x1]; h, w, _ = reg.shape
yy, xx = np.mgrid[0:h, 0:w]
X = np.stack([np.ones(h * w), xx.ravel() / w, yy.ravel() / h], 1)
out = np.empty_like(reg)
for c in range(3):
    v = reg[..., c].ravel(); m = v < np.percentile(v, 60)
    coef, *_ = np.linalg.lstsq(X[m], v[m], rcond=None)
    out[..., c] = (X @ coef).reshape(h, w)
out += np.random.default_rng(1).normal(0, 1.2, (h, w, 1))
f = np.ones((h, w)); k = 6
for i in range(k):
    f[i, :] = f[-1 - i, :] = np.minimum(f[i, :], (i + 1) / k)
    f[:, i] = np.minimum(f[:, i], (i + 1) / k); f[:, -1 - i] = np.minimum(f[:, -1 - i], (i + 1) / k)
a[y0:y1, x0:x1] = reg * (1 - f[..., None]) + out * f[..., None]
ImageOps.mirror(Image.fromarray(np.clip(a, 0, 255).astype('uint8'))).save(dst)
