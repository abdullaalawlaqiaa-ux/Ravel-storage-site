/* Ravel Storage interactive profile: page logic.
   Works without 3D ("lite" mode); the corridor and the unit model are progressive enhancements. */
(function () {
  'use strict';
  var D = window.RV_DATA; if (!D) return;
  var S = D.strings, doc = document, rootEl = doc.documentElement;
  rootEl.classList.add('js');
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  };
  var mm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduced = mm.matches;
  var params = {}; (location.search || '').replace(/^\?/, '').split('&').forEach(function (p) { var a = p.split('='); if (a[0]) params[a[0]] = decodeURIComponent(a[1] || ''); });
  var ASSET = (D.base || '') + 'assets/';
  // the single-file preview carries its images inside the page (D.img); a hosted copy loads them from assets/img
  function imgUrl(name, ext) { return D.img && D.img[name] ? D.img[name] : ASSET + 'img/' + name + '.' + (ext || 'webp'); }
  $$('img[data-img]').forEach(function (im) { var d = D.img && D.img[im.getAttribute('data-img')]; if (d) im.src = d; });
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function seg(x, a, b) { return clamp((x - a) / (b - a), 0, 1); }
  function ease(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function icon(id, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }

  /* ---------------- state ---------------- */
  var hash0 = (location.hash || '').replace('#', '');
  var lang0 = params.lang || (hash0 === 'en' ? 'en' : '') || store.get('rv_lang') || 'ar';
  var state = {
    lang: lang0 === 'en' ? 'en' : 'ar', size: 6, big: 150, saved: null, branch: null, view: '3d', items: true,
    lite: false, type: 'personal', touched: false,
    helper: { step: 1, cats: {}, qty: {}, preset: null, result: null, err: '' }
  };
  (function () {
    var sv = store.get('rv_saved'); if (!sv) return;
    if (sv.indexOf('big:') === 0) { state.saved = 'big'; state.big = clamp(+sv.slice(4) || 150, 110, 500); state.size = 'big'; }
    else if (D.sizes.some(function (s) { return s.a === +sv; })) { state.saved = +sv; state.size = +sv; }
  })();

  /* ---------------- i18n ---------------- */
  function t(key, vars) {
    var e = S[key]; if (!e) return key;
    var s = e[state.lang === 'ar' ? 0 : 1];
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function plain(key, vars) { return t(key, vars).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtDim(n) { return String(Math.round(n * 10) / 10); }
  function applyLang() {
    rootEl.lang = state.lang; rootEl.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split('|').forEach(function (p) { var a = p.split(':'); el.setAttribute(a[0], plain(a[1])); });
    });
    if (!D.keepTitle) doc.title = plain('meta.title');
  }

  /* ---------------- WhatsApp ---------------- */
  function wa(lines) { return 'https://wa.me/' + D.wa + '?text=' + encodeURIComponent(lines.filter(Boolean).join('\n')); }
  function branchName(id) { var b = D.branches.filter(function (x) { return x.id === id; })[0]; return b ? plain(b.name) : ''; }
  function unitLines(u) {
    var L = [plain('wa.hello')];
    if (u.open) L.push(plain('wa.big', { a: u.a })); else { L.push(plain('wa.unit')); L.push('• ' + plain('wa.size', { a: u.a })); }
    if (state.branch) L.push('• ' + plain('wa.branch', { b: branchName(state.branch) }));
    L.push(plain('wa.ask')); return L;
  }

  /* ---------------- units: data helpers ---------------- */
  function sizeObj(a) { return D.sizes.filter(function (s) { return s.a === a; })[0]; }
  function unitFor(a) {
    if (a === 'big') { var A = state.big, w = Math.max(8, Math.round(Math.sqrt(A / 1.25))); return { a: A, w: w, d: A / w, exact: false, price: null, photo: null, fits: 'open', open: true }; }
    return sizeObj(a);
  }
  function currentUnit() { return unitFor(state.size); }

  /* ---------------- example layout of items (shared by the 3D model and the 2D plan) ---------------- */
  var CAT = {
    box: { w: .5, d: .45, h: .42, c: '#C69D70' }, suit: { w: .5, d: .3, h: .72, c: '#4A5A73' },
    wardrobe: { w: 1.2, d: .6, h: 2.0, c: '#B48A5F' }, mattress: { w: 1.6, d: .28, h: 2.0, c: '#BCD0E8' },
    dresser: { w: .9, d: .45, h: .8, c: '#B48A5F' }, sofa: { w: 2.0, d: .9, h: .85, c: '#152249' },
    armchair: { w: .9, d: .85, h: .85, c: '#22346E' }, fridge: { w: .7, d: .7, h: 1.8, c: '#AEB9C6' },
    washer: { w: .6, d: .6, h: .85, c: '#D5DCE5' }, table: { w: 1.4, d: .8, h: .75, c: '#8FA0B8' },
    tv: { w: 1.2, d: .2, h: .75, c: '#C69D70' }, shelf: { w: .9, d: .4, h: 1.8, c: '#B8C3D1' },
    pallet: { w: 1.2, d: 1.0, h: 1.5, c: '#C69D70' }, rack: { w: 2.0, d: .6, h: 2.3, c: '#8FA0B8' }
  };
  var SEQ = {
    r1: ['box', 'box', 'suit', 'box', 'suit', 'box', 'box', 'box'],
    r2: ['mattress', 'wardrobe', 'dresser', 'box', 'tv', 'box', 'suit', 'box', 'box', 'box'],
    r2p: ['mattress', 'wardrobe', 'dresser', 'washer', 'armchair', 'tv', 'box', 'box', 'suit', 'box', 'box', 'box'],
    r3: ['mattress', 'wardrobe', 'sofa', 'fridge', 'washer', 'dresser', 'table', 'tv', 'box', 'box', 'box', 'box', 'suit', 'box', 'box'],
    r4: ['mattress', 'wardrobe', 'sofa', 'fridge', 'mattress', 'wardrobe', 'washer', 'dresser', 'table', 'armchair', 'tv', 'shelf', 'box', 'box', 'box', 'box', 'box', 'box', 'suit', 'box', 'box'],
    r5: ['mattress', 'wardrobe', 'sofa', 'fridge', 'mattress', 'wardrobe', 'washer', 'dresser', 'table', 'armchair', 'sofa', 'mattress', 'wardrobe', 'shelf', 'tv', 'dresser', 'shelf', 'armchair', 'box', 'box', 'box', 'box', 'box', 'box', 'box', 'box', 'suit', 'box', 'box', 'box', 'box', 'suit']
  };
  var layoutCache = {};
  function buildLayout(u) {
    var key = u.a + ':' + u.w + ':' + u.d; if (layoutCache[key]) return layoutCache[key];
    var out = [], w = u.w, d = u.d;
    if (u.fits === 'r6' || u.open) {
      // goods on pallets in double rows, racks along the back wall of a unit
      var z = -d / 2 + .25, row = 0, x;
      if (!u.open) { for (x = -w / 2 + .2; x + 2 <= w / 2 - .2; x += 2.15) out.push(item('rack', x + 1, z + .3, 0, row++)); z += 2.4; }
      var aisle = w >= 8 ? 1.1 : 0.6;
      while (z + 1 <= d / 2 - 1.3 && out.length < 150) {
        for (x = -w / 2 + .3; x + 1.2 <= w / 2 - .3; x += 1.35) { if (Math.abs(x + .6) < aisle) continue; out.push(item('pallet', x + .6, z + .5, 0, out.length)); }
        row++; z += 1 + (row % 2 === 0 ? 2.1 : .15);
      }
    } else {
      out = pack(w, d, SEQ[u.fits] || SEQ.r2, u.a * 1.65 * .82);
    }
    layoutCache[key] = out; return out;
  }
  function item(kind, x, z, yaw, i) {
    var c = CAT[kind], it = { kind: kind, x: x, z: z, w: c.w, d: c.d, h: c.h, c: c.c, yaw: yaw || 0 };
    if (kind === 'box') it.n = 3 + (i % 3 === 1 ? 0 : 1);
    if (kind === 'dresser' || kind === 'washer') it.top = i % 2 === 0;
    return it;
  }
  // greedy fill on a 10 cm grid: back wall first, then along the side walls, keeping a walkway to the door
  function pack(w, d, seq, capVol) {
    var R = .1, nx = Math.round(w / R), nz = Math.round(d / R), occ = new Uint8Array(nx * nz), out = [], vol = 0;
    var aisle = w >= 2.9, half = aisle ? 4.5 : 0, backRows = Math.round(1.0 / R), door = Math.round(Math.min(.55, d * .3) / R);
    function blocked(ix, iz) { return iz >= nz - door || (aisle && iz >= backRows && Math.abs(ix + .5 - nx / 2) < half); }
    function free(ix, iz, cw, cd) {
      if (ix < 0 || iz < 0 || ix + cw > nx || iz + cd > nz) return false;
      for (var z = iz; z < iz + cd; z++) for (var x = ix; x < ix + cw; x++) if (occ[z * nx + x] || blocked(x, z)) return false;
      return true;
    }
    var xs = []; for (var i = 0; i < nx; i++) xs.push(i % 2 === 0 ? i / 2 : nx - 1 - (i - 1) / 2);
    seq.forEach(function (kind, si) {
      if (vol >= capVol) return;
      var c = CAT[kind], o, iz, k;
      var opts = [[c.w, c.d, 0], [c.d, c.w, 1]];
      for (iz = 0; iz < nz; iz++) for (k = 0; k < xs.length; k++) for (o = 0; o < 2; o++) {
        var cw = Math.ceil(opts[o][0] / R - 1e-6), cd = Math.ceil(opts[o][1] / R - 1e-6), right = xs[k] >= nx / 2, ix = right ? xs[k] - cw + 1 : xs[k];
        if (!free(ix, iz, cw, cd)) continue;
        for (var z = iz; z < iz + cd; z++) for (var x = ix; x < ix + cw; x++) occ[z * nx + x] = 1;
        var px = (ix + cw / 2) * R - w / 2, pz = (iz + cd / 2) * R - d / 2;
        // rotated pieces stand along a side wall and face into the room
        var it = item(kind, px, pz, opts[o][2] ? (px < 0 ? Math.PI / 2 : -Math.PI / 2) : 0, si);
        out.push(it); vol += c.w * c.d * c.h * (it.n || 1);
        return;
      }
    });
    return out;
  }

  /* ---------------- units: explorer UI ---------------- */
  var sizesEl = $('#sizes'), infoEl = $('#unitInfo'), footPrev = null;
  function renderSizes() {
    var h = D.sizes.map(function (s) {
      var on = state.size === s.a;
      return '<button class="size rtick' + (s.photo ? ' has-photo' : '') + '" type="button" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-a="' + s.a + '" aria-label="' + s.a + ' ' + plain('m2') + '"><b>' + s.a + '</b><small>' + t('m2') + '</small></button>';
    }).join('');
    var onBig = state.size === 'big';
    h += '<button class="size rtick rtick--more" type="button" role="radio" aria-checked="' + onBig + '" tabindex="' + (onBig ? 0 : -1) + '" data-a="big" aria-label="' + plain('u.open') + '"><b><bdi dir="ltr">100+</bdi></b><small>' + t('m2') + '</small></button>';
    sizesEl.innerHTML = h; rulerNear = null; $('#bigRange').hidden = !onBig;
    $('#bigInput').value = state.big; $('#bigOut').textContent = state.big + ' ' + plain('m2');
    requestAnimationFrame(function () { rulerGo(state.size, true); });
  }
  /* the ruler: the tick under the needle is the chosen size, so dragging it reshapes the unit as it goes */
  var rulerTarget = null, rulerT = 0, rulerRaf = 0, rulerNear = null;
  function rulerMark() {
    var r = sizesEl.getBoundingClientRect(), mid = r.left + r.width / 2, best = null, bd = 1e9;
    $$('.size', sizesEl).forEach(function (b) { var q = b.getBoundingClientRect(), dd = Math.abs(q.left + q.width / 2 - mid); if (dd < bd) { bd = dd; best = b; } });
    if (best && best !== rulerNear) { if (rulerNear) rulerNear.classList.remove('is-near'); best.classList.add('is-near'); rulerNear = best; }
    return best;
  }
  function rulerGo(a, instant) {
    var b = $('.size[data-a="' + a + '"]', sizesEl); if (!b) return;
    var r = sizesEl.getBoundingClientRect(), q = b.getBoundingClientRect(), delta = (q.left + q.width / 2) - (r.left + r.width / 2);
    if (!r.width || Math.abs(delta) < 1) { rulerMark(); return; }
    rulerTarget = String(a); clearTimeout(rulerT); rulerT = setTimeout(function () { rulerTarget = null; }, 900);
    if (instant || reduced || !sizesEl.scrollBy) sizesEl.scrollLeft += delta; else sizesEl.scrollBy({ left: delta, behavior: 'smooth' });
  }
  sizesEl.addEventListener('scroll', function () {
    if (rulerRaf) return;
    rulerRaf = requestAnimationFrame(function () {
      rulerRaf = 0; var c = rulerMark(); if (!c) return;
      var a = c.getAttribute('data-a');
      if (rulerTarget != null) { if (a === rulerTarget) rulerTarget = null; return; }   // gliding to a chosen tick: wait until it lands
      if (String(state.size) !== a) selectSize(a === 'big' ? 'big' : +a, true, true);
    });
  }, { passive: true });
  function fitsKey(u) { return 'fits.' + u.fits; }
  function dimsHtml(u) { return (u.exact ? '' : '≈ ') + '<span dir="ltr">' + fmtDim(u.w) + ' × ' + fmtDim(u.d) + '</span> ' + t('m'); }
  function renderInfo() {
    var u = currentUnit(), saved = state.saved === state.size, h = '';
    // a small floor shape beside the number: it starts at the previous size and stretches to the new one
    var fs = 58 / Math.max(u.w, u.d), nf = { w: Math.round(u.w * fs), h: Math.round(u.d * fs), s: fs }, pf = footPrev || nf;
    h += '<div class="unitinfo__top"><span class="unitinfo__a">' + u.a + '</span><span class="unitinfo__u">' + t('m2') + '</span>' +
      (u.open ? '<span class="unitinfo__tag">' + t('u.open') + '</span>'
        : '<span class="foot" aria-hidden="true"><i style="width:' + pf.w + 'px;height:' + pf.h + 'px;background-size:' + pf.s.toFixed(2) + 'px ' + pf.s.toFixed(2) + 'px"></i></span>') + '</div>';
    if (u.open) h += '<p class="tiny">' + t('u.openNote') + '</p>';
    else {
      h += '<dl class="facts"><div class="fact"><dt>' + t('u.dims') + '</dt><dd>' + dimsHtml(u) + '</dd></div>';
      h += '<div class="fact"><dt>' + t('u.height') + '</dt><dd>' + D.height + ' ' + t('m') + '</dd></div>';
      h += '<div class="fact"><dt>' + t('u.volume') + '</dt><dd>' + fmt(Math.round(u.a * D.height)) + ' ' + t('m3') + '</dd></div></dl>';
    }
    h += '<div class="fitsline">' + icon('i-box') + '<div><span class="tiny">' + t('u.fits') + '</span><b>' + t(fitsKey(u)) + '</b></div></div>';
    // sizes without a listed monthly rent are priced on request, by phone or WhatsApp
    h += '<div class="pricebox"><span class="pricebox__l">' + t(u.price ? 'u.price' : 'u.priceAsk') + '</span>';
    if (u.price) h += '<span class="pricebox__v">' + fmt(u.price) + ' <small>' + t('cur') + ' / ' + t('perMonth') + '</small></span><span class="pricebox__d">' + t('u.otherTerms') + '</span>';
    else h += '<span class="pricebox__q">' + t('u.quote') + '</span><span class="pricebox__d">' + t('u.quoteNote') + '</span>';
    h += '</div>';
    h += '<p class="tiny">' + (u.price ? t('u.priceNote') + ' ' : '') + t('u.ac') + '</p>';
    h += '<div class="unitinfo__actions"><a class="btn btn--wa" id="unitWa" target="_blank" rel="noopener" href="' + wa(unitLines(u)) + '">' + icon('i-chat') + '<span>' + t('u.cta') + '</span></a>';
    h += '<button class="btn btn--ghost btn--save" id="saveBtn" type="button" aria-pressed="' + saved + '">' + icon('i-save') + '<span>' + t(saved ? 'u.saved' : 'u.save') + '</span></button>';
    if (!u.price) h += '<a class="btn btn--line unitinfo__call" href="tel:' + D.phone + '">' + icon('i-phone') + '<span>' + t('u.callAsk') + '</span><span class="num" dir="ltr">' + D.phoneDisplay + '</span></a>';
    h += '</div>';
    h += '<a class="link" href="#helper">' + t('u.unsure') + '</a>';
    infoEl.innerHTML = h;
    if (!u.open) {
      footPrev = nf; var fi = $('.foot i', infoEl);
      requestAnimationFrame(function () { if (!fi) return; fi.style.width = nf.w + 'px'; fi.style.height = nf.h + 'px'; fi.style.backgroundSize = nf.s.toFixed(2) + 'px ' + nf.s.toFixed(2) + 'px'; });
    }
  }
  function unitTexts(u) { var p = u.exact ? '' : '≈ '; return { w: p + fmtDim(u.w) + ' ' + plain('m'), d: p + fmtDim(u.d) + ' ' + plain('m'), h: D.height + ' ' + plain('m') }; }

  var viewer = null;
  function updateViewer(instant) {
    var u = currentUnit(), layout = state.items ? buildLayout(u) : [];
    if (viewer) viewer.setUnit(u, layout, unitTexts(u), instant);
    $('#unitPlan').innerHTML = planSvg(u, layout);
  }
  function nearestPhoto(u) {
    if (u.photo) return { s: u, exact: true };
    var best = null, bd = 1e9;
    D.sizes.forEach(function (s) { if (!s.photo) return; var dd = Math.abs(Math.log(s.a / u.a)); if (dd < bd) { bd = dd; best = s; } });
    return { s: best, exact: false };
  }
  function updatePhoto() {
    var p = nearestPhoto(currentUnit()), img = $('#unitPhotoImg'), name = p.s.photo, src = imgUrl(name);
    if (img.getAttribute('data-photo') !== name) {
      img.setAttribute('data-photo', name);
      img.onerror = src.indexOf('data:') === 0 ? null : function () { img.onerror = null; img.src = imgUrl(name, 'jpg'); };
      img.src = src;
    }
    var cap = plain(p.exact ? 'u.photoCap' : 'u.photoNear', { a: p.s.a }); img.alt = cap; $('#unitPhotoCap').textContent = cap;
  }
  // every size drawn as its real floor shape (width across, length up) on one scale, nested from the door corner
  function compareSvg(u) {
    var set = (u.open || u.a > 30) ? [1, 6, 16, 30, 50, 100] : [1, 2, 4, 6, 9, 12, 16, 20, 25, 30];
    if (!u.open && set.indexOf(u.a) < 0) set.push(u.a);
    set.sort(function (a, b) { return a - b; });
    var units = set.map(sizeObj), maxW = 0, maxL = 0;
    units.forEach(function (s) { maxW = Math.max(maxW, s.w); maxL = Math.max(maxL, s.d); });
    var P = 300, rtl = state.lang === 'ar', carW = 1.8, carL = 4.5, gap = maxW > 6 ? 1 : .5;
    var padA = 30, padB = 8, padTop = 36, padBot = 30;   // padA: the side the shapes grow from, with the length scale
    var k = Math.min((P - padA - padB) / (maxW + gap + carW), (P - padTop - padBot) / Math.max(maxL, carL));
    var baseY = P - padBot - ((P - padTop - padBot) - Math.max(maxL, carL) * k) / 2, x0 = rtl ? P - padA : padA, dir = rtl ? -1 : 1, parts = [];
    function X(m) { return x0 + dir * m * k; }
    function rectAttrs(s) { var w = s.w * k, h = s.d * k; return 'x="' + (rtl ? x0 - w : x0).toFixed(1) + '" y="' + (baseY - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '"'; }
    units.slice().reverse().forEach(function (s) {
      var on = !u.open && s.a === u.a;
      parts.push('<rect class="cmp' + (on ? ' is-on' : '') + '" data-a="' + s.a + '" ' + rectAttrs(s) + ' tabindex="0" role="button" aria-label="' + s.a + ' ' + plain('m2') + ': ' + fmtDim(s.w) + ' × ' + fmtDim(s.d) + ' ' + plain('m') + '"/>');
    });
    // one square of the grid is one square metre
    var step = maxL > 6 ? 2 : 1, i;
    for (i = 0; i <= maxW; i++) parts.push('<line class="cmp__g" x1="' + X(i).toFixed(1) + '" y1="' + baseY.toFixed(1) + '" x2="' + X(i).toFixed(1) + '" y2="' + (baseY - maxL * k).toFixed(1) + '"/>');
    for (i = 0; i <= maxL; i++) parts.push('<line class="cmp__g" x1="' + x0 + '" y1="' + (baseY - i * k).toFixed(1) + '" x2="' + X(maxW).toFixed(1) + '" y2="' + (baseY - i * k).toFixed(1) + '"/>');
    for (i = step; i <= maxW; i += step) parts.push('<text class="cmp__ax" x="' + X(i).toFixed(1) + '" y="' + (baseY + 11).toFixed(1) + '" text-anchor="middle">' + i + '</text>');
    for (i = step; i <= maxL; i += step) parts.push('<text class="cmp__ax" x="' + (x0 - dir * 8).toFixed(1) + '" y="' + (baseY - i * k + 3).toFixed(1) + '" text-anchor="middle">' + i + '</text>');
    parts.push('<text class="cmp__axt" x="' + X(maxW / 2).toFixed(1) + '" y="' + (baseY + 23).toFixed(1) + '" text-anchor="middle">' + plain('cmp.w') + ' (' + plain('m') + ')</text>');
    var lx = x0 - dir * 21, ly = baseY - maxL * k / 2;
    parts.push('<text class="cmp__axt" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" transform="rotate(' + (rtl ? 90 : -90) + ' ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')">' + plain('cmp.l') + ' (' + plain('m') + ')</text>');
    units.forEach(function (s) {
      var on = !u.open && s.a === u.a, w = s.w * k, h = s.d * k;
      if (on) parts.push('<rect class="cmp__sel" ' + rectAttrs(s) + ' rx="2"/>');
      if (w < 15 && !on) return;
      parts.push('<text class="cmp__t' + (on ? ' is-on' : '') + '" x="' + X(s.w - 5 / k).toFixed(1) + '" y="' + (baseY - h + 13).toFixed(1) + '" text-anchor="' + (rtl ? 'start' : 'end') + '">' + s.a + '</text>');
    });
    // a parked car (1.8 x 4.5 m) beside the shapes, at the same scale
    var cx = rtl ? X(maxW + gap + carW) : X(maxW + gap), cy = baseY - carL * k;
    parts.push('<rect class="cmp__ref" x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" width="' + (carW * k).toFixed(1) + '" height="' + (carL * k).toFixed(1) + '" rx="' + (carW * k * .28).toFixed(1) + '"/>');
    parts.push('<text class="cmp__r" x="' + (cx + carW * k / 2).toFixed(1) + '" y="' + (cy + carL * k / 2 + 3).toFixed(1) + '" text-anchor="middle">' + plain('cmp.car') + '</text>');
    return '<svg viewBox="0 0 300 300" role="group" aria-label="' + plain('cmp.title') + '">' + parts.join('') + '</svg>';
  }
  function renderCompare() {
    var u = currentUnit();
    $('#compareSvg').innerHTML = compareSvg(u);
    $('#compareCap').innerHTML = u.open ? t('u.open') : u.a + ' ' + t('m2') + ' = ' + dimsHtml(u);
  }
  function planSvg(u, layout) {
    var P = 300, pad = 30, k = Math.min((P - pad * 2) / u.w, (P - pad * 2 - 16) / u.d), W = u.w * k, H = u.d * k, x0 = (P - W) / 2, y0 = (P - H) / 2 - 8, p = [], i;
    p.push('<rect x="' + x0 + '" y="' + y0 + '" width="' + W + '" height="' + H + '" fill="#FAFBFC"/>');
    for (i = 1; i < u.w; i++) p.push('<line class="plan__g" x1="' + (x0 + i * k) + '" y1="' + y0 + '" x2="' + (x0 + i * k) + '" y2="' + (y0 + H) + '"/>');
    for (i = 1; i < u.d; i++) p.push('<line class="plan__g" x1="' + x0 + '" y1="' + (y0 + i * k) + '" x2="' + (x0 + W) + '" y2="' + (y0 + i * k) + '"/>');
    layout.forEach(function (it) {
      var rot = Math.abs(it.yaw) > .1, fw = (rot ? it.d : it.w) * k, fd = (rot ? it.w : it.d) * k;
      p.push('<rect x="' + (x0 + (it.x + u.w / 2) * k - fw / 2 + .6).toFixed(1) + '" y="' + (y0 + (it.z + u.d / 2) * k - fd / 2 + .6).toFixed(1) + '" width="' + Math.max(1, fw - 1.2).toFixed(1) + '" height="' + Math.max(1, fd - 1.2).toFixed(1) + '" rx="2" fill="' + it.c + '" stroke="rgba(21,34,73,.35)" stroke-width="1"/>');
    });
    p.push('<rect class="plan__o" x="' + x0 + '" y="' + y0 + '" width="' + W + '" height="' + H + '"' + (u.open ? ' stroke-dasharray="6 5"' : '') + '/>');
    if (!u.open) {
      var dw = Math.min(.9, u.w * .8) * k; p.push('<line class="plan__d" x1="' + (P / 2 - dw / 2) + '" y1="' + (y0 + H) + '" x2="' + (P / 2 + dw / 2) + '" y2="' + (y0 + H) + '"/>');
      p.push('<circle cx="' + (P / 2 + Math.min(dw / 2, .5 * k)) + '" cy="' + (y0 + H + Math.max(7, .32 * k)) + '" r="' + Math.max(3.5, .22 * k) + '" fill="#152249"/>');
    }
    if (!u.open) {
      var tx = unitTexts(u);
      p.push('<text class="plan__t" x="' + (P / 2) + '" y="' + (y0 - 9) + '" text-anchor="middle">' + tx.w + '</text>');
      p.push('<text class="plan__t" x="' + (x0 - 9) + '" y="' + (y0 + H / 2) + '" text-anchor="middle" transform="rotate(-90 ' + (x0 - 9) + ' ' + (y0 + H / 2) + ')">' + tx.d + '</text>');
    }
    return '<svg viewBox="0 0 300 300" aria-hidden="true">' + p.join('') + '</svg>';
  }
  function setView(v) {
    state.view = v;
    $$('#viewTabs .seg__btn').forEach(function (b) { var on = b.getAttribute('data-view') === v; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    $('#pane3d').hidden = v !== '3d'; $('#panePhoto').hidden = v !== 'photo'; $('#paneCompare').hidden = v !== 'compare';
    $('#viewerStage').setAttribute('data-view', v);
    $('#viewerBar').hidden = v !== '3d';
    if (v === 'photo') updatePhoto();
    $('#compareNote').hidden = v !== 'compare';
    if (v === 'compare') renderCompare();
    if (viewer) viewer.setActive(v === '3d' && viewerVisible);
    if (v === '3d' && viewer) viewer.resize();
  }
  function renderItemsToggle() { $('#itemsToggle').setAttribute('aria-pressed', state.items); $('#itemsToggleText').textContent = plain(state.items ? 'u.itemsOn' : 'u.itemsOff'); }
  function renderUnit(instant) {
    renderInfo(); updateViewer(instant);
    if (state.view === 'photo') updatePhoto();
    if (state.view === 'compare') renderCompare();
    syncPrices(); syncQuoteSize(); updateDock(); renderDoor();
  }
  function selectSize(a, user, fromRuler) {
    state.size = a; if (user) state.touched = true;
    $$('.size', sizesEl).forEach(function (b) { var on = String(b.getAttribute('data-a')) === String(a); b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    $('#bigRange').hidden = a !== 'big';
    if (!fromRuler) rulerGo(a, false);
    renderUnit(false);
    if (window.RVFX) window.RVFX.sizeChanged();
  }
  sizesEl.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('.size') : null; if (b) selectSize(b.getAttribute('data-a') === 'big' ? 'big' : +b.getAttribute('data-a'), true); });
  sizesEl.addEventListener('keydown', function (e) {
    var keys = { ArrowRight: state.lang === 'ar' ? -1 : 1, ArrowLeft: state.lang === 'ar' ? 1 : -1, ArrowDown: 1, ArrowUp: -1 }, dir = keys[e.key]; if (!dir) return;
    var all = $$('.size', sizesEl), i = all.indexOf(doc.activeElement); if (i < 0) return;
    e.preventDefault(); var n = all[(i + dir + all.length) % all.length]; n.focus(); n.click();
  });
  $('#bigInput').addEventListener('input', function () { state.big = +this.value; $('#bigOut').textContent = state.big + ' ' + plain('m2'); if (state.saved === 'big') store.set('rv_saved', 'big:' + state.big); renderUnit(false); });
  $('#viewTabs').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('.seg__btn') : null; if (b) setView(b.getAttribute('data-view')); });
  $('#itemsToggle').addEventListener('click', function () { state.items = !state.items; renderItemsToggle(); updateViewer(true); });
  $('#paneCompare').addEventListener('click', function (e) { var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (a) selectSize(+a, true); });
  $('#paneCompare').addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute('data-a')) { e.preventDefault(); selectSize(+e.target.getAttribute('data-a'), true); } });
  infoEl.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('#saveBtn') : null; if (!b) return;
    if (state.saved === state.size) { state.saved = null; store.del('rv_saved'); }
    else { state.saved = state.size; store.set('rv_saved', state.size === 'big' ? 'big:' + state.big : String(state.size)); toast(plain('u.savedToast', { a: currentUnit().a })); }
    renderInfo(); updateDock();
  });

  /* ---------------- size helper ---------------- */
  var HC = [
    { id: 'furniture', ic: 'i-sofa', items: [['sofa', 2], ['armchair', .8], ['bedD', 2.2], ['bedS', 1.3], ['wardrobe', 2], ['dresser', .7], ['dining', 2], ['tableS', .3], ['shelf', .9]] },
    { id: 'boxes', ic: 'i-box', items: [['boxS', .06], ['boxM', .1], ['boxL', .2]] },
    { id: 'appliances', ic: 'i-fridge', items: [['fridge', 1.2], ['washer', .5], ['cooker', .5], ['tv', .3], ['ac', .3]] },
    { id: 'business', ic: 'i-pallet', items: [['pallet', 0, 1.5], ['rack', 0, 1.8], ['equip', 0, 1.2], ['stock', .1]] },
    { id: 'personal', ic: 'i-suitcase', items: [['suitcase', .15], ['bag', .1], ['bike', .6], ['sports', .3]] },
    { id: 'office', ic: 'i-desk', items: [['desk', .9], ['chair', .35], ['cabinet', .5], ['archive', .05], ['printer', .2], ['meeting', 1.5]] }
  ];
  var PRESETS = {
    room: { bedD: 1, wardrobe: 1, dresser: 1, tableS: 1, tv: 1, boxM: 10 },
    '1br': { sofa: 1, armchair: 1, bedD: 1, wardrobe: 1, dresser: 1, dining: 1, tableS: 1, fridge: 1, washer: 1, cooker: 1, tv: 1, boxM: 20 },
    '2br': { sofa: 1, armchair: 1, bedD: 1, bedS: 2, wardrobe: 2, dresser: 1, dining: 1, tableS: 1, shelf: 1, fridge: 1, washer: 1, cooker: 1, tv: 1, boxM: 30 },
    '3br': { sofa: 2, armchair: 2, bedD: 2, bedS: 2, wardrobe: 3, dresser: 2, dining: 1, tableS: 2, shelf: 2, fridge: 1, washer: 1, cooker: 1, tv: 2, ac: 2, boxM: 45, suitcase: 4, bike: 2 }
  };
  var REC = D.sizes.filter(function (s) { return s.price || s.a >= 50; }).map(function (s) { return s.a; });
  var H = state.helper, hBody = $('#helperBody');
  function helperCalc() {
    var vol = 0, foot = 0, lines = [];
    HC.forEach(function (c) {
      if (!H.cats[c.id]) return;
      c.items.forEach(function (it) { var q = H.qty[it[0]] || 0; if (!q) return; vol += q * it[1]; foot += q * (it[2] || 0); lines.push({ k: 'h.i.' + it[0], q: q }); });
    });
    // items stack to roughly 2.2 m and fill about three quarters of the floor: 1 m2 holds about 1.65 m3
    var need = Math.max(.5, vol / 1.65 + foot), rec = REC.filter(function (a) { return a >= need - 1e-9; })[0] || null;
    return { vol: vol, foot: foot, need: need, rec: rec, alt: rec ? REC[REC.indexOf(rec) + 1] || null : null, lines: lines };
  }
  function helperLines(r) {
    var L = [plain('wa.hello'), plain('wa.helper')];
    r.lines.forEach(function (l) { L.push('• ' + plain(l.k) + ' × ' + l.q); });
    L.push(r.rec ? plain('wa.estimate', { a: r.rec }) : plain('wa.estimateBig'));
    if (state.branch) L.push(plain('wa.branch', { b: branchName(state.branch) }));
    return L;
  }
  // the live box above the list: how full the suggested unit is, with one colour per kind of item
  function fillSync() {
    if (!window.RVFX) return;
    var r = helperCalc(), cats = [], has = r.lines.length > 0;
    HC.forEach(function (c) {
      if (!H.cats[c.id]) return; var v = 0;
      c.items.forEach(function (it) { v += (H.qty[it[0]] || 0) * (it[1] + (it[2] || 0) * 1.65); });
      if (v > 0) cats.push([c.id, v]);
    });
    var frac = !has ? 0 : r.rec ? Math.min(1, r.need / r.rec) : 1;
    window.RVFX.fill(H.step >= 2, frac, cats,
      !has ? '' : r.rec ? r.rec + ' ' + plain('m2') : plain('h.fillOver'),
      !has ? plain('h.fillEmpty') : r.rec ? plain('h.fillNote', { p: Math.round(frac * 100) }) : '');
  }
  function renderHelper() {
    var h = '', total = 0;
    $('#helperStep').textContent = plain('h.step', { n: H.step }); $('#helperBar').style.width = (H.step * 33.34) + '%';
    if (H.step === 1) {
      h += '<h3 class="helper__q">' + t('h.s1') + '</h3><p class="tiny">' + t('h.s1hint') + '</p>';
      h += '<div class="cats">' + HC.map(function (c) {
        return '<button class="cat" type="button" aria-pressed="' + !!H.cats[c.id] + '" data-cat="' + c.id + '">' + icon(c.ic) + '<span>' + t('h.cat.' + c.id) + '</span><span class="cat__check">' + icon('i-check') + '</span></button>';
      }).join('') + '</div>';
      h += '<p class="label" style="margin:16px 0 0">' + t('h.preset') + '</p><div class="presets">' + ['room', '1br', '2br', '3br'].map(function (p) {
        return '<button class="preset' + (H.preset === p ? ' is-on' : '') + '" type="button" data-preset="' + p + '">' + t('h.p.' + p) + '</button>';
      }).join('') + '</div>';
    } else if (H.step === 2) {
      h += '<h3 class="helper__q">' + t('h.s2') + '</h3>';
      HC.forEach(function (c) {
        if (!H.cats[c.id]) return;
        h += '<div class="qgroup"><h4>' + icon(c.ic) + '<span>' + t('h.cat.' + c.id) + '</span></h4>' + c.items.map(function (it) {
          var q = H.qty[it[0]] || 0, nm = plain('h.i.' + it[0]); total += q;
          return '<div class="qrow"><span class="qrow__name">' + t('h.i.' + it[0]) + '</span><span class="stepper">' +
            '<button type="button" data-step="-1" data-item="' + it[0] + '" aria-label="' + plain('h.minus') + ': ' + nm + '">' + icon('i-minus') + '</button>' +
            '<output class="' + (q ? '' : 'is-zero') + '" aria-label="' + plain('h.qty') + ': ' + nm + '">' + q + '</output>' +
            '<button type="button" data-step="1" data-item="' + it[0] + '" aria-label="' + plain('h.plus') + ': ' + nm + '">' + icon('i-plus') + '</button></span></div>';
        }).join('') + '</div>';
      });
    } else {
      var r = H.result, u = r.rec ? sizeObj(r.rec) : null;
      h += '<div class="result"><span class="tiny">' + t('h.s3') + '</span>';
      if (u) {
        h += '<div class="result__size">' + u.a + ' <small>' + t('m2') + '</small></div><p class="result__fits">' + t('u.fits') + ': ' + t(fitsKey(u)) + '</p>';
        if (u.price) h += '<p><b class="num">' + fmt(u.price) + '</b> ' + t('cur') + ' / ' + t('perMonth') + '</p>';
        if (r.alt) { var au = sizeObj(r.alt); h += '<p class="tiny">' + (u.price && au.price ? t('h.alt', { a: au.a, d: fmt(au.price - u.price) }) : t('h.altNo', { a: au.a })) + '</p>'; }
      } else h += '<div class="result__over">' + t('h.over') + '</div><p>' + t('h.big') + '</p>';
      if (r.vol > 0) h += '<p class="tiny">' + t('h.vol', { v: fmtDim(r.vol) }) + ' · ' + t('h.basis') + '</p>';
      h += '<p class="disclaimer">' + t('h.disclaimer') + '</p>';
      h += '<div class="result__actions"><a class="btn btn--wa" target="_blank" rel="noopener" href="' + wa(helperLines(r)) + '">' + icon('i-chat') + '<span>' + t('h.confirm') + '</span></a>';
      if (u) h += '<a class="btn btn--navy" href="#units" data-see="' + u.a + '">' + icon('i-cube') + '<span>' + t('h.see') + '</span></a>';
      h += '</div></div>';
    }
    if (H.err) h += '<p class="helper__err" role="alert">' + t(H.err) + '</p>';
    hBody.innerHTML = h;
    $('#helperBack').style.visibility = H.step === 1 ? 'hidden' : 'visible';
    $('#helperNextText').textContent = plain(H.step === 1 ? 'h.next' : H.step === 2 ? 'h.calc' : 'h.restart');
    $('#helperNext').className = 'btn ' + (H.step === 3 ? 'btn--ghost' : 'btn--navy');
    fillSync(); remeasureSoon();
  }
  hBody.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-cat],[data-preset],[data-step],[data-see]') : null; if (!el) return;
    H.err = '';
    if (el.hasAttribute('data-cat')) { var id = el.getAttribute('data-cat'); H.cats[id] = !H.cats[id]; H.preset = null; el.setAttribute('aria-pressed', !!H.cats[id]); $$('.preset', hBody).forEach(function (p) { p.classList.remove('is-on'); }); var er = $('.helper__err', hBody); if (er) er.remove(); return; }
    if (el.hasAttribute('data-preset')) {
      var p = el.getAttribute('data-preset'); H.preset = p; H.qty = {}; H.cats = {};
      Object.keys(PRESETS[p]).forEach(function (k) { H.qty[k] = PRESETS[p][k]; });
      HC.forEach(function (c) { if (c.items.some(function (it) { return H.qty[it[0]]; })) H.cats[c.id] = true; });
      H.step = 2; renderHelper(); return;
    }
    if (el.hasAttribute('data-step')) {
      var it = el.getAttribute('data-item'), q = clamp((H.qty[it] || 0) + (+el.getAttribute('data-step')), 0, 200); H.qty[it] = q; H.preset = null;
      var out = el.parentNode.querySelector('output'); out.textContent = q; out.className = q ? '' : 'is-zero'; fillSync();
      var er2 = $('.helper__err', hBody); if (er2) er2.remove(); return;
    }
    if (el.hasAttribute('data-see')) selectSize(+el.getAttribute('data-see'), true);
  });
  $('#helperNext').addEventListener('click', function () {
    H.err = '';
    if (H.step === 1) { if (!HC.some(function (c) { return H.cats[c.id]; })) H.err = 'h.needCat'; else H.step = 2; }
    else if (H.step === 2) { var r = helperCalc(); if (!r.lines.length) H.err = 'h.needQty'; else { H.result = r; H.step = 3; } }
    else { H.step = 1; H.cats = {}; H.qty = {}; H.preset = null; H.result = null; }
    renderHelper(); $('#helperBox').scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  });
  $('#helperBack').addEventListener('click', function () { H.err = ''; if (H.step > 1) H.step--; renderHelper(); });

  /* ---------------- prices ---------------- */
  var ptbody = $('#ptbody');
  function renderPrices() {
    ptbody.innerHTML = D.sizes.filter(function (s) { return s.price; }).map(function (s) {
      return '<tr data-a="' + s.a + '" tabindex="0" aria-selected="false"><td>' + s.a + '</td><td>' + (s.a * D.height) + '</td><td>' + fmt(s.price) + '</td></tr>';
    }).join('');
    syncPrices();
  }
  function syncPrices() {
    var u = currentUnit(), has = false;
    $$('tr', ptbody).forEach(function (tr) { var on = !u.open && +tr.getAttribute('data-a') === u.a; tr.setAttribute('aria-selected', on); if (on) has = true; });
    var box = $('#pSelected'); box.hidden = !(has && state.touched);
    if (has) $('#pSelectedText').textContent = plain('p.selected', { a: u.a, p: fmt(u.price) });
  }
  ptbody.addEventListener('click', function (e) { var tr = e.target.closest ? e.target.closest('tr') : null; if (tr) selectSize(+tr.getAttribute('data-a'), true); });
  ptbody.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { var tr = e.target.closest ? e.target.closest('tr') : null; if (tr) { e.preventDefault(); selectSize(+tr.getAttribute('data-a'), true); } } });

  /* ---------------- small interactive bits ---------------- */
  function tabs(container, attr, onPick) {
    container.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[' + attr + ']') : null; if (b && container.contains(b)) onPick(b.getAttribute(attr), true); });
  }
  // who is it for
  tabs($('#whoTabs'), 'data-who', function (w) {
    $$('#whoTabs .seg__btn').forEach(function (b) { var on = b.getAttribute('data-who') === w; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    $('#who-ind').hidden = w !== 'ind'; $('#who-biz').hidden = w !== 'biz'; remeasureSoon();
  });
  $$('.qa').forEach(function (d) { d.addEventListener('toggle', remeasureSoon); });
  // the three "how it works" steps light up in turn while they are on screen (never under reduced motion)
  var stepsOn = false, stepIdx = 0;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { stepsOn = es[0].isIntersecting; }, { threshold: .4 }).observe($('#steps3'));
  if (!reduced) setInterval(function () { if (!stepsOn) return; stepIdx = (stepIdx + 1) % 3; $$('#steps3 .step').forEach(function (s, i) { s.classList.toggle('is-on', i === stepIdx); }); }, 2200);

  /* ---------------- branches ---------------- */
  function renderBranches() {
    $('#branchList').innerHTML = D.branches.map(function (b) {
      var nm = plain(b.name), chosen = state.branch === b.id;
      var first = b.map
        ? '<a class="btn btn--sm btn--navy" target="_blank" rel="noopener" href="' + b.map + '">' + icon('i-pin') + '<span>' + t('b.dir') + '</span></a>'
        : '<a class="btn btn--sm btn--navy" target="_blank" rel="noopener" href="' + wa([plain('wa.hello'), plain('wa.loc', { b: nm })]) + '">' + icon('i-pin') + '<span>' + t('b.loc') + '</span></a>';
      return '<li class="card branch' + (chosen ? ' is-chosen' : '') + '" data-b="' + b.id + '"><h3 class="branch__name"><span>' + t(b.name) + '</span>' + (chosen ? '<span class="plate">' + t('b.chosen') + '</span>' : '') + '</h3>' +
        '<p class="branch__row">' + icon('i-pin') + '<span>' + t(b.area) + '</span></p>' +
        (b.map ? '' : '<p class="tiny">' + t('b.note') + '</p>') +
        '<div class="branch__actions">' + first +
        '<a class="btn btn--sm btn--ghost" target="_blank" rel="noopener" href="' + wa([plain('wa.hello'), plain('wa.visit', { b: nm })]) + '">' + t('b.visit') + '</a>' +
        '<button class="btn btn--sm btn--line" type="button" data-choose="' + b.id + '" aria-pressed="' + chosen + '">' + (chosen ? icon('i-check') : '') + '<span>' + t(chosen ? 'b.chosen' : 'b.choose') + '</span></button></div></li>';
    }).join('');
  }
  $('#branchList').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-choose]') : null; if (!b) return;
    var id = b.getAttribute('data-choose'); state.branch = state.branch === id ? null : id;
    renderBranches(); renderInfo(); $('#qBranch').value = state.branch || ''; renderQuote(); updateDock();
  });

  /* ---------------- contact + quote ---------------- */
  function fillSelect(el, opts, val) { el.innerHTML = opts.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join(''); el.value = val; }
  function buildQuoteForm() {
    var sz = $('#qSize'), keep = sz.value, br = $('#qBranch'), kb = br.value || state.branch || '', tm = $('#qTerm'), kt = tm.value || 'x';
    fillSelect(sz, [['', plain('c.sizeAny')]].concat(D.sizes.map(function (s) { return [String(s.a), s.a + ' ' + plain('m2')]; })).concat([['big', plain('c.sizeBig')]]), keep);
    fillSelect(br, [['', plain('c.branchAny')]].concat(D.branches.map(function (b) { return [b.id, plain(b.name)]; })), kb);
    fillSelect(tm, [['x', plain('c.tx')], ['D', plain('c.tD')], ['M', plain('c.tM')], ['Y', plain('c.tY')]], kt);
  }
  var quoteTouched = false;
  function syncQuoteSize() { if (!quoteTouched && state.touched) { $('#qSize').value = String(state.size); renderQuote(); } }
  function renderQuote() {
    var name = $('#qName').value.trim(), sz = $('#qSize').value, br = $('#qBranch').value, tm = $('#qTerm').value, notes = $('#qNotes').value.trim();
    var L = [plain('wa.hello'), plain('wa.quote')];
    if (name) L.push('• ' + plain('wa.name', { n: name }));
    L.push('• ' + (sz === 'big' ? plain('wa.size', { a: '100+' }) : sz ? plain('wa.size', { a: sz }) : plain('wa.sizeAny')));
    L.push('• ' + plain('wa.type', { t: plain(state.type === 'business' ? 'c.business' : 'c.personal') }));
    if (br) L.push('• ' + plain('wa.branch', { b: branchName(br) }));
    if (tm !== 'x') L.push('• ' + plain('wa.term', { t: plain('c.t' + tm) }));
    if (notes) L.push('• ' + plain('wa.notes', { n: notes }));
    $('#qPreview').textContent = L.join('\n'); $('#qSend').href = wa(L);
  }
  ['qName', 'qSize', 'qBranch', 'qTerm', 'qNotes'].forEach(function (id) {
    $('#' + id).addEventListener('input', function () { if (id === 'qSize') quoteTouched = true; if (id === 'qBranch') { state.branch = this.value || null; renderBranches(); renderInfo(); } renderQuote(); });
  });
  $('#qType').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-type]') : null; if (!b) return; state.type = b.getAttribute('data-type');
    $$('#qType .seg__btn').forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', on); }); renderQuote();
  });
  $('#quoteForm').addEventListener('submit', function (e) { e.preventDefault(); });
  $('#copyNum').addEventListener('click', function () {
    var done = function () { toast(plain('c.copied')); };
    try { navigator.clipboard.writeText(D.phoneDisplay).then(done, function () { selectNum(); }); } catch (e) { selectNum(); }
    function selectNum() { var n = $('#waMain .num'), r = doc.createRange(); r.selectNodeContents(n); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  });
  function staticLinks() {
    var general = wa([plain('wa.hello'), plain('wa.general')]);
    $('#heroContact').href = general; $('#waMain').href = general; $('#journeyWa').href = general;
    var photos = wa([plain('wa.hello'), plain('wa.photos')]);
    $('#helperPhotos').href = photos; $('#journeyPhotos').href = photos;
    $('#bigWa').href = wa([plain('wa.hello'), plain('wa.bigAsk')]);
  }

  /* ---------------- dock, toast, menu ---------------- */
  var dock = $('#dock'), toastEl = $('#toast'), toastT = 0;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400); }
  function updateDock() {
    var u = currentUnit(), sv = $('#dockSaved');
    if (state.touched) { $('#dockWaText').textContent = plain('d.ask', { a: u.a }); $('#dockWa').href = wa(unitLines(u)); }
    else { $('#dockWaText').textContent = plain('d.wa'); $('#dockWa').href = wa([plain('wa.hello'), plain('wa.general')]); }
    sv.hidden = state.saved == null;
    if (state.saved != null) { var sa = unitFor(state.saved).a; $('#dockSavedText').textContent = plain('d.my', { a: sa }); sv.setAttribute('aria-label', plain('d.myLabel', { a: sa })); }
  }
  $('#dockSaved').addEventListener('click', function () { if (state.saved != null) selectSize(state.saved, true); });
  var menu = $('#menu'), menuBtn = $('#menuBtn');
  function setMenu(open) { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', open); if (open) $('#menuClose').focus(); else menuBtn.focus(); }
  menuBtn.addEventListener('click', function () { setMenu(true); });
  $('#menuClose').addEventListener('click', function () { setMenu(false); });
  menu.addEventListener('click', function (e) { if (e.target === menu || (e.target.closest && e.target.closest('.menu__nav a'))) { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
  $('#langBtn').addEventListener('click', function () { state.lang = state.lang === 'ar' ? 'en' : 'ar'; store.set('rv_lang', state.lang); renderAll(); });

  /* ---------------- 3D: loading, lite mode ---------------- */
  var stage = $('#stage'), poster = $('#poster'), corridor = null, viewerVisible = false, loading3d = false, cbs = [];
  var lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  function webglOk() { try { var c = doc.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } }
  function loadScript(src, cb) { var s = doc.createElement('script'); s.src = src; s.async = true; s.onload = function () { cb(true); }; s.onerror = function () { cb(false); }; doc.head.appendChild(s); }
  function ensure3D(cb) {
    if (window.THREE && window.RV3D) return cb(true);
    cbs.push(cb); if (loading3d) return; loading3d = true;
    var done = function (ok) { loading3d = false; var q = cbs; cbs = []; q.forEach(function (f) { f(ok && !!window.THREE && !!window.RV3D); }); };
    var scene = function (ok) { if (!ok) return done(false); if (window.RV3D) return done(true); loadScript(ASSET + 'js/scene3d.js', done); };
    // a hosted copy tries its own file first, the single-file preview tries the CDN first; each falls back to the other
    var own = ASSET + 'vendor/three.min.js', first = D.threeFirst && D.threeCdn ? D.threeCdn : own, second = first === own ? D.threeCdn : own;
    if (window.THREE) scene(true);
    else loadScript(first, function (ok) { if (ok) scene(true); else if (second) loadScript(second, scene); else scene(false); });
  }
  function setLite(on, auto) {
    state.lite = on; if (!auto) store.set('rv_lite', on ? '1' : '0');
    $('#liteToggle').checked = on;
    stage.classList.toggle('is-lite', on); if (on) stage.classList.remove('is-3d');
    $('#viewerStage').classList.toggle('is-lite3d', on || !viewer);
    if (on) { if (viewer) viewer.setActive(false); } else { startCorridor(); startViewer(); }
    renderItemsToggle(); syncViewLabel(); lastY = -1;
  }
  // without the 3D model the first tab shows a floor plan, so it is named for what it shows
  function syncViewLabel() {
    var sp = $('#viewTabs [data-view="3d"] span'); if (!sp) return;
    var k = state.lite ? 'u.viewPlan' : 'u.view3d'; sp.setAttribute('data-i18n', k); sp.innerHTML = t(k);
  }
  $('#liteToggle').addEventListener('change', function () { setLite(this.checked, false); });
  function startCorridor() {
    if (corridor || state.lite) { if (corridor && !state.lite) stage.classList.add('is-3d'); return; }
    ensure3D(function (ok) {
      if (!ok) return setLite(true, true);
      if (corridor || state.lite) return;
      var go = function () {
        if (corridor || state.lite) return;
        try { corridor = window.RV3D.createCorridor($('#corridor'), { low: !!lowEnd, logo: imgUrl('logo-white', 'png'), doors: 1 }); }
        catch (e) { corridor = null; return setLite(true, true); }
        $('#corridor').addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); setLite(true, true); });
        measure(); cam.z = camT.z = 2.4; intro0 = 0;
        requestAnimationFrame(function () { requestAnimationFrame(function () { stage.classList.add('is-3d'); }); });
      };
      if (doc.fonts && doc.fonts.load) { var tm = setTimeout(go, 1500); doc.fonts.load('800 40px "RV Mont"').then(function () { clearTimeout(tm); go(); }, function () { clearTimeout(tm); go(); }); } else go();
    });
  }
  function startViewer() {
    if (viewer || state.lite) { if (viewer) { $('#viewerStage').classList.remove('is-lite3d'); viewer.setActive(state.view === '3d' && viewerVisible); } return; }
    ensure3D(function (ok) {
      if (!ok || viewer || state.lite) return;
      try {
        viewer = window.RV3D.createUnitViewer($('#unitCanvas'), $('#unitLabels'), {
          still: reduced, dark: true,
          onUser: function () { $('#unitHint').classList.add('is-off'); },
          onTap: function () { doorIntro = true; setDoor(!doorOpen); }
        });
      }
      catch (e) { viewer = null; return; }
      $('#viewerStage').classList.remove('is-lite3d'); viewer.resize(); updateViewer(true); viewer.setLid(doorOpen, true);
      viewer.setActive(state.view === '3d' && viewerVisible); if (viewerSeen) doorFirstView();
    });
  }
  var viewerSeen = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !state.lite) startViewer(); }); }, { rootMargin: '900px 0px' }).observe($('#units'));
    new IntersectionObserver(function (es) { es.forEach(function (e) { viewerVisible = e.isIntersecting; if (viewer) viewer.setActive(viewerVisible && state.view === '3d' && !state.lite); }); }, { threshold: .05 }).observe($('#viewerStage'));
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) { viewerSeen = true; if (viewer) doorFirstView(); } }, { threshold: .6 }).observe($('#viewerStage'));
  } else { viewerVisible = true; viewerSeen = true; }

  /* ---------------- the opening walk: scrolling the first section takes the camera to a door and through it ---------------- */
  var heroEl = $('#top'), heroTop = $('#heroTop'), heroPanel = $('#heroPanel'), whiteEl = $('#stageWhite');
  var vh = window.innerHeight, docH = 1, heroLen = 0, contactTop = 1e9, narrow = true;
  var cam = { z: 2.4, yaw: 0, x: 0, shift: .14 }, camT = { z: 0, yaw: 0, x: 0, shift: .14 }, doorK = 0, intro0 = -1, lastT = 0, lastY = -1, lastP = -1, fps = { n: 0, sum: 0, stage: 0 };
  // while the visitor rests on the first screen the walk continues slowly by itself, up to CREEP_MAX metres
  var creep = 0, CREEP_MAX = 2.6;
  // dragging sideways on the corridor turns the head a little; it eases back when released
  var look = 0, lookT = 0, lookFrom = null;
  function measure() {
    vh = window.innerHeight; narrow = window.innerWidth < 860;
    var sy = window.pageYOffset || rootEl.scrollTop || 0;
    heroLen = Math.max(0, heroEl.offsetHeight - vh);
    docH = Math.max(1, rootEl.scrollHeight - vh);
    contactTop = $('#contact').getBoundingClientRect().top + sy;
    if (corridor) corridor.resize(); if (viewer) viewer.resize();
    lastY = -1; lastP = -1;
  }
  var rmT = 0; function remeasureSoon() { clearTimeout(rmT); rmT = setTimeout(measure, 120); }
  function easeIn(x) { return x * x; }
  // p runs 0..1 over the opening section: walk to the door, turn to it as it opens, step through into the light
  function poseAt(p) {
    var s = corridor.stops[0];
    return {
      z: lerp(-creep, s.z, ease(seg(p, 0, .6))),
      yaw: -s.side * (Math.PI / 2) * ease(seg(p, .36, .72)) + look * (1 - seg(p, .25, .45)),
      x: s.side * 2.5 * easeIn(seg(p, .7, .97)),
      open: easeOut(seg(p, .28, .62))
    };
  }
  stage.addEventListener('pointerdown', function (e) { lookFrom = { x: e.clientX, mouse: e.pointerType === 'mouse' }; });
  stage.addEventListener('pointermove', function (e) {
    if (lookFrom) lookT = clamp((e.clientX - lookFrom.x) * 0.0022, -.34, .34);
    else if (e.pointerType === 'mouse') lookT = clamp((.5 - e.clientX / Math.max(1, window.innerWidth)) * .14, -.07, .07);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { stage.addEventListener(n, function () { lookFrom = null; lookT = 0; }); });
  function tick(now) {
    requestAnimationFrame(tick);
    var y = window.pageYOffset || rootEl.scrollTop || 0, dt = Math.min(80, now - (lastT || now)); lastT = now;
    var p = heroLen > 4 ? clamp(y / heroLen, 0, 1) : 0;
    if (y !== lastY) {
      lastY = y;
      $('#progressBar').style.transform = 'scaleX(' + clamp(y / docH, 0, 1).toFixed(4) + ')';
      $('#topbar').classList.toggle('is-solid', y > heroLen + vh * .4);
      dock.classList.toggle('is-on', y > heroLen + vh * .5 && y < contactTop - vh * .45);
    }
    if (!reduced && y < 12 && creep < CREEP_MAX && !doc.hidden && (state.lite || intro0 > 0)) { creep = Math.min(CREEP_MAX, creep + dt * 0.00017); lastP = -1; }
    if (p !== lastP) {
      lastP = p;
      // the headline panel and the logo lift away as the walk begins; the last stretch fades to white
      var hp = seg(p, 0, .2);
      heroPanel.style.transform = hp ? 'translate3d(0,' + (-80 * hp).toFixed(1) + 'px,0)' : '';
      heroPanel.style.opacity = hp ? (1 - hp).toFixed(3) : ''; heroPanel.style.pointerEvents = hp > .5 ? 'none' : '';
      heroTop.style.transform = hp ? 'translate3d(0,' + (-46 * hp).toFixed(1) + 'px,0)' : '';
      heroTop.style.opacity = hp ? (1 - hp).toFixed(3) : '';
      whiteEl.style.opacity = seg(p, .84, .98).toFixed(3);
      if (state.lite && !reduced) poster.style.transform = 'scale(' + (1 + creep / CREEP_MAX * .14 + ease(p) * 1.25).toFixed(4) + ')';
    }
    // the corridor is drawn only while the opening scene is on screen
    if (state.lite || !corridor || doc.hidden || y > heroLen + vh) return;
    var q = poseAt(p), f = 1 - Math.exp(-dt / 120);
    if (intro0 === 0) intro0 = now;
    var intro = reduced ? 0 : 2.4 * (1 - easeOut(seg(now - intro0, 0, 3200)));
    look += (lookT - look) * Math.min(1, dt / 170);
    camT.z = q.z + intro; camT.yaw = q.yaw; camT.x = q.x; camT.shift = narrow ? lerp(.14, 0, seg(p, 0, .3)) : .03 * (1 - seg(p, .3, .6));
    cam.z += (camT.z - cam.z) * f; cam.yaw += (camT.yaw - cam.yaw) * f; cam.x += (camT.x - cam.x) * f; cam.shift += (camT.shift - cam.shift) * f;
    doorK += (q.open - doorK) * f; corridor.setDoor(0, Math.round(doorK * 500) / 500);
    corridor.setPose(cam, reduced ? 0 : now); corridor.render();
    // watchdog: if the device cannot keep up, lower the resolution, then fall back to lite mode
    if (params.perf !== 'off' && now - intro0 > 1500) {
      fps.sum += dt; fps.n++;
      if (fps.n === 50) {
        var avg = fps.sum / fps.n; fps.n = 0; fps.sum = 0;
        if (avg > 55 && fps.stage === 0) { fps.stage = 1; corridor.setPixelRatio(1); }
        else if (avg > 70 && fps.stage === 1) { fps.stage = 2; setLite(true, true); }
        else if (avg < 40) fps.stage = Math.max(fps.stage, 3);
      }
    }
  }

  /* ---------------- the unit's door: closed it is a locked box, open you see inside ---------------- */
  var doorOpen = !!reduced, doorIntro = false;
  function renderDoor() {
    var u = currentUnit();
    $('#doorBtn').hidden = !!u.open; $('#doorBtn').setAttribute('aria-pressed', doorOpen);
    $('#doorBtnText').textContent = plain(doorOpen ? 'u.doorClose' : 'u.doorOpen');
  }
  function setDoor(open, instant) { doorOpen = open; if (viewer) viewer.setLid(open, instant); renderDoor(); }
  $('#doorBtn').addEventListener('click', function () { doorIntro = true; setDoor(!doorOpen); $('#unitHint').classList.add('is-off'); });
  // the first time the model comes on screen it opens by itself, to show what a tap does
  function doorFirstView() { if (doorIntro) return; doorIntro = true; setTimeout(function () { if (!doorOpen) setDoor(true); }, 650); }

  /* ---------------- boot ---------------- */
  function renderAll() {
    applyLang(); syncViewLabel(); renderSizes(); renderItemsToggle(); renderPrices(); renderBranches(); buildQuoteForm(); renderQuote(); staticLinks();
    renderUnit(true); renderHelper(); updateDock(); remeasureSoon();
    if (window.RVFX) window.RVFX.refresh();
  }
  // the scroll-driven opening needs room to scroll; without motion the first section is one screen tall
  rootEl.classList.toggle('walk3d', !reduced);
  var storedLite = store.get('rv_lite');
  var wantLite = params.lite === '1' || (params.lite !== '0' && (storedLite === '1' || (storedLite !== '0' && (reduced || !webglOk() || (navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory <= 2)))));
  state.lite = wantLite; $('#liteToggle').checked = wantLite; stage.classList.toggle('is-lite', wantLite); $('#viewerStage').classList.add('is-lite3d');
  renderAll(); setView('3d'); measure();
  window.addEventListener('resize', remeasureSoon); window.addEventListener('orientationchange', remeasureSoon); window.addEventListener('load', measure);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(remeasureSoon);
  if ('ResizeObserver' in window) new ResizeObserver(remeasureSoon).observe($('#main'));
  requestAnimationFrame(tick);
  if (!wantLite) { if (doc.readyState === 'complete') startCorridor(); else { var kick = setTimeout(startCorridor, 900); window.addEventListener('load', function () { clearTimeout(kick); startCorridor(); }); } }
  window.RV = { layout: buildLayout, unitFor: unitFor, state: state, measure: measure, setLite: setLite, selectSize: selectSize };
})();
