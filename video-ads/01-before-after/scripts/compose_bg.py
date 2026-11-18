"""Ad 01 picture layer (no text/logo/audio): camera move over the plates, Kling clips pasted into
their crop, per-object wipes, foreground-wall loop. Output: 1080x1920, 30 fps, 7.0 s.
Run from the assets/ folder:  python3 ../scripts/compose_bg.py V1.mp4 V2b.mp4 out.mp4
"""
import sys, subprocess
import numpy as np, cv2

FPS, N = 30, 210
OW, OH = 1080, 1920
A1 = cv2.imread('A1_final_mirrored.png').astype(np.float32)
A2 = cv2.imread('A2_final_mirrored.png').astype(np.float32)
PH, PW = A1.shape[:2]
CX0, CW = 1500, 1728                       # video crop in plate coords
S = CW / OW                                # 1.6
cm = cv2.imread('../masks/clutter_mask_half.png', 0)
cm = cv2.resize(cm, (PW, PH))[:, ::-1].astype(np.float32) / 255
cm = cv2.GaussianBlur(cm, (0, 0), 4)

def ease_io(u): u = min(max(u, 0), 1); return u * u * (3 - 2 * u)
def ease_in(u): u = min(max(u, 0), 1); return u * u
def ease_out(u): u = min(max(u, 0), 1); return 1 - (1 - u) ** 2
def lerp(a, b, u): return a + (b - a) * u

def camera(t):
    """returns window left x (plate) and zoom"""
    if t < 1.0: x = lerp(913, 960, t)
    elif t < 2.8: x = lerp(960, 1600, ease_io((t - 1.0) / 1.8))
    elif t < 6.0: x = 1600
    else: x = lerp(1600, 2300, ease_in((t - 6.0) / 1.0))
    if t < 0.3: z = lerp(1.04, 1.0, ease_out(t / 0.3))
    elif t < 2.8: z = 1.0
    elif t < 6.0: z = lerp(1.0, 1.035, (t - 2.8) / 3.2)
    else: z = 1.035
    return x, z

# wipe front (plate x) – each object group is wiped in ~3-4 frames, left to right
WIPES = [(1.00, 1.10, 1015, 1204), (1.30, 1.43, 1204, 1823), (1.65, 1.78, 2614, 3337), (1.95, 2.10, 3268, 4421)]
def wipe_front(t):
    f = 0
    for t0, t1, x0, x1 in WIPES:
        if t >= t1: f = x1
        elif t >= t0: f = lerp(x0, x1, (t - t0) / (t1 - t0))
    return f

class Clip:
    def __init__(self, path, ref):
        self.cap = cv2.VideoCapture(path); self.n = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.fps = self.cap.get(cv2.CAP_PROP_FPS); self.cache = {}
        f0 = self.get(0); bg = np.abs(f0 - ref).max(2) < 18
        self.gain = np.array([ref[..., c][bg].mean() / max(f0[..., c][bg].mean(), 1) for c in range(3)])
    def get(self, i):
        i = int(min(max(i, 0), self.n - 1))
        if i not in self.cache:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = self.cap.read(); self.cache = {i: f.astype(np.float32)}
        return self.cache[i]
    def at(self, tau):
        return np.clip(self.get(round(tau * self.fps)) * getattr(self, 'gain', 1), 0, 255)

ref1 = cv2.resize(A1[:, CX0:CX0 + CW], (OW, OH), interpolation=cv2.INTER_AREA)
ref2 = cv2.resize(A2[:, CX0:CX0 + CW], (OW, OH), interpolation=cv2.INTER_AREA)
V1 = Clip(sys.argv[1], ref1); V2 = Clip(sys.argv[2], ref2)
T_SWITCH, SPEED2 = 2.2, 1.15
feather = np.clip(np.minimum(np.arange(CW), CW - 1 - np.arange(CW)) / 60, 0, 1)[None, :, None]

def with_clip(plate, frame):
    out = plate.copy()
    big = cv2.resize(frame, (CW, PH), interpolation=cv2.INTER_CUBIC)
    out[:, CX0:CX0 + CW] = plate[:, CX0:CX0 + CW] * (1 - feather) + big * feather
    return out

# foreground wall slab for the loop seam (from the near wall at the plate's left edge)
slab = cv2.resize(A1[:, 0:820], (OW, OH), interpolation=cv2.INTER_AREA)
slab = cv2.GaussianBlur(slab, (0, 0), 14)
edge = np.clip(np.arange(OW) / 90, 0, 1)[None, :, None]           # soft shadow on leading edge
def slab_x(t):
    if t < 0.25: return -OW * ease_out(t / 0.25)   # exits left fast, continuing the end move
    if t > 6.62: return OW * (1 - ease_in((t - 6.62) / 0.38))
    return None

out = sys.argv[3]
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{OW}x{OH}', '-r', str(FPS),
                      '-i', '-', '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
for k in range(N):
    t = k / FPS
    x, z = camera(t)
    w, h = CW / z, PH / z
    cx, cy = x + CW / 2, PH / 2
    M = np.array([[OW / w, 0, -(cx - w / 2) * OW / w], [0, OH / h, -(cy - h / 2) * OH / h]], np.float32)
    if t < T_SWITCH + 0.1:
        ca = with_clip(A1, V1.at(t))
        cb = with_clip(A2, V2.at(0))
        W = cm * (np.arange(PW)[None, :] < wipe_front(t))
        W = cv2.GaussianBlur(W, (0, 0), 6)[..., None]
        fa = ca * (1 - W) + cb * W
    if t >= T_SWITCH:
        fb = with_clip(A2, V2.at((t - T_SWITCH) * SPEED2))
        u = min((t - T_SWITCH) / 0.1, 1)
        frame_p = fb if u >= 1 else fa * (1 - u) + fb * u
    else:
        frame_p = fa
    img = cv2.warpAffine(frame_p, M, (OW, OH), flags=cv2.INTER_AREA if z <= 1 else cv2.INTER_CUBIC)
    sx = slab_x(t)
    if sx is not None:
        X = int(round(sx)); a = np.zeros((OH, OW, 1), np.float32)
        lo, hi = max(X, 0), min(X + OW, OW)
        if hi > lo:
            a[:, lo:hi] = 1
            if t > 6.6:  # leading edge = left edge while entering
                a[:, lo:hi] *= edge[:, :hi - lo] * 0.15 + 0.85
            img[:, lo:hi] = img[:, lo:hi] * (1 - a[:, lo:hi]) + slab[:, lo - X:hi - X] * a[:, lo:hi]
    p.stdin.write(np.clip(img, 0, 255).astype(np.uint8).tobytes())
    if k % 30 == 0: print('frame', k, flush=True)
p.stdin.close(); p.wait()
