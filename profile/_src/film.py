#!/usr/bin/env python3
"""Cut the opening film into the frames the page plays while the visitor scrolls.

  python3 _src/film.py   -> assets/img/film/NNN.webp, assets/img/film-poster.webp (first frame),
                            assets/img/film-real.webp (the ending), _src/film.json

Source: the three generated shots in _src/gen/ (entrance, corridor, the unit door opening).
A film played by scrolling must move by the same amount for every stretch of scrolling, so the
frames are not taken at equal times: stretches where little moves give few frames, fast ones give
all they have.

The ending places the real photo of unit C-06 (assets/img/unit-6.jpg, with its measurements)
over the last frame, so the film closes on the real unit. That step needs OpenCV
(pip install opencv-python-headless); without it the ending image is left as it is.

Needs ffmpeg, Pillow and numpy. Nothing here runs on the visitor's side.
"""
import glob, json, os, shutil, subprocess, sys, tempfile

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GEN = os.path.join(HERE, "gen")
IMG = os.path.join(ROOT, "assets", "img")
OUT = os.path.join(IMG, "film")
SHOTS = ["shot1.mp4", "shot2.mp4", "shot3.mp4"]
SIZE = (720, 1280)  # every frame is brought to this size; the shots come a few pixels apart
WANT = 128          # frames in the finished film, give or take a few
MAX_SKIP = 10       # a still stretch keeps at least one frame in this many
QUALITY = 55


def extract(video, folder):
    os.makedirs(folder, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vsync", "0",
                    os.path.join(folder, "%04d.png")], check=True)
    return sorted(glob.glob(os.path.join(folder, "*.png")))


def small(path):
    return np.asarray(Image.open(path).convert("L").resize((180, 320), Image.BILINEAR), dtype=np.float32)


def pick(motion, forced, target):
    """Indices of the frames to keep: one each time `target` worth of movement has passed."""
    n = len(motion) + 1
    keep, acc, last = [0], 0.0, 0
    for i in range(1, n):
        acc += motion[i - 1]
        if acc >= target or i - last >= MAX_SKIP or i in forced or i == n - 1:
            keep.append(i)
            acc, last = 0.0, i
    return keep


def real_ending(last_frame, out_path):
    """The real photo of the unit, laid over the film's last frame where the two show the same thing."""
    try:
        import cv2
    except ImportError:
        print("OpenCV not installed: the real-photo ending was not rebuilt")
        return False
    last = cv2.cvtColor(np.asarray(last_frame), cv2.COLOR_RGB2BGR)
    real = cv2.imread(os.path.join(IMG, "unit-6.jpg"))
    sift = cv2.SIFT_create(6000)
    k1, d1 = sift.detectAndCompute(cv2.cvtColor(real, cv2.COLOR_BGR2GRAY), None)
    k2, d2 = sift.detectAndCompute(cv2.cvtColor(last, cv2.COLOR_BGR2GRAY), None)
    pairs = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [a for a, b in pairs if a.distance < 0.72 * b.distance]
    src = np.float32([k1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    H, inl = cv2.findHomography(src, dst, cv2.RANSAC, 3.0)
    n_in = int(inl.sum()) if inl is not None else 0
    print("real photo: %d matches, %d agree on the placement" % (len(good), n_in))
    if H is None or n_in < 40:
        print("too few to place the real photo reliably: ending not rebuilt")
        return False
    h, w = last.shape[:2]
    warped = cv2.warpPerspective(real, H, (w, h), flags=cv2.INTER_LANCZOS4)
    mask = cv2.warpPerspective(np.full(real.shape[:2], 255, np.uint8), H, (w, h))
    # the photo fades into the frame over a soft edge instead of ending on a line
    mask = cv2.erode(mask, np.ones((25, 25), np.uint8))
    mask = cv2.GaussianBlur(mask, (0, 0), 9).astype(np.float32)[..., None] / 255.0
    out = (warped.astype(np.float32) * mask + last.astype(np.float32) * (1 - mask)).clip(0, 255).astype(np.uint8)
    Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB)).save(out_path, quality=80, method=6)
    corners = cv2.perspectiveTransform(np.float32([[0, 0], [real.shape[1], 0], [real.shape[1], real.shape[0]], [0, real.shape[0]]]).reshape(-1, 1, 2), H)
    print("real photo sits at", [[round(float(x)), round(float(y))] for [[x, y]] in corners])
    return True


def main():
    tmp = tempfile.mkdtemp(prefix="film-")
    try:
        frames, ends = [], []
        for k, name in enumerate(SHOTS):
            fr = extract(os.path.join(GEN, name), os.path.join(tmp, str(k)))
            # a shot opens on the picture the one before it closed on; that picture is kept once
            frames += fr if k == 0 else fr[1:]
            ends.append(len(frames) - 1)
        thumbs = [small(f) for f in frames]
        motion = [float(np.abs(thumbs[i + 1] - thumbs[i]).mean()) for i in range(len(thumbs) - 1)]
        forced = set(ends)
        lo, hi = 0.5, 60.0
        for _ in range(40):
            mid = (lo + hi) / 2
            if len(pick(motion, forced, mid)) > WANT:
                lo = mid
            else:
                hi = mid
        keep = pick(motion, forced, hi)

        if os.path.isdir(OUT):
            shutil.rmtree(OUT)
        os.makedirs(OUT)
        total = 0
        for j, i in enumerate(keep):
            im = Image.open(frames[i]).convert("RGB")
            if im.size != SIZE:
                im = im.resize(SIZE, Image.LANCZOS)
            p = os.path.join(OUT, "%03d.webp" % j)
            im.save(p, quality=QUALITY, method=6)
            total += os.path.getsize(p)
            if j == 0:
                im.save(os.path.join(IMG, "film-poster.webp"), quality=74, method=6)
        w, h = SIZE
        if not real_ending(im, os.path.join(IMG, "film-real.webp")):   # im is the last frame written
            im.save(os.path.join(IMG, "film-real.webp"), quality=80, method=6)
        info = {"n": len(keep), "w": w, "h": h, "cuts": [keep.index(ends[0]), keep.index(ends[1])]}
        with open(os.path.join(HERE, "film.json"), "w", encoding="utf-8") as f:
            json.dump(info, f)
            f.write("\n")
        per = [sum(1 for i in keep if a < i <= b) for a, b in zip([-1] + ends[:-1], ends)]
        print("film: %d frames (%s per shot), %d KB, %dx%d" % (len(keep), "/".join(map(str, per)), total // 1024, w, h))
        print(info)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
