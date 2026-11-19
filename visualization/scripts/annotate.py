"""Make the two deliverable images from one render:
  * <id>_clean.png      - photo only (bottom 3:4 crop of the tall render)
  * <id>_annotated.png  - full tall render + measurement arrows and labels

The arrows are drawn at the exact pixel positions of 3D points projected by the
same Blender camera (see verification.json -> annotation_points), so they sit on
the real geometry. Only owner-confirmed values are printed.

Usage (regular Python with Pillow built with raqm for Arabic shaping):
    python3 annotate.py --dir ../output/U01 --id U01
"""
import argparse
import json
import math
import os

from PIL import Image, ImageDraw, ImageFont, features

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(os.path.dirname(HERE), "assets", "fonts", "NotoSansArabic-Variable.ttf")
NAVY = (20, 33, 61)
WHITE = (255, 255, 255)
ACCENT = (64, 160, 220)


def font(size, weight=700):
    f = ImageFont.truetype(FONT, size, layout_engine=ImageFont.Layout.RAQM)
    axes = f.get_variation_axes()
    vals = []
    for ax in axes:
        name = ax.get("name", b"")
        name = name.decode() if isinstance(name, bytes) else str(name)
        vals.append(weight if "eight" in name else ax.get("default", 100))
    f.set_variation_by_axes(vals)
    return f


def text_size(draw, s, f):
    b = draw.textbbox((0, 0), s, font=f, direction="rtl", language="ar")
    return b[2] - b[0], b[3] - b[1], b


def pill(draw, center, s, f, pad=(28, 16), bg=NAVY, fg=WHITE):
    w, h, b = text_size(draw, s, f)
    cx, cy = center
    x0, y0 = cx - w / 2 - pad[0], cy - h / 2 - pad[1]
    x1, y1 = cx + w / 2 + pad[0], cy + h / 2 + pad[1]
    draw.rounded_rectangle((x0 - 4, y0 - 4, x1 + 4, y1 + 4), radius=(y1 - y0) / 2 + 4, fill=WHITE)
    draw.rounded_rectangle((x0, y0, x1, y1), radius=(y1 - y0) / 2, fill=bg)
    draw.text((cx - w / 2 - b[0], cy - h / 2 - b[1]), s, font=f, fill=fg, direction="rtl", language="ar")


def arrow(draw, p, q, width=9, head=46):
    """Double-headed dimension arrow with a white halo for contrast on any background."""
    ang = math.atan2(q[1] - p[1], q[0] - p[0])
    for color, w, hd in ((WHITE, width + 10, head + 10), (NAVY, width, head)):
        a = (p[0] + math.cos(ang) * hd * 0.8, p[1] + math.sin(ang) * hd * 0.8)
        b = (q[0] - math.cos(ang) * hd * 0.8, q[1] - math.sin(ang) * hd * 0.8)
        draw.line([a, b], fill=color, width=w)
        for tip, direction in ((p, ang), (q, ang + math.pi)):
            l = (tip[0] + math.cos(direction + 0.42) * hd, tip[1] + math.sin(direction + 0.42) * hd)
            r = (tip[0] + math.cos(direction - 0.42) * hd, tip[1] + math.sin(direction - 0.42) * hd)
            draw.polygon([tip, l, r], fill=color)
    # end ticks (perpendicular)
    perp = ang + math.pi / 2
    for tip in (p, q):
        for color, w in ((WHITE, 14), (NAVY, 5)):
            draw.line([(tip[0] + math.cos(perp) * 34, tip[1] + math.sin(perp) * 34),
                       (tip[0] - math.cos(perp) * 34, tip[1] - math.sin(perp) * 34)], fill=color, width=w)


def fmt(v):
    return f"{v:.2f} م"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True)
    ap.add_argument("--id", required=True)
    a = ap.parse_args()
    assert features.check("raqm"), "Pillow needs libraqm for correct Arabic text"
    rep = json.load(open(os.path.join(a.dir, "verification.json"), encoding="utf-8"))
    if not rep["geometry_check"]["all_ok"]:
        raise SystemExit("verification failed - refusing to annotate")
    u, cam, P = rep["unit"], rep["camera"], rep["annotation_points"]
    tall = Image.open(os.path.join(a.dir, "render_tall.png")).convert("RGB")
    W, H = tall.size
    r0, r1 = cam["clean_crop_rows"]
    sx = W / 3000.0                                     # scale factor if rendered below 100 %
    r0, r1 = int(round(r0 * H / cam["tall_height_px"])), H

    clean = tall.crop((0, r0, W, r1))
    clean.save(os.path.join(a.dir, f"{a.id}_clean.png"), optimize=True)

    img = tall.copy()
    d = ImageDraw.Draw(img)
    k = H / cam["tall_height_px"]
    px = {n: (v["px"][0] * k, v["px"][1] * k) for n, v in P.items()}
    s = lambda n: max(1, int(n * sx))                    # noqa: E731

    f_lab = font(s(64), 700)
    # width (along the floor at the back wall)
    arrow(d, px["width_a"], px["width_b"], s(9), s(46))
    mid = ((px["width_a"][0] + px["width_b"][0]) / 2, (px["width_a"][1] + px["width_b"][1]) / 2 - s(110))
    pill(d, mid, f"العرض {fmt(u['width_m'])}", f_lab, (s(28), s(16)))
    # depth (along the floor next to the right wall)
    arrow(d, px["depth_a"], px["depth_b"], s(9), s(46))
    mid = ((px["depth_a"][0] + px["depth_b"][0]) / 2, (px["depth_a"][1] + px["depth_b"][1]) / 2)
    pill(d, (mid[0] - s(330), mid[1] + s(40)), f"العمق {fmt(u['depth_m'])}", f_lab, (s(28), s(16)))
    # allowed height (floor -> allowed height, rising above the top of the wall)
    arrow(d, px["height_b"], px["height_a"], s(9), s(46))
    hb = px["height_b"]
    for color, w in ((WHITE, s(16)), (NAVY, s(6))):     # dashed level line at the allowed height
        x = hb[0] - s(60)
        while x < hb[0] + s(520):
            d.line([(x, hb[1]), (min(x + s(36), hb[0] + s(520)), hb[1])], fill=color, width=w)
            x += s(60)
    wt = px["wall_top_ref"]
    pill(d, (hb[0] + s(300), (hb[1] + wt[1]) / 2 + s(10)),
         f"الارتفاع المسموح {fmt(u['allowed_height_m'])}", f_lab, (s(28), s(16)))

    # title card
    f_t1, f_t2, f_t3 = font(s(92), 800), font(s(56), 600), font(s(44), 500)
    lines = [(f"{u['label_ar']}", f_t1),
             (f"{fmt(u['width_m'])} × {fmt(u['depth_m'])}  ·  مساحة داخلية صافية", f_t2),
             (f"الارتفاع المسموح {fmt(u['allowed_height_m'])}", f_t2),
             ("Ravel Storage  |  رافل للتخزين", f_t3)]
    pad, gap = s(48), s(26)
    sizes = [text_size(d, t, f) for t, f in lines]
    bw = max(w for w, _, _ in sizes) + 2 * pad
    bh = sum(h for _, h, _ in sizes) + gap * (len(lines) - 1) + 2 * pad
    x0, y0 = s(60), H - s(60) - bh
    x1 = x0 + bw
    d.rounded_rectangle((x0, y0, x1, y0 + bh), radius=s(36), fill=(255, 255, 255))
    d.rectangle((x1 - s(14), y0 + s(30), x1, y0 + bh - s(30)), fill=ACCENT)
    y = y0 + pad
    for (t, f), (w, h, b) in zip(lines, sizes):
        d.text((x1 - pad - s(14) - w - b[0], y - b[1]), t, font=f, fill=NAVY, direction="rtl", language="ar")
        y += h + gap
    img.save(os.path.join(a.dir, f"{a.id}_annotated.png"), optimize=True)
    print("ok", clean.size, img.size)


if __name__ == "__main__":
    main()
