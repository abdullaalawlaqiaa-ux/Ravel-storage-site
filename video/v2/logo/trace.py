import sys, numpy as np, potrace
from PIL import Image, ImageFilter
src=sys.argv[1]; S=10
im=Image.open(src).convert('RGBA'); a=im.split()[3]
def trace(box,name):
    c=a.crop(box); w,h=c.size
    big=c.resize((w*S,h*S),Image.BICUBIC).filter(ImageFilter.GaussianBlur(S*0.35))
    bm=potrace.Bitmap(np.array(big)<=110)
    path=bm.trace(turdsize=20,alphamax=1.0,opticurve=True,opttolerance=0.3)
    d=[]
    for curve in path:
        p=curve.start_point; d.append(f"M{p.x:.1f} {p.y:.1f}")
        for seg in curve:
            if seg.is_corner: d.append(f"L{seg.c.x:.1f} {seg.c.y:.1f}L{seg.end_point.x:.1f} {seg.end_point.y:.1f}")
            else: d.append(f"C{seg.c1.x:.1f} {seg.c1.y:.1f} {seg.c2.x:.1f} {seg.c2.y:.1f} {seg.end_point.x:.1f} {seg.end_point.y:.1f}")
        d.append("Z")
    open(name+'.path','w').write("".join(d))
    print(name, w*S, h*S)
trace((54,293,264,393),'script')
trace((54,414,264,437),'storage')
