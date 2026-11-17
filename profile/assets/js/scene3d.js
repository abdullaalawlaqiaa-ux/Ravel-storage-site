/* Ravel Storage interactive profile: 3D scenes (corridor walk + unit viewer).
   Needs window.THREE (r149). Everything is drawn in code: no model or texture downloads. */
(function () {
  'use strict';
  var RV3D = {};
  var FOG = 0xE6E9EB;
  var NUMFONT = '"RV Mont", Montserrat, "Helvetica Neue", Arial, sans-serif';

  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function ribs(g, x, y, w, h, step, a) {
    for (var px = x + step / 2; px < x + w; px += step) {
      g.fillStyle = 'rgba(40,52,64,' + a + ')'; g.fillRect(px, y, 1.4, h);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(px + 1.4, y, 1.2, h);
    }
  }
  function steel(g, x, y, w, h, vertical) {
    var gr = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#8C9399'); gr.addColorStop(.45, '#CDD2D5'); gr.addColorStop(1, '#8F969C');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }

  /* ---- door leaf (0.88 m x 2.24 m), as seen from the corridor ---- */
  function paintLeaf(g, x, y, w, h, lockRight) {
    var mx = w / 0.88, my = h / 2.24;
    g.fillStyle = '#ECEEEE'; g.fillRect(x, y, w, h);
    ribs(g, x, y, w, h, 0.11 * mx, 0.045);
    var sh = g.createLinearGradient(0, y, 0, y + h);
    sh.addColorStop(0, 'rgba(0,0,0,.05)'); sh.addColorStop(.12, 'rgba(0,0,0,0)'); sh.addColorStop(.86, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.09)');
    g.fillStyle = sh; g.fillRect(x, y, w, h);
    // hinges on the hinge edge
    var hx = lockRight ? x : x + w - 0.03 * mx;
    g.fillStyle = '#9299A0';
    [0.3, 1.12, 1.94].forEach(function (m) { g.fillRect(hx, y + h - (m + 0.07) * my, 0.03 * mx, 0.14 * my); });
    // hasp and padlock on the lock edge
    var lx = lockRight ? x + w - 0.13 * mx : x + 0.02 * mx, ly = y + h - 1.2 * my;
    steel(g, lx, ly, 0.11 * mx, 0.055 * my, false);
    g.strokeStyle = '#A7AEB4'; g.lineWidth = Math.max(2, 0.012 * mx);
    g.beginPath(); g.arc(lx + 0.055 * mx, ly + 0.075 * my, 0.022 * mx, Math.PI, 0); g.stroke();
    var bg = g.createLinearGradient(lx, 0, lx + 0.07 * mx, 0);
    bg.addColorStop(0, '#B08A45'); bg.addColorStop(.5, '#E2BF78'); bg.addColorStop(1, '#A47E3B');
    g.fillStyle = bg; rr(g, lx + 0.022 * mx, ly + 0.07 * my, 0.066 * mx, 0.058 * my, 3); g.fill();
  }

  /* ---- one wall module (1.25 m x 3 m) with a door ---- */
  function paintModule(g, ox, oy, cw, ch, o) {
    var X = function (m) { return ox + m / 1.25 * cw; }, Y = function (m) { return oy + ch - m / 3 * ch; };
    var SX = function (m) { return m / 1.25 * cw; }, SY = function (m) { return m / 3 * ch; };
    g.fillStyle = '#E2E5E6'; g.fillRect(ox, oy, cw, ch);
    ribs(g, ox, oy, cw, ch, SX(0.104), 0.05);
    // header seam and module seam
    g.fillStyle = '#B4BABF'; g.fillRect(ox, Y(2.44), cw, Math.max(2, SY(0.018)));
    g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(ox, Y(2.44) + Math.max(2, SY(0.018)), cw, 1.5);
    g.fillStyle = 'rgba(105,114,122,.6)'; g.fillRect(ox, oy, 2, ch);
    // frame
    var x0 = 0.14, x1 = 1.11, top = 2.3, f = 0.045;
    steel(g, X(x0), Y(top), SX(f), SY(top), true);
    steel(g, X(x1 - f), Y(top), SX(f), SY(top), true);
    steel(g, X(x0), Y(top), SX(x1 - x0), SY(f), false);
    // leaf, or a hole for the animated chapter doors
    var lx = X(x0 + f), ly = Y(top - f), lw = SX(x1 - x0 - 2 * f), lh = SY(top - f - 0.015);
    if (o.hole) g.clearRect(lx, ly, lw, lh + SY(0.015) + 2);
    else paintLeaf(g, lx, ly, lw, lh, o.lockRight);
    // unit number plate above the door
    if (o.code) {
      var pw = SX(0.36), ph = SY(0.15), px = X((x0 + x1) / 2) - pw / 2, py = Y(2.69);
      g.fillStyle = '#152249'; rr(g, px, py, pw, ph, ph * 0.18); g.fill();
      g.fillStyle = '#fff'; g.font = '800 ' + Math.round(ph * 0.62) + 'px ' + NUMFONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(o.code, px + pw / 2, py + ph / 2 + ph * 0.04);
    }
    // skirting channel + soft shading top and bottom
    if (!o.hole) { g.fillStyle = '#9AA1A6'; g.fillRect(ox, Y(0.03), cw, SY(0.03)); }
    else { g.fillStyle = '#9AA1A6'; g.fillRect(ox, Y(0.03), SX(x0), SY(0.03)); g.fillRect(X(x1), Y(0.03), SX(1.25 - x1), SY(0.03)); }
    var ao = g.createLinearGradient(0, oy, 0, oy + ch);
    ao.addColorStop(0, 'rgba(30,40,52,.10)'); ao.addColorStop(.1, 'rgba(30,40,52,0)'); ao.addColorStop(.9, 'rgba(30,40,52,0)'); ao.addColorStop(1, 'rgba(30,40,52,.12)');
    g.fillStyle = ao;
    if (!o.hole) g.fillRect(ox, oy, cw, ch);
    else { g.fillRect(ox, oy, cw, Y(top) - oy); g.fillRect(ox, Y(top), SX(x0), SY(top)); g.fillRect(X(x1), Y(top), SX(1.25 - x1), SY(top)); }
  }

  function paintFloor(g, s) {
    g.fillStyle = '#B5B8B5'; g.fillRect(0, 0, s, s);
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 46; i++) {
      var x = rnd() * s, y = rnd() * s, r = 14 + rnd() * 36, gr = g.createRadialGradient(x, y, 0, x, y, r);
      var c = rnd() > .5 ? '255,255,255' : '70,78,84';
      gr.addColorStop(0, 'rgba(' + c + ',.07)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.fillStyle = 'rgba(110,116,116,.75)'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 2, s, 1); g.fillRect(2, 0, 1, s);
  }

  function paintCeiling(g, w, h) {
    g.fillStyle = '#C8CCCD'; g.fillRect(0, 0, w, h);
    for (var x = 0; x < w; x += w / 30) { g.fillStyle = 'rgba(40,50,60,.07)'; g.fillRect(x, 0, 1.5, h); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x + 1.5, 0, 1.2, h); }
    // side rails and a cross beam
    g.fillStyle = '#59616A'; g.fillRect(0, 0, w * .045, h); g.fillRect(w * .955, 0, w * .045, h);
    var b = g.createLinearGradient(0, 0, 0, h * .1); b.addColorStop(0, '#5D656E'); b.addColorStop(.5, '#7A838C'); b.addColorStop(1, '#565E67');
    g.fillStyle = b; g.fillRect(0, 0, w, h * .1);
    var sd = g.createLinearGradient(0, h * .1, 0, h * .2); sd.addColorStop(0, 'rgba(20,28,36,.22)'); sd.addColorStop(1, 'rgba(20,28,36,0)');
    g.fillStyle = sd; g.fillRect(0, h * .1, w, h * .1);
    // LED tube
    g.fillStyle = '#DADEE0'; g.fillRect(w * .468, h * .2, w * .064, h * .72);
    g.shadowColor = 'rgba(255,255,255,.95)'; g.shadowBlur = w * .09;
    g.fillStyle = '#FFFFFF'; rr(g, w * .482, h * .24, w * .036, h * .64, w * .016); g.fill(); g.fill();
    g.shadowBlur = 0;
  }

  function paintGlow(g, w, h) {
    g.fillStyle = '#D9DCDD'; g.fillRect(0, 0, w, h);
    var gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.36, 'rgba(255,255,255,.15)'); gr.addColorStop(.5, 'rgba(255,255,255,1)');
    gr.addColorStop(.64, 'rgba(255,255,255,.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, h * .2, w, h * .72);
    var fade = g.createLinearGradient(0, 0, 0, h);
    fade.addColorStop(0, '#D9DCDD'); fade.addColorStop(.2, 'rgba(217,220,221,1)'); fade.addColorStop(.32, 'rgba(217,220,221,0)');
    fade.addColorStop(.82, 'rgba(217,220,221,0)'); fade.addColorStop(.94, 'rgba(217,220,221,1)'); fade.addColorStop(1, '#D9DCDD');
    g.fillStyle = fade; g.fillRect(0, 0, w, h);
  }

  /* ============================== corridor ============================== */
  RV3D.createCorridor = function (canvasEl, opts) {
    var T = window.THREE; opts = opts || {};
    var low = !!opts.low;
    var W = 2.4, H = 3, MOD = 1.25, Z0 = 6.25, N = 62, EYE = 1.52;
    var ZEND = Z0 - N * MOD; // -71.25
    var renderer = new T.WebGLRenderer({ canvas: canvasEl, antialias: !low, alpha: false, powerPreference: 'high-performance' });
    renderer.setClearColor(FOG, 1);
    var maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    var scene = new T.Scene(); scene.fog = new T.Fog(FOG, 7, 40);
    var cam = new T.PerspectiveCamera(60, 1, 0.05, 90);
    cam.rotation.order = 'YXZ';

    function texOf(c, rx, ry) {
      var t = new T.CanvasTexture(c); t.anisotropy = maxAniso;
      if (rx) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); }
      return t;
    }
    var basic = function (p) { p.side = T.DoubleSide; return new T.MeshBasicMaterial(p); };

    /* textures */
    var cw = low ? 256 : 512, chh = cw * 2;
    var atlasC = mk(cw * 4, chh * 2), ag = atlasC.getContext('2d');
    var codesL = ['A-07', 'A-12', 'B-03', 'B-18'], codesR = ['A-08', 'A-14', 'B-05', 'B-21'];
    for (var v = 0; v < 4; v++) {
      paintModule(ag, v * cw, 0, cw, chh, { lockRight: true, code: codesL[v] });
      paintModule(ag, v * cw, chh, cw, chh, { lockRight: false, code: codesR[v] });
    }
    var atlas = texOf(atlasC);
    var holeTex = {}, leafTex = {};
    [-1, 1].forEach(function (s) {
      var c = mk(cw, chh); paintModule(c.getContext('2d'), 0, 0, cw, chh, { lockRight: s < 0, hole: true }); holeTex[s] = texOf(c);
      var l = mk(cw / 2, cw); paintLeaf(l.getContext('2d'), 0, 0, cw / 2, cw, s < 0); leafTex[s] = texOf(l);
    });
    var fc = mk(256, 256); paintFloor(fc.getContext('2d'), 256);
    var L = Z0 - ZEND, floorTex = texOf(fc, W / 1.2, L / 1.2);
    var cc = mk(512, 512); paintCeiling(cc.getContext('2d'), 512, 512);
    var ceilTex = texOf(cc, 1, L / 1.5);

    /* doors that open: `opts.doors` of them along the sides (the opening scene uses one), then the end wall */
    var slots = [10, 16, 22, 28, 34, 40, 46, 52].slice(0, opts.doors || 8), stops = [], skip = { '-1': {}, '1': {} };
    slots.forEach(function (i, k) {
      var s = k % 2 === 0 ? 1 : -1; skip[s][i] = true;
      stops.push({ z: Z0 - (i + 0.5) * MOD, side: s, slot: i });
    });
    stops.push({ z: ZEND, side: 0, end: true });

    /* walls: one merged mesh per side, mapped into the atlas */
    function buildWall(s) {
      var pos = [], uv = [], idx = [], n = 0, x = s * W / 2, e = 0.0015;
      for (var i = 0; i < N; i++) {
        if (skip[s][i]) continue;
        var zn = Z0 - i * MOD, zf = zn - MOD, va = (i * 7 + (s > 0 ? 3 : 0)) % 4, row = s < 0 ? 0 : 1;
        var u0 = va / 4 + e, u1 = (va + 1) / 4 - e, vb = 1 - (row + 1) / 2 + e, vt = 1 - row / 2 - e;
        var za = s < 0 ? zn : zf, zb = s < 0 ? zf : zn;
        pos.push(x, 0, za, x, 0, zb, x, H, zb, x, H, za); uv.push(u0, vb, u1, vb, u1, vt, u0, vt);
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
      }
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      return new T.Mesh(g, wallMat);
    }
    var wallMat = basic({ map: atlas });
    var solid = new T.Group(); scene.add(solid);
    solid.add(buildWall(-1)); solid.add(buildWall(1));
    var ceil = new T.Mesh(new T.PlaneGeometry(W, L), basic({ map: ceilTex })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, (Z0 + ZEND) / 2); solid.add(ceil);

    /* end wall: navy, with the official white logo */
    var ec = mk(512, 640), eg = ec.getContext('2d');
    function paintEnd(img) {
      var gr = eg.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, '#1B2B5E'); gr.addColorStop(.55, '#152249'); gr.addColorStop(1, '#0B1F3A');
      eg.fillStyle = gr; eg.fillRect(0, 0, 512, 640);
      if (img) { var lw = 320, lh = lw * img.height / img.width; eg.drawImage(img, (512 - lw) / 2, 150, lw, lh); }
      eg.fillStyle = '#2EC5FF'; eg.fillRect(206, 420, 100, 6);
    }
    paintEnd(null);
    var endTex = texOf(ec);
    var endWall = new T.Mesh(new T.PlaneGeometry(W, H), basic({ map: endTex })); endWall.position.set(0, H / 2, ZEND); solid.add(endWall);
    if (opts.logo) { var li = new Image(); li.onload = function () { paintEnd(li); endTex.needsUpdate = true; api.dirty = true; }; li.src = opts.logo; }

    /* chapter portals */
    var portals = [];
    var roomC = mk(64, 64), rg = roomC.getContext('2d'), rgr = rg.createRadialGradient(32, 32, 4, 32, 32, 46);
    rgr.addColorStop(0, '#FFFFFF'); rgr.addColorStop(1, '#E3E9EE'); rg.fillStyle = rgr; rg.fillRect(0, 0, 64, 64);
    var roomMat = new T.MeshBasicMaterial({ map: new T.CanvasTexture(roomC), side: T.BackSide });
    var spillC = mk(64, 64), sg = spillC.getContext('2d'), sgr = sg.createLinearGradient(0, 0, 64, 0);
    sgr.addColorStop(0, 'rgba(255,255,255,.9)'); sgr.addColorStop(1, 'rgba(255,255,255,0)'); sg.fillStyle = sgr; sg.fillRect(0, 0, 64, 64);
    var spillTex = new T.CanvasTexture(spillC);
    function plateTex(code) {
      var c = mk(256, 128), g = c.getContext('2d');
      g.fillStyle = '#152249'; rr(g, 4, 4, 248, 120, 18); g.fill();
      g.strokeStyle = '#2EC5FF'; g.lineWidth = 6; rr(g, 7, 7, 242, 114, 16); g.stroke();
      g.fillStyle = '#fff'; g.font = '800 78px ' + NUMFONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(code, 128, 68);
      return new T.CanvasTexture(c);
    }
    stops.forEach(function (st, k) {
      if (st.end) return;
      var s = st.side, zn = Z0 - st.slot * MOD, zf = zn - MOD, x = s * W / 2, g = new T.Group();
      // wall with a door-shaped hole
      var za = s < 0 ? zn : zf, zb = s < 0 ? zf : zn, fg = new T.BufferGeometry();
      fg.setAttribute('position', new T.Float32BufferAttribute([x, 0, za, x, 0, zb, x, H, zb, x, H, za], 3));
      fg.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); fg.setIndex([0, 1, 2, 0, 2, 3]);
      var frame = new T.Mesh(fg, basic({ map: holeTex[s], alphaTest: 0.5 })); g.add(frame);
      // swinging leaf, hinged on the near edge
      var pivot = new T.Group(); pivot.position.set(x, 0, zn - 0.185);
      var lg = new T.BufferGeometry(), un = s < 0 ? 0 : 1, uf = s < 0 ? 1 : 0;
      lg.setAttribute('position', new T.Float32BufferAttribute([0, 0.015, 0, 0, 0.015, -0.88, 0, 2.255, -0.88, 0, 2.255, 0], 3));
      lg.setAttribute('uv', new T.Float32BufferAttribute([un, 0, uf, 0, uf, 1, un, 1], 2)); lg.setIndex([0, 1, 2, 0, 2, 3]);
      pivot.add(new T.Mesh(lg, basic({ map: leafTex[s] }))); g.add(pivot);
      // bright room behind the door
      var room = new T.Mesh(new T.BoxGeometry(2.4, H, 2.6), roomMat); room.position.set(s * (W / 2 + 1.2 + 0.002), H / 2, st.z); g.add(room);
      var rf = new T.Mesh(new T.PlaneGeometry(2.4, 2.6), new T.MeshBasicMaterial({ color: 0xC9CDCE })); rf.rotation.x = -Math.PI / 2; rf.position.set(s * (W / 2 + 1.2), 0.004, st.z); g.add(rf);
      // light spilling onto the corridor floor, and a soft glow in the doorway
      var spill = new T.Mesh(new T.PlaneGeometry(1.9, 1.5), new T.MeshBasicMaterial({ map: spillTex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
      spill.rotation.x = -Math.PI / 2; spill.rotation.z = s > 0 ? Math.PI : 0; spill.position.set(s * (W / 2 - 0.95), 0.006, st.z); g.add(spill);
      var glow = new T.Mesh(new T.PlaneGeometry(0.88, 2.24), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false, side: T.DoubleSide }));
      glow.rotation.y = Math.PI / 2; glow.position.set(s * (W / 2 + 0.03), 1.135, st.z); g.add(glow);
      // chapter plate and a thin light line above the frame
      var plate = new T.Mesh(new T.PlaneGeometry(0.46, 0.23), new T.MeshBasicMaterial({ map: plateTex(('0' + (k + 1)).slice(-2)), transparent: true, fog: true }));
      plate.rotation.y = -s * Math.PI / 2; plate.position.set(s * (W / 2 - 0.012), 2.62, st.z); g.add(plate);
      var led = new T.Mesh(new T.BoxGeometry(0.02, 0.022, 1.0), new T.MeshBasicMaterial({ color: 0x2EC5FF, fog: false })); led.position.set(s * (W / 2 - 0.012), 2.335, st.z); g.add(led);
      scene.add(g);
      portals.push({ pivot: pivot, spill: spill, glow: glow, side: s, open: 0, frame: frame });
    });

    /* glossy floor: a mirrored copy of the corridor seen through a translucent floor */
    var mirror = new T.Group(); mirror.scale.y = -1; scene.add(mirror);
    solid.children.forEach(function (m) { if (m !== ceil) mirror.add(new T.Mesh(m.geometry, m.material).copy(m, false)); });
    var gl = mk(128, 128); paintGlow(gl.getContext('2d'), 128, 128);
    var glowCeil = new T.Mesh(ceil.geometry, basic({ map: texOf(gl, 1, L / 1.5) })); glowCeil.rotation.x = Math.PI / 2; glowCeil.position.copy(ceil.position); mirror.add(glowCeil);
    portals.forEach(function (p) { mirror.add(new T.Mesh(p.frame.geometry, p.frame.material)); });
    var floor = new T.Mesh(new T.PlaneGeometry(W, L), new T.MeshBasicMaterial({ map: floorTex, transparent: true, opacity: 0.74 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (Z0 + ZEND) / 2); floor.renderOrder = 2; scene.add(floor);

    var size = { w: 0, h: 0, shift: -1 };
    var api = {
      stops: stops, eye: EYE, zEnd: ZEND, dirty: true,
      resize: function () {
        var w = canvasEl.clientWidth || 1, h = canvasEl.clientHeight || 1, dpr = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2);
        if (opts.pixelRatio) dpr = Math.min(dpr, opts.pixelRatio);
        renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
        size.w = w; size.h = h; size.shift = -1;
        var aspect = w / h, fov = 2 * Math.atan(Math.tan(27 * Math.PI / 180) / aspect) * 180 / Math.PI;
        cam.fov = Math.max(48, Math.min(88, fov)); cam.aspect = aspect; cam.updateProjectionMatrix(); api.dirty = true;
      },
      setPixelRatio: function (r) { opts.pixelRatio = r; api.resize(); },
      setPose: function (p, t) {
        var bob = Math.sin(p.z * 4.4) * 0.011 + Math.sin(t / 1700) * 0.004;
        cam.position.set((p.x || 0) + Math.sin(p.z * 2.2) * 0.012, EYE + bob, p.z);
        cam.rotation.y = p.yaw || 0;
        var sh = Math.round((p.shift || 0) * 1000) / 1000;
        if (sh !== size.shift) { size.shift = sh; cam.setViewOffset(size.w, size.h, 0, sh * size.h, size.w, size.h); }
      },
      setDoor: function (k, open) {
        var p = portals[k]; if (!p || p.open === open) return; p.open = open;
        p.pivot.rotation.y = -p.side * open * 1.5; p.spill.material.opacity = open * 0.5; p.glow.material.opacity = open * 0.22;
      },
      render: function () { renderer.render(scene, cam); },
      dispose: function () { renderer.dispose(); }
    };
    api.resize();
    return api;
  };

  /* ============================== unit viewer ============================== */
  function BoxBatch(T) { this.T = T; this.p = []; this.n = []; this.c = []; this.i = []; }
  BoxBatch.prototype.add = function (cx, cy, cz, w, h, d, color, yaw, shade) {
    var hw = w / 2, hh = h / 2, hd = d / 2, col = new this.T.Color(color), k = shade == null ? 1 : shade;
    var cs = Math.cos(yaw || 0), sn = Math.sin(yaw || 0), self = this;
    var F = [
      [0, 0, 1, [-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]],
      [0, 0, -1, [hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]],
      [1, 0, 0, [hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]],
      [-1, 0, 0, [-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]],
      [0, 1, 0, [-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]],
      [0, -1, 0, [-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]]
    ];
    F.forEach(function (f) {
      var b = self.p.length / 3, nx = f[0] * cs + f[2] * sn, nz = -f[0] * sn + f[2] * cs;
      for (var j = 3; j < 7; j++) {
        var q = f[j];
        self.p.push(cx + q[0] * cs + q[2] * sn, cy + q[1], cz - q[0] * sn + q[2] * cs);
        self.n.push(nx, f[1], nz); self.c.push(col.r * k, col.g * k, col.b * k);
      }
      self.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
  };
  BoxBatch.prototype.mesh = function (mat) {
    var T = this.T, g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i);
    return new T.Mesh(g, mat);
  };

  // turn one placed item into boxes. Local axes: x = along the wall, z = out from the wall (front)
  function addItem(b, it) {
    var yaw = it.yaw || 0, cs = Math.cos(yaw), sn = Math.sin(yaw), w = it.w, d = it.d, h = it.h, c = it.c;
    function box(lx, ly, lz, bw, bh, bd, col, sh) { b.add(it.x + lx * cs + lz * sn, ly, it.z - lx * sn + lz * cs, bw, bh, bd, col || c, yaw, sh); }
    switch (it.kind) {
      case 'box':
        for (var i = 0; i < it.n; i++) {
          box(0, h * (i + .5), 0, w - .03, h - .015, d - .03, c, 0.94 + ((i * 37 + Math.round(it.x * 10)) % 5) * 0.025);
          box(0, h * (i + 1) - .012, 0, .06, .012, d - .03, '#E9D8BD');
        }
        break;
      case 'suit':
        box(0, h / 2, 0, w - .04, h, d - .04, c); box(0, h + .03, 0, .16, .05, .04, '#22346E'); break;
      case 'sofa': case 'armchair':
        box(0, .21, .05, w, .42, d - .1, c); box(0, .55, -d / 2 + .13, w, .6, .26, c, 1.12);
        box(-w / 2 + .1, .4, .05, .2, .5, d - .1, c, 1.2); box(w / 2 - .1, .4, .05, .2, .5, d - .1, c, 1.2);
        box(0, .47, .12, w - .44, .1, d - .42, '#2B3F78'); break;
      case 'table':
        box(0, h - .03, 0, w, .06, d, c);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { box(q[0] * (w / 2 - .06), (h - .06) / 2, q[1] * (d / 2 - .06), .07, h - .06, .07, c, .9); });
        box(-.28, h + .23, 0, .44, .46, .44, '#9FADC0'); box(.28, h + .23, 0, .44, .46, .44, '#9FADC0'); break;
      case 'wardrobe':
        box(0, h / 2, 0, w, h, d, c); box(0, h / 2, d / 2 + .004, .015, h - .1, .01, '#7A5A3A');
        box(-.07, h * .52, d / 2 + .012, .02, .22, .02, '#F1E6D6'); box(.07, h * .52, d / 2 + .012, .02, .22, .02, '#F1E6D6'); break;
      case 'fridge':
        box(0, h / 2, 0, w, h, d, c); box(0, h * .66, d / 2 + .004, w - .04, .014, .01, '#7F8C9C'); box(w / 2 - .09, h * .8, d / 2 + .02, .03, .3, .03, '#EEF1F5'); break;
      case 'washer':
        box(0, h / 2, 0, w, h, d, c); box(0, h * .45, d / 2 + .006, .36, .36, .012, '#8FA0B8'); box(0, h * .45, d / 2 + .012, .26, .26, .012, '#22346E');
        if (it.top) box(0, h + .21, 0, .5, .42, .45, '#C69D70'); break;
      case 'dresser':
        box(0, h / 2, 0, w, h, d, c);
        [.2, .45, .7].forEach(function (f) { box(0, h * f, d / 2 + .004, w - .08, .012, .01, '#7A5A3A'); });
        if (it.top) box(-.15, h + .21, 0, .5, .42, .42, '#C69D70'); break;
      case 'shelf':
        box(-w / 2 + .02, h / 2, 0, .04, h, d, c); box(w / 2 - .02, h / 2, 0, .04, h, d, c);
        [0.04, .46, .9, 1.34, 1.76].forEach(function (y, i) { box(0, y, 0, w - .06, .04, d, c); if (i < 4) box((i % 2 ? .15 : -.14), y + .19, 0, .46, .32, d - .08, '#C69D70', 1 - i * .02); });
        break;
      case 'pallet':
        box(0, .07, 0, w, .14, d, '#A8845C'); box(0, .14 + (h - .14) / 2, 0, w - .08, h - .14, d - .08, c);
        box(0, .14 + (h - .14) * .34, 0, w - .06, .03, d - .06, '#EAD9BF'); box(0, .14 + (h - .14) * .68, 0, w - .06, .03, d - .06, '#EAD9BF'); break;
      case 'rack':
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { box(q[0] * (w / 2 - .03), h / 2, q[1] * (d / 2 - .03), .06, h, .06, '#22346E'); });
        [.12, .86, 1.6].forEach(function (y, i) {
          box(0, y, 0, w, .06, d, '#2EA9DB');
          box(-w / 4, y + .31, 0, w / 2 - .14, .56, d - .1, '#C69D70', 1 - i * .03); box(w / 4, y + .26, 0, w / 2 - .2, .46, d - .1, '#C69D70', .95);
        }); break;
      case 'mattress':
        box(0, h / 2, 0, w, h, d, c); [-.32, 0, .32].forEach(function (f) { box(w * f, h / 2, d / 2 + .003, .02, h - .16, .008, '#9DB6D6'); }); break;
      default:
        box(0, h / 2, 0, w, h, d, c);
    }
  }

  RV3D.createUnitViewer = function (canvasEl, labelsEl, opts) {
    var T = window.THREE; opts = opts || {};
    var HH = 3, dark = !!opts.dark;
    var renderer = new T.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 0.1, 500);
    scene.add(new T.HemisphereLight(0xffffff, 0xBCC6D2, 0.95));
    var sun = new T.DirectionalLight(0xffffff, 0.5); sun.position.set(6, 11, 8); scene.add(sun);
    var root = new T.Group(); scene.add(root);

    // floor with a 1 m grid, so the area can be counted
    var gc = mk(128, 128), gg = gc.getContext('2d');
    gg.fillStyle = '#EEF1F5'; gg.fillRect(0, 0, 128, 128); gg.fillStyle = '#FAFBFC'; gg.fillRect(3, 3, 122, 122);
    gg.strokeStyle = '#C9D1DC'; gg.lineWidth = 3; gg.strokeRect(0, 0, 128, 128);
    var gridTex = new T.CanvasTexture(gc); gridTex.wrapS = gridTex.wrapT = T.RepeatWrapping; gridTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    var floor = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshLambertMaterial({ map: gridTex })); floor.rotation.x = -Math.PI / 2; root.add(floor);
    var slab = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xC9D1DC })); root.add(slab);
    var sc = mk(128, 128), sg = sc.getContext('2d'), sgr = sg.createRadialGradient(64, 64, 20, 64, 64, 64);
    sgr.addColorStop(0, dark ? 'rgba(3,9,22,.55)' : 'rgba(11,31,58,.28)'); sgr.addColorStop(1, dark ? 'rgba(3,9,22,0)' : 'rgba(11,31,58,0)'); sg.fillStyle = sgr; sg.fillRect(0, 0, 128, 128);
    var shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.09; root.add(shadow);

    // four walls and a roof: closed, the unit is a box; open, the roof lifts away and the walls nearest the camera fade
    var walls = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(function (n) {
      var m = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xF7F9FB, transparent: true, opacity: 1, depthWrite: false }));
      m.userData.n = n; m.renderOrder = 3; root.add(m); return m;
    });
    var roof = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xE9EEF3, transparent: true, opacity: 1, depthWrite: false })); roof.renderOrder = 4; root.add(roof);
    var edges = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1, 1, 1)), new T.LineBasicMaterial({ color: dark ? 0xffffff : 0x152249, transparent: true, opacity: dark ? 0.5 : 0.32 })); root.add(edges);
    // the door: a hinged leaf with a padlock, on the front wall
    var doorPivot = new T.Group(); root.add(doorPivot);
    var leafGeo = new T.BoxGeometry(.9, 2.2, .045);
    var leaf = new T.Mesh(leafGeo, new T.MeshLambertMaterial({ color: 0xD9E0E8 })); leaf.position.set(.45, 1.1, 0); doorPivot.add(leaf);
    var leafEdge = new T.LineSegments(new T.EdgesGeometry(leafGeo), new T.LineBasicMaterial({ color: 0x152249, transparent: true, opacity: 0.6 })); leafEdge.position.copy(leaf.position); doorPivot.add(leafEdge);
    var padlock = new T.Mesh(new T.BoxGeometry(.1, .12, .05), new T.MeshLambertMaterial({ color: 0xFFC83D })); padlock.position.set(.79, 1.08, .045); doorPivot.add(padlock);
    var sill = new T.Mesh(new T.BoxGeometry(.9, .02, .1), new T.MeshBasicMaterial({ color: 0x152249 })); root.add(sill);
    var dimMat = new T.MeshBasicMaterial({ color: 0x2EC5FF });
    var dimW = new T.Mesh(new T.BoxGeometry(1, .03, .04), dimMat), dimD = new T.Mesh(new T.BoxGeometry(.04, .03, 1), dimMat), dimH = new T.Mesh(new T.BoxGeometry(.04, 1, .04), dimMat);
    root.add(dimW); root.add(dimD); root.add(dimH);

    // a 1.75 m person at the door, for scale
    var person = new T.Group(), pm = new T.MeshLambertMaterial({ color: dark ? 0x2EC5FF : 0x152249 });
    [-0.085, 0.085].forEach(function (x) { var l = new T.Mesh(new T.CylinderGeometry(.065, .058, .86, 12), pm); l.position.set(x, .43, 0); person.add(l); });
    var torso = new T.Mesh(new T.CylinderGeometry(.2, .15, .62, 16), pm); torso.scale.z = .62; torso.position.y = 1.17; person.add(torso);
    var head = new T.Mesh(new T.SphereGeometry(.115, 18, 14), pm); head.position.y = 1.635; person.add(head);
    root.add(person);

    var itemMat = new T.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 1 });
    var items = null;
    var labels = ['w', 'd', 'h'].map(function () { var e = document.createElement('span'); e.className = 'vlabel'; labelsEl.appendChild(e); return e; });

    var st = { w: 2, d: 3, tw: 2, td: 3, open: false, az: 0.66, el: 0.5, dist: 12, tdist: 12, user: -1e9, drag: null, pop: 1, showItems: true, layout: [], pending: false, active: false, raf: 0, t0: performance.now(), size: { w: 1, h: 1 },
      lid: opts.still ? 1 : 0, lidT: opts.still ? 1 : 0, wasOpen: false };

    function fit() {
      var r = 0.5 * Math.sqrt(st.tw * st.tw + st.td * st.td + HH * HH) + 0.55;
      var vf = cam.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * cam.aspect);
      st.tdist = r / Math.sin(Math.min(vf, hf)) * 1.02;
    }
    function shell() {
      var w = st.w, d = st.d;
      floor.scale.set(w, d, 1); gridTex.repeat.set(w, d);
      slab.scale.set(w + .12, .09, d + .12); slab.position.y = -0.046;
      shadow.scale.set(w + 3.2, d + 3.2, 1);
      walls.forEach(function (m) {
        var n = m.userData.n, t = 0.06;
        if (n[0] === 0) { m.scale.set(w + 2 * t, HH, t); m.position.set(0, HH / 2, n[1] * (d / 2 + t / 2)); }
        else { m.scale.set(t, HH, d); m.position.set(n[0] * (w / 2 + t / 2), HH / 2, 0); }
        m.visible = !st.open;
      });
      roof.scale.set(w + .14, .07, d + .14); roof.position.set(0, HH + .035, 0);
      edges.scale.set(w, st.open ? 0.001 : HH, d); edges.position.y = st.open ? 0.001 : HH / 2;
      doorPivot.position.set(-.45, 0, d / 2 + .085); doorPivot.visible = !st.open;
      sill.position.set(0, .011, d / 2 + .06); sill.visible = !st.open;
      dimW.scale.x = w; dimD.scale.z = d; dimH.scale.y = HH; dimW.visible = dimD.visible = dimH.visible = !st.open;
      person.position.set(Math.min(w / 2 - .25, .8) + (w < 1.5 ? .35 : 0), 0, d / 2 + .3);
    }
    function buildItems() {
      if (items) { root.remove(items); items.geometry.dispose(); items = null; }
      if (!st.showItems || !st.layout.length) return;
      var b = new BoxBatch(T); st.layout.forEach(function (it) { addItem(b, it); });
      items = b.mesh(itemMat); root.add(items); st.pop = 0;
    }
    function resize() {
      var w = canvasEl.clientWidth || 1, h = canvasEl.clientHeight || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
      st.size.w = w; st.size.h = h; cam.aspect = w / h; cam.updateProjectionMatrix(); fit();
    }
    var v3 = new T.Vector3();
    function place(el, x, y, z) {
      v3.set(x, y, z).project(cam);
      el.style.transform = 'translate(' + ((v3.x * .5 + .5) * st.size.w).toFixed(1) + 'px,' + ((-v3.y * .5 + .5) * st.size.h).toFixed(1) + 'px) translate(-50%,-50%)';
    }
    function frame(now) {
      st.raf = st.active ? requestAnimationFrame(frame) : 0;
      var k = 0.16;
      // morph the shell toward the selected size, then drop the items in
      if (Math.abs(st.w - st.tw) > 0.004 || Math.abs(st.d - st.td) > 0.004) { st.w += (st.tw - st.w) * k; st.d += (st.td - st.d) * k; shell(); }
      else if (st.pending) { st.w = st.tw; st.d = st.td; shell(); st.pending = false; buildItems(); }
      st.dist += (st.tdist - st.dist) * 0.12;
      // the lid: 0 closed (a locked box), 1 open (door swung out, roof gone, near walls faded)
      st.lid += (st.lidT - st.lid) * 0.085; if (Math.abs(st.lidT - st.lid) < 0.002) st.lid = st.lidT;
      var opened = st.open || st.lid > 0.4;
      doorPivot.rotation.y = -st.lid * 1.95;
      roof.material.opacity = 1 - Math.min(1, st.lid * 1.7); roof.visible = !st.open && roof.material.opacity > 0.02;
      if (items) { if (opened && !st.wasOpen) st.pop = 0; items.visible = opened; }
      st.wasOpen = opened;
      if (items && st.pop < 1) { st.pop = Math.min(1, st.pop + 0.045); var e = 1 - Math.pow(1 - st.pop, 3); items.scale.y = 0.02 + 0.98 * e; itemMat.opacity = Math.min(1, st.pop * 2.2); }
      // idle sway until the visitor takes over
      var idle = now - st.user > 3500 && !st.drag, sway = idle && !opts.still ? Math.sin((now - st.t0) / 2600) * 0.2 : 0;
      var az = st.az + sway, el = st.el, cy = st.open ? 0.4 : 1.15;
      cam.position.set(Math.sin(az) * Math.cos(el) * st.dist, cy + Math.sin(el) * st.dist, Math.cos(az) * Math.cos(el) * st.dist);
      cam.lookAt(0, cy, 0);
      var cx = Math.sin(az), cz = Math.cos(az);
      walls.forEach(function (m) {
        var n = m.userData.n, facing = n[0] * cx + n[1] * cz, target = facing > 0.12 && opened ? 0 : 0.97;
        m.material.opacity += (target - m.material.opacity) * 0.18; m.visible = !st.open && m.material.opacity > 0.02;
      });
      person.rotation.y = az;
      // dimension lines sit on the sides that face the camera, and glide over when the unit is turned
      var sx = cx >= 0 ? 1 : -1, sz = cz >= 0 ? 1 : -1, tz = sz * (st.d / 2 + .68), tx = sx * (st.w / 2 + .4), hx = sx * sz * (st.w / 2 + .12);
      if (st.dimInit) { st.bz += (tz - st.bz) * .2; st.bx += (tx - st.bx) * .2; st.hx += (hx - st.hx) * .2; } else { st.bz = tz; st.bx = tx; st.hx = hx; st.dimInit = true; }
      dimW.position.set(0, .02, st.bz); dimD.position.set(st.bx, .02, 0); dimH.position.set(st.hx, HH / 2, -st.d / 2 - .12);
      renderer.render(scene, cam);
      place(labels[0], -st.w * .22, .02, st.bz); place(labels[1], st.bx, .02, 0); place(labels[2], st.hx, HH * .6, -st.d / 2 - .12);
      labels.forEach(function (lb) { lb.style.display = st.open ? 'none' : ''; });
    }
    // drag to rotate (horizontal drag only on touch, so the page still scrolls); a short tap opens or closes the door
    canvasEl.addEventListener('pointerdown', function (e) { st.drag = { x: e.clientX, y: e.clientY, az: st.az, el: st.el, mouse: e.pointerType === 'mouse', t: performance.now(), moved: 0 }; st.user = performance.now(); try { canvasEl.setPointerCapture(e.pointerId); } catch (_) {} if (opts.onUser) opts.onUser(); });
    canvasEl.addEventListener('pointermove', function (e) {
      if (!st.drag) return; st.user = performance.now();
      st.drag.moved = Math.max(st.drag.moved, Math.abs(e.clientX - st.drag.x) + Math.abs(e.clientY - st.drag.y));
      st.az = st.drag.az - (e.clientX - st.drag.x) * 0.009;
      if (st.drag.mouse) st.el = Math.max(0.16, Math.min(1.15, st.drag.el + (e.clientY - st.drag.y) * 0.006));
    });
    canvasEl.addEventListener('pointerup', function () {
      var g = st.drag; st.drag = null;
      if (g && g.moved < 9 && performance.now() - g.t < 450 && opts.onTap) opts.onTap();
    });
    ['pointercancel', 'pointerleave'].forEach(function (n) { canvasEl.addEventListener(n, function () { st.drag = null; }); });
    canvasEl.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { st.az -= .2; st.user = performance.now(); } if (e.key === 'ArrowRight') { st.az += .2; st.user = performance.now(); } });

    resize(); shell();
    return {
      setUnit: function (u, layout, texts, instant) {
        st.tw = u.w; st.td = u.d; st.open = !!u.open; st.layout = layout || []; st.pending = true;
        if (items) { root.remove(items); items.geometry.dispose(); items = null; }
        if (instant) { st.w = u.w; st.d = u.d; }
        shell(); fit(); if (instant) st.dist = st.tdist;
        labels[0].textContent = texts.w; labels[1].textContent = texts.d; labels[2].textContent = texts.h;
      },
      setLabels: function (texts) { labels[0].textContent = texts.w; labels[1].textContent = texts.d; labels[2].textContent = texts.h; },
      setItems: function (on) { st.showItems = on; buildItems(); if (!on) st.pop = 1; },
      setLid: function (open, instant) { st.lidT = open ? 1 : 0; if (instant) st.lid = st.lidT; },
      setActive: function (on) { if (on === st.active) return; st.active = on; if (on && !st.raf) st.raf = requestAnimationFrame(frame); },
      resize: resize,
      dispose: function () { st.active = false; renderer.dispose(); }
    };
  };

  window.RV3D = RV3D;
})();
