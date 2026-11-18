"""Seated end frame for V2: A2 crop + seated man from Higgsfield edit E_v3 (job b8dccbf1-9de1-485e-8f3c-3658f2b7a79b).
Standing-man area: wall/sofa from E_v3 (gain matched), rug/floor cloned from the unoccluded rug to the right."""
import numpy as np, cv2
from scipy import ndimage as nd
a = cv2.imread('A2_crop916.png').astype(np.float32)
e = cv2.resize(cv2.imread('E_v3.png'), (1080, 1920), interpolation=cv2.INTER_AREA).astype(np.float32)
d = cv2.GaussianBlur(np.abs(a - e).max(2), (0, 0), 2.5)
reg = np.zeros(d.shape, bool); reg[300:1700, 0:200] = True; reg &= (d < 40)
ec = e * np.array([a[..., c][reg].mean() / e[..., c][reg].mean() for c in range(3)])
mm = cv2.imread('man_mask_half.png', 0); mm = cv2.resize(mm, (5504, 3072))[:, ::-1][:, 1500:3228]
mm = cv2.dilate((cv2.resize(mm, (1080, 1920)) > 127).astype(np.uint8), np.ones((31, 31), np.uint8))
Y = 1405
src = ec.copy()
shift = np.roll(a, -560, axis=1)            # rug/floor from the right, same rows
src[Y:] = shift[Y:]
mm[1270:1590, 0:480] = 1  # the standing man's shadow on the rug (light from frame-right)
m1 = cv2.GaussianBlur(mm.astype(np.float32), (0, 0), 6)
band = np.clip((np.arange(1920) - (Y - 12)) / 24, 0, 1)[:, None]  # soft seam between E-wall and cloned rug
src = ec * (1 - band[..., None]) + np.roll(a, -560, axis=1) * band[..., None]
base = a * (1 - m1[..., None]) + src * m1[..., None]
m = np.zeros(d.shape, np.uint8); m[860:1300, 520:930] = (d[860:1300, 520:930] > 34)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
m = nd.binary_fill_holes(m).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(m)
m = (lab == 1 + np.argmax(st[1:, 4])).astype(np.uint8); m[1215:1290, 610:840] = 1
m = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2.5)[..., None]
cv2.imwrite('E_final.png', (base * (1 - m) + ec * m).clip(0, 255).astype(np.uint8))
