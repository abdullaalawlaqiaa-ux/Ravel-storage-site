#!/usr/bin/env python3
"""Build the Ravel Storage interactive profile from _src/.

  python3 _src/build.py                      -> writes index.html and assets/js/data.js
  python3 _src/build.py --base https://example.com/profile/   (absolute URL for the share image)
  python3 _src/build.py --artifact OUT_DIR   -> also writes a single-file preview page into OUT_DIR
"""
import argparse, html, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.149.0/three.min.js"
EARLY = ("<script>(function(d){var l='ar';try{l=localStorage.getItem('rv_lang')||'ar'}catch(e){}"
         "if(location.hash==='#en'||/[?&]lang=en/.test(location.search))l='en';"
         "d.lang=l==='en'?'en':'ar';d.dir=l==='en'?'ltr':'rtl';d.classList.add('js')})(document.documentElement)</script>")


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
    branches = "".join('<li class="card branch"><h3 class="branch__name"><span>%s</span></h3>'
                       '<p class="branch__row"><span>%s</span></p><p class="branch__row"><span>%s</span></p></li>'
                       % (T(b["name"]), T(b["area"]), T("b.access")) for b in D["branches"])
    tpl = tpl.replace("<!--PRICEROWS-->", rows).replace("<!--BRANCHES-->", branches)
    tpl = tpl.replace("<!--SIZES-->", "").replace("<!--UNITINFO-->", "")

    data = dict(D)
    data["strings"] = S
    data_js = "window.RV_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";"
    write(os.path.join(ROOT, "assets/js/data.js"), data_js)

    page = tpl.replace("<!--HEAD-->", EARLY).replace("<!--/HEAD-->", "")
    page = page.replace("<!--BODY-->", "").replace("<!--/BODY-->", "")
    page = page.replace("<!--SCRIPTS-->", '<script src="assets/js/data.js" defer></script>\n<script src="assets/js/app.js" defer></script>')
    write(os.path.join(ROOT, "index.html"), page)
    print("index.html", len(page.encode("utf-8")), "bytes")

    if args.artifact:
        body = tpl.split("<!--BODY-->")[1].split("<!--/BODY-->")[0]
        css = read("assets/css/style.css").replace("url(../", "url(assets/")
        adata = dict(data)
        adata["keepTitle"] = True
        adata["threeCdn"] = THREE_CDN
        out = "\n".join([
            "<title>Ravel Storage Profile</title>",
            '<meta name="claude:viewport-fit-sides" content="cover">',
            EARLY,
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600&family=Montserrat:wght@600;700;800&family=Noto+Kufi+Arabic:wght@600;700;800&display=swap">',
            "<style>\n" + css + "\n</style>",
            body,
            "<script>window.RV_DATA=" + json.dumps(adata, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";</script>",
            "<script>\n" + read("assets/js/scene3d.js") + "\n</script>",
            "<script>\n" + read("assets/js/app.js") + "\n</script>",
        ])
        p = os.path.join(args.artifact, "ravel-storage-profile.html")
        write(p, out)
        files = {}
        for sub in ("img", "fonts", "vendor"):
            for n in sorted(os.listdir(os.path.join(ROOT, "assets", sub))):
                if n.endswith(".txt") or n in ("og.jpg", "favicon.png"):
                    continue
                files["assets/%s/%s" % (sub, n)] = os.path.join(ROOT, "assets", sub, n)
        write(os.path.join(args.artifact, "files.json"), json.dumps(files, indent=1))
        print("artifact page", len(out.encode("utf-8")), "bytes;", len(files), "supporting files")


if __name__ == "__main__":
    main()
