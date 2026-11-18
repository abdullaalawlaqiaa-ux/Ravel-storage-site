"""Rebuild A2 composite: A1 everywhere except clutter regions, which come from the Higgsfield edit
(job ec74ca33-fee2-45d2-b694-c49ed345c758). Masks: clutter_mask_half.png, man_mask_half.png (see production.md 3b).
Then run prepare_A1.py on the result (TV fix + mirror)."""
import numpy as np, cv2
A = cv2.imread('A1_v1.png').astype(np.float32); B = cv2.imread('A2_v2.png').astype(np.float32); H, W = A.shape[:2]
c = cv2.resize(cv2.imread('clutter_mask_half.png', 0), (W, H)); man = cv2.resize(cv2.imread('man_mask_half.png', 0), (W, H))
near = cv2.dilate(c, np.ones((61, 61), np.uint8))
ring = cv2.subtract(cv2.dilate(man, np.ones((9, 9), np.uint8)), cv2.erode(man, np.ones((13, 13), np.uint8)))
manE = cv2.erode(man, np.ones((13, 13), np.uint8))
m = np.maximum(c, cv2.bitwise_and(ring, near)).astype(np.float32) / 255
m = (cv2.GaussianBlur(m, (0, 0), 6) * (1 - cv2.GaussianBlur(manE.astype(np.float32) / 255, (0, 0), 2)))[..., None]
cv2.imwrite('A2_composite_unfixed.png', (A * (1 - m) + B * m).clip(0, 255).astype(np.uint8))
