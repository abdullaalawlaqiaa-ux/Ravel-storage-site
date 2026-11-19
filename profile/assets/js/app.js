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
    lite: false, touched: false, who: null
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
  // What a unit of each size would hold, stored the way movers store it: the bed taken apart with its mattress beside it,
  // wardrobes wrapped and strapped, carpets rolled, boxes taped and tagged. Sizes are footprints in metres;
  // "wall" marks the tall pieces, which stand against a wall and never in the middle of the room.
  var CAT = {
    box: { w: .5, d: .45, h: .42, c: '#C69D70' }, suit: { w: .5, d: .3, h: .72, c: '#4A5A73' },
    bed: { w: 1.85, d: .62, h: 2.0, c: '#DCE6F2', wall: 1 }, bedS: { w: 1.22, d: .6, h: 2.0, c: '#DCE6F2', wall: 1 },
    wardrobe: { w: 1.2, d: .6, h: 2.0, c: '#7A5236', wall: 1 }, wardrobe3: { w: 1.8, d: .6, h: 2.1, c: '#6A4630', wall: 1 },
    wardrobeS: { w: 1.0, d: .58, h: 1.95, c: '#7A5236', wall: 1 },
    fridge: { w: .7, d: .7, h: 1.8, c: '#DDE3EA', wall: 1 }, shelf: { w: .9, d: .4, h: 1.8, c: '#B8C3D1', wall: 1 },
    carpet: { w: .56, d: .5, h: 2.3, c: '#8E2F3A', wall: 1 },
    dresser: { w: .9, d: .45, h: .8, c: '#7A5236' }, nights: { w: .5, d: .42, h: 1.0, c: '#6A4630' },
    sofa: { w: 2.0, d: .9, h: .85, c: '#22346E' }, sofa2: { w: 1.5, d: .88, h: .85, c: '#22346E' }, armchair: { w: .9, d: .85, h: .85, c: '#5B6B86' },
    table: { w: 1.4, d: .86, h: .75, c: '#6A4630' }, majlis: { w: 1.9, d: .7, h: .8, c: '#8E2F3A' },
    washer: { w: .6, d: .6, h: .85, c: '#E4E9EF' }, tv: { w: 1.25, d: .2, h: .78, c: '#C69D70' },
    pallet: { w: 1.2, d: 1.0, h: 1.5, c: '#C69D70' }, rack: { w: 2.0, d: .6, h: 2.3, c: '#8FA0B8' }
  };
  function times(kind, n) { var a = []; while (n-- > 0) a.push(kind); return a; }
  // From 4 m2 up a unit holds furniture, not only boxes, and the bigger it is the more rooms it holds: a studio (r2),
  // a one-bedroom flat (r2p), a little more (r3), two bedrooms (r4), three or a small villa (r5). The keys are the
  // "fits" values of the sizes in data.json, which also name the description shown beside each size.
  var SEQ = {
    r1: ['box', 'box', 'suit', 'box', 'suit', 'box', 'box', 'box'],
    r2: ['bed', 'wardrobeS', 'carpet', 'dresser', 'box', 'box', 'nights', 'suit', 'tv'].concat(times('box', 4)),
    r2p: ['bed', 'wardrobe', 'fridge', 'carpet', 'sofa2', 'dresser', 'box', 'box', 'washer', 'nights', 'tv', 'suit'].concat(times('box', 5)),
    r3: ['bed', 'wardrobeS', 'wardrobe', 'fridge', 'carpet', 'shelf', 'sofa2', 'table', 'dresser', 'box', 'box', 'box', 'washer', 'nights', 'armchair', 'tv', 'dresser', 'suit', 'suit']
      .concat(times('box', 10)),
    r4: ['bed', 'wardrobe3', 'bedS', 'wardrobe', 'fridge', 'carpet', 'shelf', 'sofa', 'table', 'dresser', 'box', 'box', 'box', 'majlis', 'washer', 'nights', 'armchair', 'dresser', 'tv', 'suit', 'suit']
      .concat(times('box', 6), ['sofa2', 'armchair', 'nights'], times('box', 8)),
    r5: ['bed', 'wardrobe3', 'fridge', 'bed', 'wardrobe', 'bedS', 'wardrobe', 'carpet', 'bedS', 'wardrobeS', 'shelf', 'carpet', 'fridge', 'shelf',
      'sofa', 'sofa', 'table', 'majlis', 'dresser', 'box', 'box', 'box', 'box', 'washer', 'dresser', 'washer', 'nights', 'nights', 'armchair', 'armchair', 'tv', 'tv', 'table', 'majlis', 'suit', 'suit', 'suit']
      .concat(times('box', 16))
  };
  var layoutCache = {};
  function buildLayout(u) {
    var key = u.a + ':' + u.w + ':' + u.d; if (layoutCache[key]) return layoutCache[key];
    var out = [], w = u.w, d = u.d;
    if (u.fits === 'r6' || u.fits === 'r7' || u.open) {
      // goods on pallets in double rows, racks along the back wall of a unit
      var z = -d / 2 + .25, row = 0, x;
      if (!u.open) { for (x = -w / 2 + .2; x + 2 <= w / 2 - .2; x += 2.15) out.push(item('rack', x + 1, z + .3, 0, row++)); z += 2.4; }
      var aisle = w >= 8 ? 1.1 : 0.6;
      while (z + 1 <= d / 2 - 1.3 && out.length < 150) {
        for (x = -w / 2 + .3; x + 1.2 <= w / 2 - .3; x += 1.35) { if (Math.abs(x + .6) < aisle) continue; out.push(item('pallet', x + .6, z + .5, 0, out.length)); }
        row++; z += 1 + (row % 2 === 0 ? 2.1 : .15);
      }
    } else {
      out = pack(w, d, SEQ[u.fits] || SEQ.r2);
    }
    layoutCache[key] = out; return out;
  }
  function item(kind, x, z, yaw, i) {
    var c = CAT[kind], it = { kind: kind, x: x, z: z, w: c.w, d: c.d, h: c.h, c: c.c, yaw: yaw || 0, v: i };
    if (kind === 'box') { it.n = 3; it.small = i % 3 === 0; }
    if (kind === 'dresser' || kind === 'washer') it.top = i % 2 === 0;
    return it;
  }
  // Fill on a 10 cm grid. Tall pieces stand against the back wall, facing the door, then the left wall, then the back half
  // of the right wall. The unit is first seen from the front right, so those all show their faces and nothing tall stands
  // in the way. The rest fills the floor in rows from the back, facing the door; a wide unit keeps a walkway from the door.
  function pack(w, d, seq) {
    var R = .1, nx = Math.round(w / R), nz = Math.round(d / R), occ = new Uint8Array(nx * nz), out = [];
    var aisle = w >= 3.9, half = aisle ? 4.5 : 0, backRows = Math.round(1.0 / R), door = Math.round((d <= 2.5 ? .35 : .55) / R);
    function cells(m) { return Math.ceil(m / R - 1e-6); }
    function blocked(ix, iz) { return iz >= nz - door || (aisle && iz >= backRows && Math.abs(ix + .5 - nx / 2) < half); }
    function free(ix, iz, cw, cd) {
      if (ix < 0 || iz < 0 || ix + cw > nx || iz + cd > nz) return false;
      for (var z = iz; z < iz + cd; z++) for (var x = ix; x < ix + cw; x++) if (occ[z * nx + x] || blocked(x, z)) return false;
      return true;
    }
    function put(kind, si, ix, iz, cw, cd, yaw) {
      for (var z = iz; z < iz + cd; z++) for (var x = ix; x < ix + cw; x++) occ[z * nx + x] = 1;
      out.push(item(kind, (ix + cw / 2) * R - w / 2, (iz + cd / 2) * R - d / 2, yaw, si));
      return true;
    }
    seq.forEach(function (kind, si) {
      var c = CAT[kind], cw = cells(c.w), cd = cells(c.d), iz, ix, o;
      if (c.wall) {
        for (ix = 0; ix + cw <= nx; ix++) if (free(ix, 0, cw, cd)) return put(kind, si, ix, 0, cw, cd, 0);
        for (iz = 0; iz + cw <= nz; iz++) if (free(0, iz, cd, cw)) return put(kind, si, 0, iz, cd, cw, Math.PI / 2);
        for (iz = 0; iz + cw <= nz * .5; iz++) if (free(nx - cd, iz, cd, cw)) return put(kind, si, nx - cd, iz, cd, cw, Math.PI / 2);
        return;   // no wall left for it: it is left out rather than stood in the middle of the room
      }
      // rows from the back, each filled from the far (left) side, so the corner nearest the viewer stays low and open
      for (iz = 0; iz < nz; iz++) for (ix = 0; ix < nx; ix++) for (o = 0; o < 2; o++) {
        var aw = o ? cd : cw, ad = o ? cw : cd;
        if (free(ix, iz, aw, ad)) return put(kind, si, ix, iz, aw, ad, o ? Math.PI / 2 : 0);   // turned sideways, a piece still shows its face to the viewer
      }
    });
    // boxes are stacked lower toward the viewer's corner, so what stands behind them can be seen
    out.forEach(function (it) { if (it.kind === 'box') { var far = 1 - ((it.z + d / 2) / d * .65 + (it.x + w / 2) / w * .35); it.n = far > .62 ? 4 : far > .4 ? 3 : 2; } });
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
    var household = !u.open && u.fits !== 'r6' && u.fits !== 'r7';   // the note is about furniture, so it stays off the sizes for business stock
    h += '<div class="fitsline">' + icon('i-box') + '<div><span class="tiny">' + t('u.fits') + '</span><b>' + t(fitsKey(u)) + '</b>' +
      (household ? '<span class="tiny fitsline__n">' + t('fits.note') + '</span>' : '') + '</div></div>';
    // sizes without a listed monthly rent are priced on request, by phone or WhatsApp
    h += '<div class="pricebox"><span class="pricebox__l">' + t(u.price ? 'u.price' : 'u.priceAsk') + '</span>';
    if (u.price) h += '<span class="pricebox__v">' + fmt(u.price) + ' <small>' + t('cur') + ' / ' + t('perMonth') + '</small></span><span class="pricebox__d">' + t('u.otherTerms') + '</span>';
    else h += '<span class="pricebox__q">' + t('u.quote') + '</span><span class="pricebox__d">' + t('u.quoteNote') + '</span>';
    h += '</div>';
    if (u.price) h += '<p class="tiny">' + t('u.priceNote') + '</p>';
    h += '<div class="unitinfo__actions"><a class="btn btn--wa" id="unitWa" target="_blank" rel="noopener" href="' + wa(unitLines(u)) + '">' + icon('i-chat') + '<span>' + t('u.cta') + '</span></a>';
    h += '<button class="btn btn--ghost btn--save" id="saveBtn" type="button" aria-pressed="' + saved + '">' + icon('i-save') + '<span>' + t(saved ? 'u.saved' : 'u.save') + '</span></button>';
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
  // Two example customers stand in front of the unit: Rashid in a kandura (the Arabic page's default) and James in a
  // suit (the English page's). The visitor can switch; his card floats above him in the 3D view.
  function who() { return state.who || (state.lang === 'ar' ? 'rashid' : 'james'); }
  function personKind() { return who() === 'rashid' ? 'kandura' : 'suit'; }
  function renderWho() {
    var w = who(), card = $('#whoCard'), desc = $('#whoDesc');
    $$('#whoSel .pick__btn').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-who') === w); });
    $('#whoName').textContent = plain(w === 'rashid' ? 'who.rashid' : 'who.james');
    desc.innerHTML = t(w === 'rashid' ? 'who.rashidD' : 'who.jamesD');
    $('#whoPlayText').textContent = plain(w === 'rashid' ? 'who.playR' : 'who.play');   // each has his own story
    openCard();
  }
  // On a phone the card would hide part of the unit, so it opens for a few seconds and then folds to his name;
  // a tap on it opens it again. Turning the model folds it at once.
  var cardT = 0;
  function openCard() {
    var card = $('#whoCard'); clearTimeout(cardT);
    card.classList.toggle('is-min', false);
    card.classList.toggle('is-in', false); card.getBoundingClientRect(); card.classList.toggle('is-in', true);   // the soft entrance, again
    cardT = setTimeout(foldCard, 6500);
  }
  function foldCard() { clearTimeout(cardT); $('#whoCard').classList.toggle('is-min', true); }
  $('#whoCard').addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#whoPlay')) return; if (this.classList.contains('is-min')) openCard(); else foldCard(); });
  function selectWho(w, user) {
    // choosing a person only switches the figure and opens their card; the story plays from the card's button
    if (w === who() && state.who) return;
    state.who = w; renderWho(); updateViewer(true);
  }
  function updateViewer(instant) {
    var u = currentUnit(), layout = state.items ? buildLayout(u) : [];
    if (viewer) { viewer.setPerson(personKind()); if (viewer.setPhoto) viewer.setPhoto(who() === 'rashid' ? { src: imgUrl('char-rashid'), h: 2.2 } : { src: imgUrl('char-james'), h: 2.2 }); viewer.setUnit(u, layout, unitTexts(u), instant); }
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
      var pr = Math.min(Math.max(3.5, .22 * k), 15);   // the person's dot, kept inside the drawing on the smallest units
      p.push('<circle cx="' + (P / 2 + Math.min(dw / 2, .5 * k)) + '" cy="' + (y0 + H + pr + 6).toFixed(1) + '" r="' + pr.toFixed(1) + '" fill="#152249"/>');
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

  /* ---------------- size guide: a row shows that size in the explorer ---------------- */
  $('#guide').addEventListener('click', function (e) {
    var row = e.target.closest ? e.target.closest('[data-a]') : null; if (!row) return;
    var a = row.getAttribute('data-a'); selectSize(a === 'big' ? 'big' : +a, true);
  });

  /* ---------------- prices: the full list opens under the explorer ---------------- */
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
  // a closed list has no height: the page length and the row highlight are worked out again when it opens
  $('#prices').addEventListener('toggle', function () { remeasureSoon(); if (window.RVFX) window.RVFX.sizeChanged(); });

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
  /* ---------------- contact + quote ---------------- */
  function fillSelect(el, opts, val) { el.innerHTML = opts.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join(''); el.value = val; }
  function buildQuoteForm() {
    var sz = $('#qSize'), keep = sz.value, br = $('#qBranch'), kb = br.value || state.branch || '';
    fillSelect(sz, [['', plain('c.sizeAny')]].concat(D.sizes.map(function (s) { return [String(s.a), s.a + ' ' + plain('m2')]; })).concat([['big', plain('c.sizeBig')]]), keep);
    fillSelect(br, [['', plain('c.branchAny')]].concat(D.branches.map(function (b) { return [b.id, plain(b.name)]; })), kb);
  }
  var quoteTouched = false;
  function syncQuoteSize() { if (!quoteTouched && state.touched) { $('#qSize').value = String(state.size); renderQuote(); } }
  function renderQuote() {
    var sz = $('#qSize').value, br = $('#qBranch').value;
    var L = [plain('wa.hello'), plain('wa.quote')];
    L.push('• ' + (sz === 'big' ? plain('wa.size', { a: '100+' }) : sz ? plain('wa.size', { a: sz }) : plain('wa.sizeAny')));
    if (br) L.push('• ' + plain('wa.branch', { b: branchName(br) }));
    $('#qPreview').textContent = L.join('\n'); $('#qSend').href = wa(L);
  }
  ['qSize', 'qBranch'].forEach(function (id) {
    // the chosen area also goes into the unit's own WhatsApp message and the bottom bar
    $('#' + id).addEventListener('input', function () { if (id === 'qSize') quoteTouched = true; else { state.branch = this.value || null; renderInfo(); updateDock(); } renderQuote(); });
  });
  $('#quoteForm').addEventListener('submit', function (e) { e.preventDefault(); });
  // copies what the node shows; without clipboard access the text is selected instead, so the system's own Copy is one tap away
  function copyText(node, msg) {
    function pick() {
      var r = doc.createRange(), s = window.getSelection(); r.selectNodeContents(node); s.removeAllRanges(); s.addRange(r);
      try { if (doc.execCommand('copy')) toast(msg); } catch (e) {}
    }
    try { navigator.clipboard.writeText(node.textContent).then(function () { toast(msg); }, pick); } catch (e) { pick(); }
  }
  $('#copyNum').addEventListener('click', function () { copyText($('#waMain .num'), plain('c.copied')); });
  function staticLinks() {
    var general = wa([plain('wa.hello'), plain('wa.general')]);
    $('#heroContact').href = general; $('#waMain').href = general; $('#journeyWa').href = general; $('#callSheetWa').href = general;
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
  doc.addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; if (!sheet.hidden) closeSheet(); else if (!menu.hidden) setMenu(false); });
  $('#langBtn').addEventListener('click', function () { state.lang = state.lang === 'ar' ? 'en' : 'ar'; store.set('rv_lang', state.lang); renderAll(); });

  /* ---------------- phone and mail links ---------------- */
  // Each one stays a plain tel: or mailto: link: that is what Safari, Chrome and in-app browsers act on, and nothing
  // here stops or replaces it. But some places cannot follow such a link (a page shown inside another app's viewer,
  // a computer with no calling app) and the page is never told. So after a tap the page watches for a moment: a call
  // or mail app covers the page or takes its place. If neither happened, the number itself is shown, large, with a
  // copy button. Inside a frame the link usually does nothing, so there the sheet comes at once.
  var sheet = $('#callSheet'), sheetT = 0, sheetFrom = null, awayAt = 0, hidAt = 0, framed = true;
  try { framed = window.self !== window.top; } catch (e) {}
  if (framed) $('#callSheetNum').setAttribute('target', '_blank');
  function openSheet(kind, from) {
    var mail = kind === 'mail', n = $('#callSheetNum');
    sheetFrom = from || null; sheet.setAttribute('data-kind', kind);
    $('#callSheetH').textContent = plain(mail ? 'cs.mailH' : 'cs.telH'); $('#callSheetP').textContent = plain(mail ? 'cs.mailP' : 'cs.telP');
    n.textContent = mail ? D.email : D.phoneDisplay; n.href = mail ? 'mailto:' + D.email : 'tel:' + D.phone;
    $('#callSheetCopyText').textContent = plain(mail ? 'cs.copyMail' : 'c.copy');
    sheet.hidden = false; $('#callSheetCopy').focus();
  }
  function closeSheet(quiet) { if (sheet.hidden) return; sheet.hidden = true; if (!quiet && sheetFrom) sheetFrom.focus(); sheetFrom = null; }
  window.addEventListener('blur', function () { awayAt = Date.now(); });
  window.addEventListener('pagehide', function () { hidAt = Date.now(); });
  doc.addEventListener('visibilitychange', function () { if (doc.hidden) { hidAt = Date.now(); closeSheet(true); } });   // the call began: nothing left to offer
  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="tel:"],a[href^="mailto:"]') : null;
    if (!a || e.defaultPrevented || !sheet.hidden) return;
    var kind = a.getAttribute('href').indexOf('tel:') === 0 ? 'tel' : 'mail', t0 = Date.now();
    clearTimeout(sheetT);
    // inside another app's viewer the page itself may not leave for a call: the link is handed out as a new window,
    // which the app passes to the phone, and the number is offered at once in case it does not
    if (framed) { if (!a.getAttribute('target')) a.setAttribute('target', '_blank'); openSheet(kind, a); return; }
    sheetT = setTimeout(function () {
      // hidden since the tap: the phone or mail app took over. Lost focus: a system prompt is asking (not trusted inside a frame)
      if (doc.hidden || hidAt >= t0 || (!framed && awayAt >= t0)) return;
      openSheet(kind, a);
    }, framed ? 350 : 1500);
  });
  sheet.addEventListener('click', function (e) { if (e.target === sheet || (e.target.closest && e.target.closest('#callSheetClose'))) closeSheet(); });
  sheet.addEventListener('keydown', function (e) {      // Tab stays inside the sheet while it is open
    if (e.key !== 'Tab') return;
    var f = $$('a[href],button', sheet), i = f.indexOf(doc.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });
  $('#callSheetCopy').addEventListener('click', function () { copyText($('#callSheetNum'), plain(sheet.getAttribute('data-kind') === 'mail' ? 'cs.copiedMail' : 'c.copied')); });

  /* ---------------- James's story: the TRAVEL -> RAVEL film (motion.js) ---------------- */
  // Loaded only when asked for. It plays over the page in its own layer; the page's viewer and opening walk rest meanwhile.
  var filmOpen = false, filmLoading = false;
  function ensureFilm(cb) {
    if (window.RVMotion) return cb(true);
    if (filmLoading) return; filmLoading = true;
    loadScript(ASSET + 'js/motion.js', function (ok) { filmLoading = false; cb(ok && !!window.RVMotion); });
  }
  function openFilm(opener, story) {
    story = story === 'rashid' ? 'rashid' : 'james';
    if (filmOpen) return;
    stopAutoWalk(); if (!menu.hidden) setMenu(false);
    var still = reduced || state.lite || !webglOk();
    var go = function () {
      ensureFilm(function (ok) {
        if (!ok) return;
        filmOpen = true; if (viewer) viewer.setActive(false);
        window.RVMotion.open({
          lang: state.lang, opener: opener || null, story: story, rashidImg: imgUrl('char-rashid'), rashidStandImg: imgUrl('char-rashid-stand'),
          roomImgs: { fullP: imgUrl('room-full-p'), fullL: imgUrl('room-full-l'), tidyP: imgUrl('room-tidy-p'), tidyL: imgUrl('room-tidy-l') },
          items: buildLayout(unitFor(12)), unit: { w: unitFor(12).w, d: unitFor(12).d, h: D.height },
          jamesImg: imgUrl('char-james'),
          wa: wa([plain('wa.hello'), plain('wa.ask')]), tel: 'tel:' + D.phone,
          reduced: still, low: !!lowEnd,
          onExplore: function () { if (story === 'james') selectSize(12, true); setView('3d'); $('#explorer').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); },
          onClose: function () { filmOpen = false; if (state.who !== story) { state.who = story; renderWho(); updateViewer(true); } lastY = -1; if (viewer) viewer.setActive(state.view === '3d' && viewerVisible && !state.lite); }
        });
      });
    };
    if (still) go(); else ensure3D(function (ok) { if (ok) go(); else { still = true; go(); } });
  }
  $('#whoSel').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-who]') : null; if (b) selectWho(b.getAttribute('data-who'), true); });
  $('#whoPlay').addEventListener('click', function () { openFilm(this, who()); });

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
    if (on) { if (viewer) viewer.setActive(false); if (film && film.on) filmOff(); } else { if (filmFits) startFilm(); else startCorridor(); startViewer(); }
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
          still: reduced, dark: true, person: personKind(),
          onUser: function () { $('#unitHint').classList.add('is-off'); foldCard(); },
          onTap: function () { doorIntro = true; setDoor(!doorOpen); }
        });
        if (viewer.setCard) viewer.setCard($('#whoCard'));
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

  /* ---------------- the opening film: on a phone held upright, the scroll plays a filmed walk frame by frame ---------------- */
  var F = D.film, film = null, filmEl = $('#film'), realEl = $('#filmReal'), filmBar = $('#filmBar'), filmSteps = $$('#filmBar li');
  // the opening scroll: the filmed walk down the corridor (to WALK_END), the camera turns right on the spot to face the closed door
  // of the visitor's unit (to TURN_END), then a few steps up to it and the white of the next section takes over
  var WALK_END = .64, TURN_END = .8, FILM_END = TURN_END;
  var FW = F ? (F.walk || F.n) : 0, FD = F ? (F.door != null ? F.door : F.n - 1) : 0;
  var turnEl = $('#filmTurn'), turnCube = $('#turnCube'), turnFront = $('#turnFront'), turnRight = $('#turnRight'), turn = { th: -1, drawn: '' };
  var filmFits = !!(F && filmEl && filmEl.getContext && !reduced && params.film !== '0' && window.matchMedia && window.matchMedia('(max-width:600px) and (orientation:portrait)').matches);
  // the single-file preview carries the film's first picture inside the page
  if (filmFits && D.img && D.img['film-poster']) poster.src = D.img['film-poster'];
  function filmSrc(k) { return window.RV_FILM ? window.RV_FILM[k] : ASSET + 'img/film/' + ('00' + k).slice(-3) + '.webp'; }
  function filmNearest(k) {           // the closest frame that has arrived
    if (film.imgs[k]) return k;
    for (var d = 1; d < FW; d++) { if (film.imgs[k - d]) return k - d; if (k + d < FW && film.imgs[k + d]) return k + d; }
    return -1;
  }
  function drawFilm(pos) {
    var a = Math.floor(pos), fr = pos - a, A = film.imgs[a], B = film.imgs[a + 1], ctx = film.ctx, k;
    if (A && B && fr > .04 && fr < .96) {       // between two frames the next one is laid over the first, part-way
      k = a + Math.round(fr * 16) / 16; if (k === film.drawn) return;
      ctx.globalAlpha = 1; ctx.drawImage(A, 0, 0, F.w, F.h); ctx.globalAlpha = k - a; ctx.drawImage(B, 0, 0, F.w, F.h); ctx.globalAlpha = 1;
    } else {
      k = filmNearest(Math.round(pos)); if (k < 0 || k === film.drawn) return;
      ctx.drawImage(film.imgs[k], 0, 0, F.w, F.h);
    }
    film.drawn = k;
  }
  // The turn: the last frame of the walk and the picture of the door are two faces of a box around the camera, the walk
  // ahead and the door on the right; turning the box on the spot is the camera turning its head. Scaling by sin+cos keeps the
  // far corner filling the screen, and a little blur while it turns fastest reads as a quick head turn.
  function turnAt(k, push) {
    var th = ease(k) * Math.PI / 2, on = k > 0;
    turnEl.style.visibility = on ? 'visible' : 'hidden';
    if (!on) { turn.th = -1; return; }
    var a = filmNearest(FW - 1), key = a + ':' + !!film.imgs[FD];
    if (key !== turn.drawn && a >= 0) { turn.drawn = key; turnFront.getContext('2d').drawImage(film.imgs[a], 0, 0, F.w, F.h); if (film.imgs[FD]) turnRight.getContext('2d').drawImage(film.imgs[FD], 0, 0, F.w, F.h); }
    var W = stage.clientWidth, H = stage.clientHeight, sc = Math.max(W / F.w, H / F.h), fw = F.w * sc, fh = F.h * sc, ox = (W - fw) / 2, oy = (H - fh) * .38, f = fw / 2;
    var size = W + 'x' + H;
    if (turn.size !== size) {
      turn.size = size;
      turnEl.style.perspective = f.toFixed(1) + 'px'; turnEl.style.perspectiveOrigin = (ox + fw / 2).toFixed(1) + 'px ' + (oy + fh / 2).toFixed(1) + 'px';
      turnEl.style.transformOrigin = (ox + fw / 2).toFixed(1) + 'px ' + (oy + fh / 2).toFixed(1) + 'px';
      turnCube.style.width = turnFront.style.width = turnRight.style.width = fw.toFixed(1) + 'px';
      turnCube.style.height = turnFront.style.height = turnRight.style.height = fh.toFixed(1) + 'px';
      turnCube.style.left = ox.toFixed(1) + 'px'; turnCube.style.top = oy.toFixed(1) + 'px';
      turnFront.style.transform = 'translateZ(' + (-f).toFixed(1) + 'px)';
      turnRight.style.transform = 'rotateY(-90deg) translateZ(' + (-f).toFixed(1) + 'px)';
      turn.th = -1;
    }
    var z = (Math.sin(th) + Math.cos(th)) * (1 + .2 * ease(push)), blur = 2.4 * Math.sin(Math.PI * k) * Math.sin(Math.PI * k), sig = th.toFixed(4) + z.toFixed(4);
    if (sig === turn.th) return; turn.th = sig;
    turnCube.style.transform = 'translateZ(' + f.toFixed(1) + 'px) rotateY(' + (th * 180 / Math.PI).toFixed(3) + 'deg)';
    turnEl.style.transform = 'scale(' + z.toFixed(4) + ')';
    turnEl.style.filter = blur > .15 ? 'blur(' + blur.toFixed(2) + 'px)' : '';
  }
  function showFilm() {
    if (!film || !film.on) return;
    drawFilm(film.pos); stage.classList.add('is-film'); filmBar.hidden = false;
    if (!realEl.getAttribute('src')) realEl.src = imgUrl('film-real');
    lastP = -1;
  }
  function filmOff() {                // back to the still picture
    if (film) film.on = false;
    rootEl.classList.remove('film'); stage.classList.remove('is-film'); filmBar.hidden = true; realEl.style.opacity = 0; filmEl.style.transform = ''; turnEl.style.visibility = 'hidden';
    measure();
  }
  function startFilm() {
    if (state.lite || !filmFits) return;
    if (!rootEl.classList.contains('film')) { rootEl.classList.add('film'); measure(); }
    if (film) { film.on = true; if (film.ready) showFilm(); return; }
    film = { on: true, ready: false, imgs: [], count: 0, fails: 0, pos: 0, drawn: -1, idle: 0, ctx: filmEl.getContext('2d') };
    var n = F.n, order = [], seen = {}, next = 0, live = 0, first, i;
    function add(k) { if (k >= 0 && k < n && !seen[k]) { seen[k] = 1; order.push(k); } }
    // the opening frames first, then the whole film in passes from coarse to fine, so it can be played early
    for (i = 0; i < 12; i++) add(i);
    add(FD); add(FW - 1);
    [8, 4, 2, 1].forEach(function (st) { for (var k = 0; k < FW; k += st) add(k); });
    first = Math.min(order.length, 14 + Math.ceil(FW / 8));
    function fail() { if (!filmFits) return; filmFits = false; filmOff(); startCorridor(); }   // no film: the drawn corridor takes over
    function pump() {
      while (live < 6 && next < order.length && filmFits) (function (k) {
        var im = new Image(); live++;
        im.onload = function () { live--; film.imgs[k] = im; film.count++; film.drawn = -1; if (!film.ready && film.count >= first) { film.ready = true; showFilm(); } pump(); };
        im.onerror = function () { live--; if (++film.fails > 3 && !film.ready) fail(); else pump(); };
        im.src = filmSrc(k);
      })(order[next++]);
    }
    if (F.inline && !window.RV_FILM) window.RVfilmReady = pump; else pump();
  }

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
  // Tapping the scroll cue takes the walk for the visitor: the page scrolls through the opening section at walking pace.
  // Any touch, wheel or key hands the scroll back at once.
  var autoWalk = 0;
  function stopAutoWalk() { if (!autoWalk) return; cancelAnimationFrame(autoWalk); autoWalk = 0; rootEl.style.scrollBehavior = ''; }
  $('#heroHint').addEventListener('click', function (e) {
    if (reduced || heroLen < 40) return;   // with no walk to show, the link simply leads to the next section
    e.preventDefault(); stopAutoWalk();
    var y0 = window.pageYOffset || rootEl.scrollTop || 0, y1 = $('#service').getBoundingClientRect().top + y0, t0 = 0;
    var dur = clamp((y1 - y0) / vh * 2400, 1200, 8000);
    rootEl.style.scrollBehavior = 'auto';
    autoWalk = requestAnimationFrame(function step(now) {
      if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / dur), e2 = k < .15 ? k * k / .255 : k > .85 ? 1 - (1 - k) * (1 - k) / .255 : (k - .075) / .85;
      window.scrollTo(0, y0 + (y1 - y0) * e2);
      if (k < 1) autoWalk = requestAnimationFrame(step); else { autoWalk = 0; rootEl.style.scrollBehavior = ''; }
    });
  });
  ['touchstart', 'wheel', 'keydown', 'mousedown'].forEach(function (n) { window.addEventListener(n, stopAutoWalk, { passive: true }); });
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
    if (!reduced && y < 12 && creep < CREEP_MAX && !doc.hidden && (state.lite || intro0 > 0 || (film && film.on && film.ready))) { creep = Math.min(CREEP_MAX, creep + dt * 0.00017); lastP = -1; }
    if (p !== lastP) {
      lastP = p;
      // the headline panel and the logo lift away as the walk begins; the last stretch fades to white
      var fo = film && film.on, hp = seg(p, 0, fo ? .085 : .2);
      heroPanel.style.transform = hp ? 'translate3d(0,' + (-80 * hp).toFixed(1) + 'px,0)' : '';
      heroPanel.style.opacity = hp ? (1 - hp).toFixed(3) : ''; heroPanel.style.pointerEvents = hp > .5 ? 'none' : '';
      heroTop.style.transform = hp ? 'translate3d(0,' + (-46 * hp).toFixed(1) + 'px,0)' : '';
      heroTop.style.opacity = hp ? (1 - hp).toFixed(3) : '';
      whiteEl.style.opacity = (fo ? seg(p, .9, .99) : seg(p, .84, .98)).toFixed(3);
      if (fo) {
        // the film closes on the real photo of the unit, then the steps under it leave
        realEl.style.opacity = 0;
        var bo = seg(p, .05, .1) * (1 - seg(p, .9, .95));
        filmBar.style.opacity = bo.toFixed(3); filmBar.style.transform = 'translate3d(0,' + ((1 - bo) * 14).toFixed(1) + 'px,0)'; filmBar.style.pointerEvents = bo > .5 ? '' : 'none'; filmBar.style.visibility = bo > 0 ? '' : 'hidden';
        filmBar.classList.toggle('is-real', p > FILM_END + .03);
      }
      if (state.lite && !reduced) poster.style.transform = 'scale(' + (1 + creep / CREEP_MAX * .14 + ease(p) * 1.25).toFixed(4) + ')';
    }
    if (film && film.on) {
      if (!film.ready || doc.hidden || y > heroLen + vh) return;
      // the film follows the scroll with a little weight; at rest it settles on a whole frame
      var ft = (FW - 1) * seg(p, .075, WALK_END);
      film.idle = y === film.y ? film.idle + dt : 0; film.y = y;
      if (film.idle > 140) ft = Math.round(ft);
      film.pos += (ft - film.pos) * (1 - Math.exp(-dt / 100)); if (Math.abs(ft - film.pos) < .015) film.pos = ft;
      drawFilm(film.pos);
      // resting on the first screen, the picture drifts slowly toward the door
      var fz = 1 + .06 * (creep / CREEP_MAX) * (1 - seg(p, 0, .1));
      if (fz !== film.z) { film.z = fz; filmEl.style.transform = fz > 1.0005 ? 'scale(' + fz.toFixed(4) + ')' : ''; }
      turnAt(seg(p, WALK_END + .01, TURN_END), seg(p, TURN_END, 1));
      // the three steps under the film fill as it plays
      var fc = F.cuts, fk = [seg(film.pos, 0, fc[0]), seg(film.pos, fc[0], FW - 1), seg(p, WALK_END, TURN_END)], fn = fk[1] <= 0 ? 0 : fk[2] <= 0 ? 1 : 2, key = fn + ':' + Math.round(fk[fn] * 100);
      if (key !== film.bar) { film.bar = key; filmSteps.forEach(function (li, i) { li.style.setProperty('--k', i < fn ? 1 : i > fn ? 0 : fk[i].toFixed(3)); li.classList.toggle('is-on', i === fn); }); }
      return;
    }
    // the corridor is drawn only while the opening scene is on screen
    if (state.lite || !corridor || doc.hidden || filmOpen || y > heroLen + vh) return;
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
  /* ---------------- the first section's photo: small arrows flip through the Ravel photos (shown when there is more than one) ---------------- */
  var VP = D.vaultPhotos || [], vpI = 0;
  function showVault(i) {
    if (!VP.length) return;
    vpI = (i + VP.length) % VP.length;
    var v = VP[vpI], im = $('#vault .vault__img'), src = imgUrl(v.img, D.img && D.img[v.img] ? null : 'jpg');
    var so = $('#vault source'); if (so) so.srcset = imgUrl(v.img);
    if (im.getAttribute('src') !== src) im.src = src;
    im.alt = plain(v.cap); $('#vaultCap').textContent = plain(v.cap);
  }
  if (VP.length > 1) {
    $('#vaultPrev').hidden = $('#vaultNext').hidden = false;
    $('#vaultPrev').addEventListener('click', function () { showVault(vpI - 1); });
    $('#vaultNext').addEventListener('click', function () { showVault(vpI + 1); });
  }
  function renderAll() {
    applyLang(); syncViewLabel(); renderWho(); renderSizes(); renderItemsToggle(); renderPrices(); buildQuoteForm(); renderQuote(); staticLinks();
    renderUnit(true); updateDock(); if (VP.length > 1) showVault(vpI); remeasureSoon();
    if (window.RVFX) window.RVFX.refresh();
  }
  // the scroll-driven opening needs room to scroll; without motion the first section is one screen tall
  rootEl.classList.toggle('walk3d', !reduced);
  var storedLite = store.get('rv_lite');
  var wantLite = params.lite === '1' || (params.lite !== '0' && (storedLite === '1' || (storedLite !== '0' && (reduced || !webglOk() || (navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory <= 2)))));
  state.lite = wantLite; $('#liteToggle').checked = wantLite; stage.classList.toggle('is-lite', wantLite); $('#viewerStage').classList.add('is-lite3d');
  // the film needs a longer scroll than the drawn corridor; the room is made before anything is loaded
  if (filmFits && !wantLite) rootEl.classList.add('film');
  renderAll(); setView('3d'); measure();
  window.addEventListener('resize', remeasureSoon); window.addEventListener('orientationchange', remeasureSoon); window.addEventListener('load', measure);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(remeasureSoon);
  if ('ResizeObserver' in window) new ResizeObserver(remeasureSoon).observe($('#main'));
  requestAnimationFrame(tick);
  if (!wantLite) {
    var opening = function () { if (filmFits) startFilm(); else startCorridor(); };
    if (doc.readyState === 'complete') opening(); else { var kick = setTimeout(opening, 900); window.addEventListener('load', function () { clearTimeout(kick); opening(); }); }
  }
  window.RV = { layout: buildLayout, unitFor: unitFor, state: state, measure: measure, setLite: setLite, selectSize: selectSize, openFilm: openFilm, selectWho: selectWho };
})();
