#!/usr/bin/env python3
"""Build the Ravel Storage interactive profile from _src/.

  python3 _src/build.py                      -> writes index.html and assets/js/data.js
  python3 _src/build.py --base https://example.com/profile/   (absolute URL for the share image)
  python3 _src/build.py --artifact OUT_DIR   -> also writes a single-file preview page into OUT_DIR

The preview page is self-contained: images travel inside it as data URIs, the text fonts come
from Google Fonts and Three.js from cdnjs, so it shows correctly in viewers that cannot load
files published next to the page.
"""
import argparse, base64, html, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.149.0/three.min.js"
EARLY = ("<script>(function(d){var l='ar';try{l=localStorage.getItem('rv_lang')||'ar'}catch(e){}"
         "if(location.hash==='#en'||/[?&]lang=en/.test(location.search))l='en';"
         "d.lang=l==='en'?'en':'ar';d.dir=l==='en'?'ltr':'rtl';d.classList.add('js');"
         # motion is switched on before the first paint, and off again if the motion script never arrives
         "if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){d.classList.add('fx');"
         "setTimeout(function(){if(!window.RVFX)d.classList.remove('fx')},4000)}"
         "})(document.documentElement)</script>")


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="")
    ap.add_argument("--artifact", default="")
    args = ap.parse_args()

    S = json.loads(read("_src/strings.json"))
    D = json.loads(read("_src/data.json"))
    T = lambda k: S[k][0]
    plain = lambda k: re.sub(r"<[^>]+>", "", T(k).replace("<br>", " ")).replace("&amp;", "&")

    tpl = read("_src/template.html")
    tpl = tpl.replace("{{BASE}}", args.base)
    tpl = re.sub(r"\{\{([a-z0-9.]+)\}\}", lambda m: html.escape(plain(m.group(1)), quote=True), tpl)

    # Arabic text is written into the page so it reads without JavaScript; the script swaps language at runtime
    def fill(m):
        return m.group(1) + T(m.group(3)) + m.group(4)
    tpl = re.sub(r'(<([a-zA-Z0-9]+)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>)(</\2>)', fill, tpl)

    def attrs(m):
        add = "".join(' %s="%s"' % (a, html.escape(plain(k), quote=True))
                      for a, k in (p.split(":") for p in m.group(1).split("|")))
        return m.group(0)[:-1] + add + ">"
    tpl = re.sub(r'<[a-zA-Z0-9]+\b[^>]*?\sdata-i18n-attr="([^"]+)"[^>]*>', attrs, tpl)

    rows = "".join('<tr data-a="%s" tabindex="0" aria-selected="false"><td>%s</td><td>%s</td><td>%s</td></tr>'
                   % (s["a"], s["a"], s["a"] * D["height"], format(s["price"], ","))
                   for s in D["sizes"] if s["price"])
    # the size guide: its rows are listed in data.json as the owner worded them. Each row leads to a size
    # whose own description is the row's, so the unit that opens says the same thing as the row that was tapped.
    by_a = dict((s["a"], s) for s in D["sizes"])
    rows_guide = []
    for g in D["guide"]:
        assert by_a[g["show"]]["fits"] == g["fits"], "guide row %s leads to a size described differently" % g
        rows_guide.append((g["show"], "%d – %d" % (g["from"], g["to"]), g["fits"]))
    rows_guide.append(("big", "+%d" % D["sizes"][-1]["a"], "open"))
    guide = "".join('<li><a class="grow" href="#explorer" data-a="%s"><b class="grow__a"><span dir="ltr">%s</span> '
                    '<small data-i18n="m2">%s</small></b><span class="grow__t" data-i18n="fits.%s">%s</span>'
                    '<svg class="ic ic--dir"><use href="#i-arrow"/></svg></a></li>'
                    % (a, label, T("m2"), key, T("fits." + key)) for a, label, key in rows_guide)
    tpl = tpl.replace("<!--PRICEROWS-->", rows).replace("<!--GUIDE-->", guide)
    tpl = tpl.replace("<!--SIZES-->", "").replace("<!--UNITINFO-->", "")

    data = dict(D)
    data["strings"] = S
    data_js = "window.RV_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";"
    write(os.path.join(ROOT, "assets/js/data.js"), data_js)

    page = tpl.replace("<!--HEAD-->", EARLY).replace("<!--/HEAD-->", "")
    page = page.replace("<!--BODY-->", "").replace("<!--/BODY-->", "")
    page = page.replace("<!--SCRIPTS-->", '<script src="assets/js/data.js" defer></script>\n<script src="assets/js/app.js" defer></script>\n<script src="assets/js/fx.js" defer></script>')
    write(os.path.join(ROOT, "index.html"), page)
    print("index.html", len(page.encode("utf-8")), "bytes")

    if args.artifact:
        def data_uri(path, mime):
            with open(os.path.join(ROOT, path), "rb") as f:
                return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode("ascii"))

        body = tpl.split("<!--BODY-->")[1].split("<!--/BODY-->")[0]
        # images: drop the <source> alternatives; the script fills each <img> from the inlined data
        body = re.sub(r"<source\b[^>]*>", "", body)
        names = set()

        def inline_img(m):
            names.add(m.group(1))
            return 'data-img="%s"' % m.group(1)
        body = re.sub(r'src="assets/img/([a-z0-9-]+)\.(?:png|jpg|webp)"', inline_img, body)
        names.update(s["photo"] for s in D["sizes"] if s["photo"])
        names.add("logo-white")
        names.update(["char-rashid", "char-james"])   # the two people in the 3D view and the film
        # fonts: only the digits face is embedded; the text faces come from the same families on Google Fonts
        css = read("assets/css/style.css")
        # the film's styles and script travel inside the single page too (in the hosted copy they load on demand)
        has_film = os.path.exists(os.path.join(ROOT, "assets/js/motion.js"))
        if has_film:
            css += "\n" + read("assets/css/motion.css")
        css = re.sub(r'@font-face\{font-family:"RV (?:Kufi|Plex|Mont)";[^}]*\}\n', "", css)
        css = css.replace("url(../fonts/mont-lat.woff2)", "url(%s)" % data_uri("assets/fonts/mont-lat.woff2", "font/woff2"))
        assert "url(../" not in css and "assets/img/" not in body
        adata = dict(data)
        adata["keepTitle"] = True
        adata["threeCdn"] = THREE_CDN
        adata["threeFirst"] = True
        adata["img"] = dict((n, data_uri("assets/img/%s.webp" % n, "image/webp")) for n in sorted(names))
        out = "\n".join([
            "<title>Ravel Storage Profile</title>",
            '<meta name="claude:viewport-fit-sides" content="cover">',
            EARLY,
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600&family=Montserrat:wght@600;700;800&family=Noto+Kufi+Arabic:wght@600;700;800&display=swap">',
            "<style>\n" + css + "\n</style>",
            body,
            "<script>window.RV_DATA=" + json.dumps(adata, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";</script>",
            "<script>\n" + read("assets/js/scene3d.js") + "\n</script>",
            ("<script>\n" + read("assets/js/motion.js") + "\n</script>") if has_film else "",
            "<script>\n" + read("assets/js/app.js") + "\n</script>",
            "<script>\n" + read("assets/js/fx.js") + "\n</script>",
        ])
        p = os.path.join(args.artifact, "ravel-storage-profile.html")
        write(p, out)
        print("artifact page", len(out.encode("utf-8")), "bytes;", len(names), "images inlined")


if __name__ == "__main__":
    main()
