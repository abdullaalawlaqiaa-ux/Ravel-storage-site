/* Ravel Storage interactive profile: the motion layer.
   Everything here is an enhancement. With reduced motion, or if this file never runs,
   the page reads and works the same: nothing is hidden waiting for an animation. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hasIO = 'IntersectionObserver' in window;
  var FX = window.RVFX = { refresh: function () {}, sizeChanged: function () {}, fill: function () {} };
  if (!reduced) root.classList.add('fx'); else root.classList.remove('fx');

  /* ---------- the ground colour follows the section in the middle of the screen ---------- */
  var DARK = { navy: 1, night: 1 };
  function setTheme(t) {
    if (doc.body.getAttribute('data-theme') === t) return;
    doc.body.setAttribute('data-theme', t); doc.body.setAttribute('data-tone', DARK[t] ? 'dark' : 'light');
  }
  if (hasIO) {
    var themeIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) setTheme(e.target.getAttribute('data-theme')); });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    $$('[data-theme]', $('#main')).forEach(function (s) { themeIO.observe(s); });
  }

  /* ---------- headlines rise word by word; blocks fade up as they arrive ---------- */
  // A word is never split, so Arabic letters stay joined and are never stretched or skewed.
  function splitWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var o = doc.createElement('span'), inr = doc.createElement('span');
            o.className = 'kw'; inr.className = 'kw__i'; inr.style.setProperty('--i', String(i++)); inr.textContent = p;
            o.appendChild(inr); frag.appendChild(o);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('kw')) walk(n);
      });
    })(el);
  }
  var headIO = null, blockIO = null;
  if (hasIO && !reduced) {
    headIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); headIO.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .35 });
    blockIO = new IntersectionObserver(function (es) {
      var k = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; el.style.setProperty('--d', String(k++)); el.classList.add('is-in'); blockIO.unobserve(el);
        // once it has arrived the block goes back to its own styles, so its own transitions and transforms work
        setTimeout(function () { el.classList.remove('rv', 'is-in'); el.style.removeProperty('--d'); }, 1500 + k * 90);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .06 });
  }
  function kinetic() {
    $$('[data-kinetic]').forEach(function (el) {
      if (reduced) return;
      if (!$('.kw', el)) splitWords(el);          // also after a language switch, which resets the text
      if (!el.hasAttribute('data-kin')) { el.setAttribute('data-kin', '1'); if (!el.closest('.hero') && headIO) headIO.observe(el); else if (!headIO && !el.closest('.hero')) el.classList.add('is-in'); }
    });
  }
  var BLOCKS = '.sec .lead,.sec .card,.sec .steps3,.sec #whoTabs,.sec .viewer__stage,.sec .ruler,.sec .deck,.sec .story,.sec .qa,.sec .contact__cta,.sec .links,.sec .branches,.sec .option--head,.sec .wrap > .btn,.sec .vault,.sec .story__rail';
  function blocks() {
    if (!blockIO) return;
    $$(BLOCKS).forEach(function (el) {
      if (el.hasAttribute('data-rv') || el.closest('.branches .card') || el.classList.contains('extra')) return;
      el.setAttribute('data-rv', '1'); el.classList.add('rv'); blockIO.observe(el);
    });
  }
  // the opening headline starts once its font is ready, so the words do not change shape mid-rise
  function heroIn() {
    var hero = $('#top'); if (!hero || hero.classList.contains('is-in')) return;
    hero.classList.add('is-in');
    var b = $$('.chips .chip b', hero).filter(function (x) { return x.textContent === '500'; })[0];
    if (b && !reduced) { var t0 = 0; (function count(now) { if (!t0) t0 = now; var k = clamp((now - t0 - 700) / 1100, 0, 1), e = 1 - Math.pow(1 - k, 3); b.textContent = String(Math.max(1, Math.round(500 * e))); if (k < 1) requestAnimationFrame(count); })(performance.now()); }
  }

  /* ---------- about: the real photo sits behind a lock; a tap opens a round window onto it ---------- */
  var vault = $('#vault'), vaultTimer = 0;
  function setVault(open) {
    clearTimeout(vaultTimer); vault.classList.toggle('is-open', open);
    $('#vaultDoor').setAttribute('aria-expanded', String(open)); $('#vaultDoor').tabIndex = open ? -1 : 0;
  }
  if (vault && !reduced) {
    $('#vaultDoor').addEventListener('click', function () { setVault(true); });
    $('#vaultLock').addEventListener('click', function () { setVault(false); $('#vaultDoor').focus(); });
    // nobody should miss the photo: if it has been in view for a while untouched, it opens by itself
    if (hasIO) new IntersectionObserver(function (es, io) {
      if (es[0].isIntersecting) { io.disconnect(); vaultTimer = setTimeout(function () { setVault(true); }, 2800); }
    }, { threshold: .7 }).observe(vault);
  }

  /* ---------- features: a stack of cards with depth; the top one is dragged away ---------- */
  var deck = $('#deck'), cards = deck ? $$('.fcard', deck) : [], order = cards.slice(), deckOn = false, drag = null;
  function deckLayout() {
    order.forEach(function (c, o) {
      c.classList.toggle('is-top', o === 0); c.style.zIndex = String(20 - o);
      if (c._fly) return;
      var side = o % 2 ? 1 : -1;
      c.style.transform = o === 0 ? 'translate3d(0,0,0)' : 'translate3d(' + (side * o * 7) + 'px,' + (o * 15) + 'px,' + (-o * 64) + 'px) rotateZ(' + (side * o * 1.7) + 'deg)';
      c.style.opacity = o > 3 ? '0' : '1';
      c.setAttribute('aria-hidden', o === 0 ? 'false' : 'true');
    });
    var cnt = $('#deckCount'); if (cnt) cnt.innerHTML = '<i>' + (cards.indexOf(order[0]) + 1) + '</i> / ' + cards.length;
  }
  function deckNext(dir) {            // the top card leaves to one side and goes to the back of the stack
    var c = order[0]; if (!c || c._fly) return;
    c._fly = true; c.classList.remove('is-drag'); c.classList.add('is-out');
    c.style.transform = 'translate3d(' + (dir * (window.innerWidth * .7 + 260)) + 'px,50px,0) rotateZ(' + (dir * 22) + 'deg)'; c.style.opacity = '0';
    order.push(order.shift()); deckLayout();
    setTimeout(function () { c._fly = false; c.classList.remove('is-out'); deckLayout(); }, 330);
  }
  function deckPrev() {               // the last card comes back in from the side
    var c = order[order.length - 1]; if (!c || c._fly) return;
    order.unshift(order.pop());
    c.style.transition = 'none'; c.style.transform = 'translate3d(' + (-(window.innerWidth * .7 + 260)) + 'px,50px,0) rotateZ(-22deg)'; c.style.opacity = '0';
    void c.offsetWidth; c.style.transition = ''; deckLayout();
  }
  function deckEnd(cancel) {
    if (!drag) return; var g = drag; drag = null; g.c.classList.remove('is-drag');
    var v = g.dx / Math.max(1, performance.now() - g.t);
    if (!cancel && g.on && (Math.abs(g.dx) > 84 || Math.abs(v) > .55)) deckNext(g.dx > 0 ? 1 : -1);
    else deckLayout();
  }
  if (deck && cards.length && !reduced) {
    deckOn = true; root.classList.add('fxdeck'); deckLayout();
    deck.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return; var c = order[0]; if (!c || c._fly || !c.contains(e.target)) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: performance.now(), c: c, on: false };
    });
    deck.addEventListener('pointermove', function (e) {
      if (drag && e.pointerId === drag.id) {
        drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
        if (!drag.on) { if (Math.abs(drag.dx) < 7) return; drag.on = true; drag.c.classList.add('is-drag'); try { deck.setPointerCapture(e.pointerId); } catch (_) {} }
        // the tilt is what makes the card's layers slide over each other
        drag.c.style.transform = 'translate3d(' + drag.dx.toFixed(1) + 'px,' + (drag.dy * .22).toFixed(1) + 'px,0) rotateZ(' + (drag.dx * .045).toFixed(2) + 'deg) rotateY(' + clamp(drag.dx * .09, -26, 26).toFixed(2) + 'deg) rotateX(' + clamp(-drag.dy * .05, -12, 12).toFixed(2) + 'deg)';
      } else if (!drag && e.pointerType === 'mouse') {
        var c = order[0]; if (!c || c._fly) return;
        var r = c.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        if (Math.abs(nx) > .7 || Math.abs(ny) > .7) { deckLayout(); return; }
        c.style.transform = 'translate3d(0,0,0) rotateY(' + (nx * 16).toFixed(2) + 'deg) rotateX(' + (-ny * 12).toFixed(2) + 'deg)';
      }
    });
    deck.addEventListener('pointerup', function () { deckEnd(false); });
    deck.addEventListener('pointercancel', function () { deckEnd(true); });
    deck.addEventListener('pointerleave', function (e) { if (!drag && e.pointerType === 'mouse') deckLayout(); });
    $('#deckNext').addEventListener('click', function () { deckNext(root.dir === 'rtl' ? -1 : 1); });
    $('#deckPrev').addEventListener('click', deckPrev);
    // when the stack first comes on screen the top card nudges once, to show it can be moved
    if (hasIO) new IntersectionObserver(function (es, io) {
      if (!es[0].isIntersecting) return; io.disconnect();
      var c = order[0]; setTimeout(function () { if (drag || c !== order[0]) return; c.style.transform = 'translate3d(46px,0,0) rotateZ(4deg) rotateY(9deg)'; setTimeout(function () { if (!drag) deckLayout(); }, 420); }, 700);
    }, { threshold: .55 }).observe(deck);
  }

  /* ---------- booking steps: one row of panels, swiped sideways with the finger ---------- */
  var story = $('#story'), panels = story ? $$('.spanel', story) : [], storyIdx = -1, storyRaf = 0;
  function storyUpdate() {
    storyRaf = 0; if (!story) return;
    var r = story.getBoundingClientRect(), mid = r.left + r.width / 2, best = 0, bd = 1e9;
    panels.forEach(function (p, i) {
      var q = p.getBoundingClientRect(), c = q.left + q.width / 2;
      if (!reduced) p.style.setProperty('--o', ((c - mid) / Math.max(1, r.width)).toFixed(3));   // drives the depth: the numeral lags behind the panel
      if (Math.abs(c - mid) < bd) { bd = Math.abs(c - mid); best = i; }
    });
    if (best !== storyIdx) {
      storyIdx = best;
      var bar = $('#storyBar'), cnt = $('#storyCount');
      if (bar) bar.style.transform = 'scaleX(' + ((best + 1) / panels.length).toFixed(3) + ')';
      if (cnt) cnt.textContent = (best + 1) + ' / ' + panels.length;
    }
  }
  function storyGo(i) {
    i = clamp(i, 0, panels.length - 1);
    var r = story.getBoundingClientRect(), q = panels[i].getBoundingClientRect(), delta = (q.left + q.width / 2) - (r.left + r.width / 2);
    if (story.scrollBy && !reduced) story.scrollBy({ left: delta, behavior: 'smooth' }); else story.scrollLeft += delta;
  }
  if (story && panels.length) {
    story.addEventListener('scroll', function () { if (!storyRaf) storyRaf = requestAnimationFrame(storyUpdate); }, { passive: true });
    $('#storyNext').addEventListener('click', function () { storyGo(storyIdx + 1); });
    $('#storyPrev').addEventListener('click', function () { storyGo(storyIdx - 1); });
    story.addEventListener('keydown', function (e) {
      var fwd = root.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight', back = root.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd) { e.preventDefault(); storyGo(storyIdx + 1); } else if (e.key === back) { e.preventDefault(); storyGo(storyIdx - 1); }
    });
    // with a mouse the row is dragged like a strip of film; touch uses the browser's own swipe
    var grab = null;
    story.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button > 0 || (e.target.closest && e.target.closest('a,button'))) return; grab = { x: e.clientX, left: story.scrollLeft, moved: false }; });
    story.addEventListener('pointermove', function (e) {
      if (!grab) return; var dx = e.clientX - grab.x;
      if (!grab.moved) { if (Math.abs(dx) < 5) return; grab.moved = true; story.classList.add('is-grab'); try { story.setPointerCapture(e.pointerId); } catch (_) {} }
      story.scrollLeft = grab.left - dx;
    });
    ['pointerup', 'pointercancel'].forEach(function (n) { story.addEventListener(n, function () { if (!grab) return; var m = grab.moved; grab = null; story.classList.remove('is-grab'); if (m) storyGo(storyIdx); }); });
    storyUpdate();
  }

  /* ---------- prices: one highlight bar slides to the chosen row ---------- */
  function hlSync() {
    var hl = $('#ptableHl'); if (!hl) return;
    var tr = $('#ptbody tr[aria-selected="true"]');
    if (!tr || reduced) { hl.classList.remove('is-on'); return; }
    hl.style.height = tr.offsetHeight + 'px'; hl.style.transform = 'translate3d(0,' + tr.offsetTop + 'px,0)'; hl.classList.add('is-on');
  }

  /* ---------- size helper: a box that fills with small blocks; they move away from a finger ---------- */
  var fillBox = $('#fillBox'), fc = $('#fillCanvas'), fctx = fc && fc.getContext ? fc.getContext('2d') : null;
  var FILL_COLORS = { furniture: '#2EC5FF', boxes: '#C69D70', appliances: '#FFFFFF', business: '#8FA0B8', personal: '#FFC83D', office: '#C9D1DC' };
  var fl = { blocks: [], w: 0, h: 0, dpr: 1, raf: 0, cols: 0, rows: 0, s: 9, gap: 2, ox: 0, oy: 0, rtl: false, ptr: null };
  function fillResize() {
    if (!fctx) return; var w = fc.clientWidth, h = fc.clientHeight; if (!w || !h) return;
    fl.dpr = Math.min(window.devicePixelRatio || 1, 2); fc.width = Math.round(w * fl.dpr); fc.height = Math.round(h * fl.dpr);
    fl.w = w; fl.h = h; fl.rtl = root.dir === 'rtl';
    var padX = 14, top = 58, bottom = 12, cell = fl.s + fl.gap;
    fl.cols = Math.max(4, Math.floor((w - padX * 2) / cell)); fl.rows = Math.max(2, Math.floor((h - top - bottom) / cell));
    fl.ox = Math.round((w - fl.cols * cell + fl.gap) / 2); fl.oy = h - bottom - fl.rows * cell + fl.gap;
  }
  function fillSlot(i) {               // slots fill column by column from the back wall, bottom up
    var col = Math.floor(i / fl.rows), row = i % fl.rows, cell = fl.s + fl.gap;
    return { x: fl.ox + (fl.rtl ? fl.cols - 1 - col : col) * cell, y: fl.oy + (fl.rows - 1 - row) * cell };
  }
  function fillDraw() {
    fl.raf = 0; if (!fctx || !fl.w) return;
    var g = fctx, moving = false, i, b;
    g.setTransform(fl.dpr, 0, 0, fl.dpr, 0, 0); g.clearRect(0, 0, fl.w, fl.h);
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1.5; g.strokeRect(fl.ox - 5.5, fl.oy - 5.5, fl.cols * (fl.s + fl.gap) - fl.gap + 11, fl.rows * (fl.s + fl.gap) - fl.gap + 11);
    for (i = fl.blocks.length - 1; i >= 0; i--) {
      b = fl.blocks[i];
      if (b.dead) { b.vy += .7; b.y += b.vy; b.a -= .06; if (b.a <= 0 || b.y > fl.h + 20) { fl.blocks.splice(i, 1); continue; } moving = true; }
      else {
        if (fl.ptr) { var dx = b.x + fl.s / 2 - fl.ptr.x, dy = b.y + fl.s / 2 - fl.ptr.y, d2 = dx * dx + dy * dy; if (d2 < 2300) { var d = Math.sqrt(d2) || 1, f = (48 - d) / 48 * 2.6; b.vx += dx / d * f; b.vy += dy / d * f; } }
        b.vx = (b.vx + (b.tx - b.x) * .09) * .78; b.vy = (b.vy + (b.ty - b.y) * .09) * .78; b.x += b.vx; b.y += b.vy;
        if (Math.abs(b.vx) + Math.abs(b.vy) > .04 || Math.abs(b.tx - b.x) + Math.abs(b.ty - b.y) > .4) moving = true; else { b.x = b.tx; b.y = b.ty; }
      }
      g.globalAlpha = Math.max(0, b.a); g.fillStyle = b.c;
      g.fillRect(Math.round(b.x * 2) / 2, Math.round(b.y * 2) / 2, fl.s, fl.s);
    }
    g.globalAlpha = 1;
    if (moving || fl.ptr) fl.raf = requestAnimationFrame(fillDraw);
  }
  function fillKick() { if (!fl.raf) fl.raf = requestAnimationFrame(fillDraw); }
  // show: whether the box is visible; frac: how full the suggested unit is (0..1); cats: [[category, share], ...]
  FX.fill = function (show, frac, cats, sizeText, noteText) {
    if (!fillBox || !fctx) return;
    fillBox.hidden = !show; if (!show) return;
    $('#fillSize').textContent = sizeText || ''; $('#fillNote').textContent = noteText || '';
    if (!fl.w || fl.w !== fc.clientWidth) fillResize();
    var cap = fl.cols * fl.rows, n = clamp(Math.round(frac * cap), frac > 0 ? 1 : 0, cap), colors = [], total = 0, live;
    cats.forEach(function (c) { total += c[1]; });
    cats.forEach(function (c) { var k = total ? Math.round(n * c[1] / total) : 0; while (k-- > 0 && colors.length < n) colors.push(FILL_COLORS[c[0]] || '#C69D70'); });
    while (colors.length < n) colors.push(colors[colors.length - 1] || '#C69D70');
    live = fl.blocks.filter(function (b) { return !b.dead; });
    while (live.length > n) { live.pop().dead = true; }
    live.forEach(function (b, i) { var s = fillSlot(i); b.tx = s.x; b.ty = s.y; b.c = colors[i]; });
    for (var i = live.length; i < n; i++) { var s = fillSlot(i); fl.blocks.push({ x: s.x, y: reduced ? s.y : -14 - (i - live.length) * 5 - Math.random() * 20, tx: s.x, ty: s.y, vx: 0, vy: 0, a: 1, c: colors[i], dead: false }); }
    fillKick();
  };
  if (fc && fctx) {
    var fillPtr = function (e) { var r = fc.getBoundingClientRect(); fl.ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; fillKick(); };
    fc.addEventListener('pointerdown', fillPtr); fc.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || fl.ptr) fillPtr(e); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { fc.addEventListener(n, function () { fl.ptr = null; }); });
  }

  /* ---------- small answers to a touch ---------- */
  doc.addEventListener('pointerdown', function (e) {
    if (reduced || !e.target.closest) return;
    var b = e.target.closest('.btn'); if (!b) return;
    var r = b.getBoundingClientRect();
    b.style.setProperty('--px', (e.clientX - r.left).toFixed(0) + 'px'); b.style.setProperty('--py', (e.clientY - r.top).toFixed(0) + 'px');
    b.classList.remove('is-press'); void b.offsetWidth; b.classList.add('is-press');
  }, { passive: true });
  doc.addEventListener('click', function (e) {
    if (reduced || !e.target.closest) return;
    var st = e.target.closest('[data-step]'); if (!st) return;
    var out = st.parentNode.querySelector('output'); if (!out) return;
    out.classList.remove('is-bump'); void out.offsetWidth; out.classList.add('is-bump');
  });

  /* ---------- hooks for the page logic ---------- */
  FX.sizeChanged = function () { hlSync(); };
  FX.refresh = function () {
    kinetic(); blocks(); hlSync();
    if (deckOn) deckLayout();
    storyIdx = -1; if (story) storyUpdate();
    if (fl.w) { fillResize(); fl.blocks.forEach(function (b, i) { if (b.dead) return; var s = fillSlot(i); b.tx = s.x; b.ty = s.y; }); fillKick(); }
  };
  FX.refresh();
  window.addEventListener('resize', function () { hlSync(); if (story) storyUpdate(); if (fl.w) { fillResize(); FX.refresh(); } });
  if (doc.fonts && doc.fonts.ready) { var ht = setTimeout(heroIn, 900); doc.fonts.ready.then(function () { clearTimeout(ht); heroIn(); hlSync(); }, heroIn); } else setTimeout(heroIn, 300);
})();
