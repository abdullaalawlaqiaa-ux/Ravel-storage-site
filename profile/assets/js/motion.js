/* Ravel Storage: the TRAVEL -> RAVEL brand film (real-time, Three.js r149, no other library).
   One IIFE, ES5. Defines window.RVMotion at load and touches THREE / RV3D only inside open().
   Every frame is a pure function of the film time t: seek() is exact, Skip and Replay are just seeks.
   The overlay (canvas, captions, controls, end card, storyboard) is owned by this file; classes start with "mfilm". */
(function () {
  'use strict';
  var W = window, doc = document;

  /* ============================== time and easing ============================== */
    function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function seg(x, a, b) { return clamp((x - a) / (b - a), 0, 1); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function io(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function out3(x) { return 1 - Math.pow(1 - x, 3); }
  function inq(x) { return x * x; }
  function back(x) { var c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function bell(x) { return Math.sin(Math.PI * clamp(x, 0, 1)); }
  function tw(t, a, b, e) { return (e || io)(seg(t, a, b)); }
  function sceneOf(t, sc) { var s = 0; for (var i = 1; i < sc.length; i++) if (t >= sc[i] - 1e-6) s = i; return s; }

  /* ============================== Montserrat 800 outlines (cap height = 1), SIL OFL ============================== */
  var GLY = {"T":{"adv":0.9071,"c":[["M",0.3123,0.0,"L",0.3123,0.7758,"L",0.0057,0.7758,"L",0.0057,1.0,"L",0.902,1.0,"L",0.902,0.7758,"L",0.5954,0.7758,"L",0.5954,0.0]]},"R":{"adv":1.0571,"c":[["M",0.1,0.0,"L",0.1,1.0,"L",0.5471,1.0,"Q",0.7657,1.0,0.8836,0.9007,"Q",1.0014,0.8014,1.0014,0.63,"Q",1.0014,0.5171,0.9471,0.4343,"Q",0.8971,0.3571,0.8057,0.3143,"L",1.0214,0.0,"L",0.7186,0.0,"L",0.5371,0.2657,"L",0.3829,0.2657,"L",0.3829,0.0],["M",0.3829,0.4843,"L",0.54,0.4843,"Q",0.6286,0.4843,0.6721,0.5229,"Q",0.7157,0.5614,0.7157,0.63,"Q",0.7157,0.7,0.6721,0.7386,"Q",0.6286,0.7771,0.54,0.7771,"L",0.3829,0.7771]]},"A":{"adv":1.1229,"c":[["M",-0.02,0.0,"L",0.4214,1.0,"L",0.7,1.0,"L",1.1429,0.0,"L",0.8486,0.0,"L",0.77,0.1943,"L",0.3471,0.1943,"L",0.2686,0.0],["M",0.6871,0.4029,"L",0.5586,0.7229,"L",0.43,0.4029]]},"V":{"adv":1.0943,"c":[["M",0.4071,0.0,"L",-0.02,1.0,"L",0.2857,1.0,"L",0.5571,0.3486,"L",0.8343,1.0,"L",1.1143,1.0,"L",0.6857,0.0]]},"E":{"adv":0.96,"c":[["M",0.1,0.0,"L",0.1,1.0,"L",0.8843,1.0,"L",0.8843,0.7814,"L",0.38,0.7814,"L",0.38,0.6129,"L",0.8243,0.6129,"L",0.8243,0.4014,"L",0.38,0.4014,"L",0.38,0.2186,"L",0.9029,0.2186,"L",0.9029,0.0]]},"L":{"adv":0.8714,"c":[["M",0.1005,0.0,"L",0.1005,1.0,"L",0.3835,1.0,"L",0.3835,0.2242,"L",0.8602,0.2242,"L",0.8602,0.0]]}};
  var KERN = { AV: -0.0557, VE: -0.0214 };
  function wordLayout(word) {
    var x = 0, pos = [], i;
    for (i = 0; i < word.length; i++) { pos.push(x); x += GLY[word.charAt(i)].adv + (KERN[word.charAt(i) + word.charAt(i + 1)] || 0); }
    for (i = 0; i < pos.length; i++) pos[i] -= x / 2;
    return { pos: pos, w: x };
  }

  /* ============================== colours ============================== */
  var MANGO = 0xFFB81C, MANGO_D = 0xE08A00, NAVY = 0x152249, NAVY_D = 0x0B1F3A, CYAN = 0x2EC5FF;
  var H = 3, DEPTH = .2, BEV = .018, PIVOT = .86;

  /* ============================== the T that becomes an aeroplane ============================== */
  // Every ring of every part is a rounded rectangle (a, b, r). The T seen face-on IS the aeroplane seen from above:
  // stem = fuselage, crossbar = wings. One indexed mesh, rebuilt from seven numbers while k changes.
  var NS = 6, NV = 4 * (NS + 1), QS = [[1, 1], [-1, 1], [-1, -1], [1, -1]], CAP = [0, .0001, .7071, 1];
  function capInset(j, r) { return j === 0 ? 1e9 : r * (1 - Math.sqrt(1 - (1 - CAP[j]) * (1 - CAP[j]))); }
  function capAlong(j, r) { return j === 0 ? 0 : r * (1 - CAP[j]); }
  function sched(k) { return { round: io(seg(k, 0, .5)), sweep: io(seg(k, .04, .58)), nose: io(seg(k, .3, .84)), tail: io(seg(k, .42, .94)), eng: io(seg(k, .6, 1)), gear: io(seg(k, .72, 1)), paint: io(seg(k, .5, 1)) }; }
  var TG = (function () { var c = GLY.T.c[0]; return { x0: c[7], x1: c[13], sx0: c[1], sx1: c[19], yb: c[5], cx: (c[7] + c[13]) / 2 }; })();

  function makePlane(T) {
    var WS = (TG.sx1 - TG.sx0) / 2, WC = (TG.x1 - TG.x0) / 2, YB = TG.yb, TC = (1 - YB) / 2, HD = DEPTH / 2;
    var FUS = 44, WNG = 39, TPL = 21, FIN = 14, ENG = 14, GEAR = 8, parts = [], nVert = 0, PI_ = [];
    function Loft(nr, axes, flip) { this.nr = nr; this.ax = axes; this.flip = flip; this.base = 0; }
    Loft.prototype.ring = function (P, i, c, oa, ob, a, b, r, tp) {
      var o = (this.base + i * NV) * 3, A = this.ax[0], B = this.ax[1], C = this.ax[2], q, s, k = 0;
      r = Math.min(r, a, b);
      for (q = 0; q < 4; q++) for (s = 0; s <= NS; s++, k++) {
        var th = (q + s / NS) * Math.PI / 2, pa = QS[q][0] * (a - r) + r * Math.cos(th), pb = QS[q][1] * (b - r) + r * Math.sin(th);
        if (tp && pa < 0) pb *= 1 - tp * Math.pow(-pa / a, 1.4);
        P[o + k * 3 + A] = oa + pa; P[o + k * 3 + B] = ob + pb; P[o + k * 3 + C] = c;
      }
    };
    Loft.prototype.index = function (I) {
      this.i0 = I.length;
      for (var i = 0; i < this.nr - 1; i++) for (var k = 0; k < NV; k++) {
        var a = this.base + i * NV + k, b = this.base + i * NV + (k + 1) % NV, c = a + NV, d = b + NV;
        if (this.flip) I.push(a, c, b, b, c, d); else I.push(a, b, c, b, d, c);
      }
      this.i1 = I.length;
    };
    function part(l) { l.base = nVert; nVert += l.nr * NV; parts.push(l); return l; }
    var fus = part(new Loft(FUS, [0, 2, 1], true)), wing = part(new Loft(WNG, [1, 2, 0], false)), tpl = part(new Loft(TPL, [1, 2, 0], false)),
      fin = part(new Loft(FIN, [1, 0, 2], true)), engL = part(new Loft(ENG, [0, 2, 1], true)), engR = part(new Loft(ENG, [0, 2, 1], true)),
      gearN = part(new Loft(GEAR, [0, 1, 2], false)), gearL = part(new Loft(GEAR, [0, 1, 2], false)), gearR = part(new Loft(GEAR, [0, 1, 2], false));
    var geo = new T.BufferGeometry(), PP = new Float32Array(nVert * 3), PC = new Float32Array(nVert * 3);
    parts.forEach(function (l) { l.index(PI_); });
    geo.setAttribute('position', new T.BufferAttribute(PP, 3)); geo.setAttribute('color', new T.BufferAttribute(PC, 3)); geo.setIndex(PI_);
    var cM = new T.Color(MANGO), cMD = new T.Color(MANGO_D), cW = new T.Color(0xF6F3EC), cN = new T.Color(0x1B2A55), cG = new T.Color(0x9AA3AE),
      cK = new T.Color(0x1B2540), cWarm = new T.Color(0xFFD9A0), tmpC = new T.Color();
    function paint(l, from, to, col, k) { tmpC.copy(cM).lerp(col, k); for (var i = (l.base + from * NV) * 3, e = (l.base + to * NV) * 3; i < e; i += 3) { PC[i] = tmpC.r; PC[i + 1] = tmpC.g; PC[i + 2] = tmpC.b; } }
    function paintV(l, ring, v, col, k) { var i = (l.base + ring * NV + v) * 3; tmpC.setRGB(PC[i], PC[i + 1], PC[i + 2]).lerp(col, k); PC[i] = tmpC.r; PC[i + 1] = tmpC.g; PC[i + 2] = tmpC.b; }

    function build(K) {
      var i, j, f, e, y, a, b, r, z, af, kr = K.round, kn = K.nose, ks = K.sweep, kt = K.tail;
      for (i = 0; i < FUS; i++) {
        var yL, aL = WS, bL = HD, rL = BEV, yP, aP, bP, zP, s;
        if (i < 4) { yL = BEV - capAlong(i, BEV); var d0 = Math.min(capInset(i, BEV), WS, HD); aL = WS - d0; bL = HD - d0; rL = Math.max(0, BEV - d0); if (i === 0) { aL = bL = 1e-4; rL = 0; } yP = -.06 + .012 * i; }
        else if (i < 20) { s = (i - 3) / 17; yL = lerp(BEV, YB, s); yP = lerp(-.024, .74, s); }
        else if (i < 26) { s = (i - 20) / 5; yL = lerp(YB, .93, s); yP = lerp(.76, 1.02, s); if (i > 20) { aL = WS - .006; bL = HD - .006; } }
        else if (i < 40) { s = (i - 25) / 14; yL = .93 + .02 * s; yP = 1.02 + .44 * Math.sin(s * Math.PI / 2); aL = WS - .006; bL = HD - .006; }
        else { s = (i - 39) / 4; yL = .95 + .006 * s; yP = 1.46 + .003 * s; aL = (WS - .006) * (1 - s) + 1e-4; bL = (HD - .006) * (1 - s) + 1e-4; rL = BEV * (1 - s); }
        var sh = yP < .58 ? .2 + .8 * Math.pow(Math.sin(clamp((yP + .06) / .64, 0, 1) * Math.PI / 2), .85) : yP > 1.02 ? Math.pow(Math.max(0, 1 - Math.pow((yP - 1.02) / .445, 2)), .62) : 1;
        if (i < 3) sh *= [.05, .45, .8][i];
        aP = .098 * sh + 1e-4; bP = .104 * sh + 1e-4; zP = .045 * Math.pow(1 - clamp((yP + .06) / .64, 0, 1), 2);
        y = lerp(yL, yP, i < 20 ? kt : kn); a = lerp(aL, aP, kr); b = lerp(bL, bP, kr); r = lerp(rL, Math.min(aP, bP), kr); z = zP * kr;
        fus.ring(PP, i, y - PIVOT, 0, z, a, b, r, 0);
      }
      for (j = 0; j < WNG; j++) {
        var c = j < 4 ? j : j > WNG - 5 ? WNG - 1 - j : 4, sgn = j < WNG / 2 - .5 ? -1 : 1; f = clamp((j - 3) / (WNG - 7), 0, 1) * 2 - 1; af = Math.abs(f);
        var xL = f * (WC - BEV) + sgn * (c < 4 ? BEV - capAlong(c, BEV) : BEV), dL = c < 4 ? Math.min(capInset(c, BEV), TC, HD) : 0;
        if (c === 4) xL = f * (WC - BEV);
        var aLw = TC - dL, bLw = HD - dL, rLw = Math.max(0, BEV - dL); if (c === 0) { aLw = bLw = 1e-4; rLw = 0; }
        var xP = f * .8 + sgn * (c < 4 ? .004 * c : .012), ch = lerp(.165, .05, af), th = lerp(.03, .011, af), capS = c < 4 ? [.02, .4, .8, 1][c] : 1;
        var yLE = 1.03 - .5 * af, zW = -.05 + .075 * af + (af > .88 ? .16 * Math.pow((af - .88) / .12, 2) : 0);
        if (af > .88) { ch *= 1 - .45 * (af - .88) / .12; yLE -= .05 * (af - .88) / .12; }
        a = lerp(aLw, ch * capS + 1e-4, ks); b = lerp(bLw, th * capS + 1e-4, kr); r = lerp(rLw, Math.min(ch, th) * capS, kr);
        wing.ring(PP, j, lerp(xL, xP, ks), lerp(1 - TC, yLE - ch, ks) - PIVOT, zW * ks, a, b, r, .82 * ks * kr);
      }
      for (j = 0; j < TPL; j++) {
        f = j / (TPL - 1) * 2 - 1; af = Math.abs(f); e = j < 2 || j > TPL - 3 ? (j === 0 || j === TPL - 1 ? .02 : .6) : 1;
        var chT = lerp(.085, .04, af), thT = lerp(.016, .008, af);
        a = lerp(.05, chT, kt) * e + 1e-4; b = lerp(.07, thT, kt) * e + 1e-4;
        tpl.ring(PP, j, f * lerp(.11, .34, kt), lerp(.1, .2 - .2 * af - chT, kt) - PIVOT, .05 * kt, a, b, Math.min(a, b), .8 * kt);
      }
      for (j = 0; j < FIN; j++) {
        f = j / (FIN - 1); e = j === FIN - 1 ? .02 : j === FIN - 2 ? .6 : j === 0 ? .02 : 1;
        var chF = lerp(.13, .055, f), thF = lerp(.013, .007, f);
        a = lerp(.05, chF, kt) * e + 1e-4; b = lerp(.03, thF, kt) * e + 1e-4;
        fin.ring(PP, j, lerp(-.06 + .14 * f, .04 + .4 * f, kt), lerp(.1, .31 - .24 * f - chF, kt) - PIVOT, 0, a, b, Math.min(a, b), .8 * kt);
      }
      [engL, engR].forEach(function (en, n) {
        var sx = n ? 1 : -1, ke = K.eng;
        for (var jj = 0; jj < ENG; jj++) {
          var ff = jj / (ENG - 1), pr = Math.pow(Math.sin(Math.PI * clamp(ff * .92 + .04, 0, 1)), .45), rad = lerp(.014, .046, ke) * (jj === 0 || jj === ENG - 1 ? .05 : pr) + 1e-4;
          en.ring(PP, jj, lerp(.25 + .08 * ff, .2 + .25 * ff, ke) - PIVOT, sx * lerp(.015, .15, ke), lerp(0, .04, ke), rad, rad, rad, 0);
        }
      });
      [[gearN, 0, 1.18], [gearL, -.13, .7], [gearR, .13, .7]].forEach(function (q) {
        var kg = K.gear;
        for (var jj = 0; jj < GEAR; jj++) {
          var ff = jj / (GEAR - 1), foot = ff < .45 ? 1 : .42, rr2 = (jj === 0 || jj === GEAR - 1 ? .002 : 1), gs = lerp(.35, 1, kg);
          q[0].ring(PP, jj, lerp(-.03 + .02 * ff, -.2 + .15 * ff, kg), q[1] * lerp(.1, 1, kg), lerp(.5, q[2], kg) - PIVOT, .022 * foot * rr2 * gs + 1e-4, .034 * foot * rr2 * gs + 1e-4, .02 * foot * rr2 * gs, 0);
        }
      });
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
    }
    // livery: mango lightens to warm white; fin, wing tips and engines keep the mango; a window line and a windscreen
    function colour(K, glow) {
      var kp = K.paint, i;
      paint(fus, 0, FUS, cW, kp); paint(wing, 0, WNG, cW, kp); paint(wing, 0, 7, cM, kp); paint(wing, WNG - 7, WNG, cM, kp);
      paint(tpl, 0, TPL, cW, kp); paint(fin, 0, FIN, cM, kp); paint(engL, 0, ENG, cM, kp); paint(engR, 0, ENG, cM, kp); paint(engL, 0, 2, cK, kp); paint(engR, 0, 2, cK, kp);
      paint(engL, ENG - 3, ENG, cG, kp); paint(engR, ENG - 3, ENG, cG, kp);
      paint(gearN, 0, GEAR, cG, kp); paint(gearL, 0, GEAR, cG, kp); paint(gearR, 0, GEAR, cG, kp); paint(gearN, 0, 4, cK, kp); paint(gearL, 0, 4, cK, kp); paint(gearR, 0, 4, cK, kp);
      var wk = clamp((kp - .6) / .4, 0, 1), wc = tmpC.clone().copy(cN).lerp(cWarm, glow);
      for (i = 15; i <= 30; i++) { paintV(fus, i, 1, wc, wk); paintV(fus, i, 2 * (NS + 1) - 2, wc, wk); }
      for (i = 31; i <= 32; i++) for (var v = 4; v <= 9; v++) paintV(fus, i, v, cN, wk * .8);
      var nrm = geo.attributes.normal.array, kd = 1 - K.round;
      if (kd > 0) for (i = 0; i < nVert * 3; i += 3) { var sd = (1 - Math.min(1, Math.abs(nrm[i + 2]) * 1.6)) * kd; PC[i] = lerp(PC[i], cMD.r, sd); PC[i + 1] = lerp(PC[i + 1], cMD.g, sd); PC[i + 2] = lerp(PC[i + 2], cMD.b, sd); }
      geo.attributes.color.needsUpdate = true;
    }
    // watertightness: for each closed part the area vectors sum to zero; the volume must be positive
    function solid() {
      var out = [], worst = 0, nan = 0, i;
      for (i = 0; i < PP.length; i++) if (!(PP[i] === PP[i])) nan++;
      parts.forEach(function (l, n) {
        var ax = 0, ay = 0, az = 0, vol = 0, at = 0, p = PP;
        for (var q = l.i0; q < l.i1; q += 3) {
          var a = PI_[q] * 3, b = PI_[q + 1] * 3, c = PI_[q + 2] * 3;
          var ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
          var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          ax += nx; ay += ny; az += nz; at += Math.sqrt(nx * nx + ny * ny + nz * nz); vol += (p[a] * nx + p[a + 1] * ny + p[a + 2] * nz) / 6;
        }
        var leak = Math.sqrt(ax * ax + ay * ay + az * az) / (at || 1); worst = Math.max(worst, leak);
        out.push({ part: n, leak: leak, vol: vol });
      });
      return { leak: worst, minVol: Math.min.apply(null, out.map(function (o) { return o.vol; })), nan: nan, parts: out };
    }
    return { geo: geo, build: build, colour: colour, solid: solid, verts: nVert, tris: PI_.length / 3 };
  }

  /* ============================== small geometry helpers ============================== */
  // merge several geometries (with a matrix and a colour each) into one indexed geometry: position, normal, color
  function merge(T, list) {
    var P = [], N = [], C = [], I = [], nm = new T.Matrix3(), v = new T.Vector3();
    list.forEach(function (it) {
      var g = it.g, m = it.m || new T.Matrix4(), col = new T.Color(it.c), base = P.length / 3;
      if (!g.attributes.normal) g.computeVertexNormals();
      var pa = g.attributes.position, na = g.attributes.normal, i;
      nm.getNormalMatrix(m);
      for (i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m); P.push(v.x, v.y, v.z);
        v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
        C.push(col.r, col.g, col.b);
      }
      if (g.index) for (i = 0; i < g.index.count; i++) I.push(base + g.index.getX(i)); else for (i = 0; i < pa.count; i++) I.push(base + i);
      g.dispose();
    });
    var out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
    out.setAttribute('color', new T.Float32BufferAttribute(C, 3)); out.setIndex(I);
    return out;
  }

  function frame(f, A) {
    var vf = f.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * A), az = f.az || 0, el = f.el || 0;
    var wEff = f.w * Math.abs(Math.cos(az)) + (f.d || 0) * Math.abs(Math.sin(az));
    var dist = Math.max(wEff / 2 / Math.tan(hf), f.h / 2 / Math.tan(vf)) / (f.fill || .8);
    var up = (f.oy || 0) * 2 * dist * Math.tan(vf), right = (f.ox || 0) * 2 * dist * Math.tan(hf);
    var lx = f.c[0] - right * Math.cos(az), ly = f.c[1] - up, lz = f.c[2] + right * Math.sin(az);
    return [lx + Math.sin(az) * Math.cos(el) * dist, ly + Math.sin(el) * dist, lz + Math.cos(az) * Math.cos(el) * dist, lx, ly, lz, f.fov];
  }
  function blend(L, P, q) {
    var out = {}, k;
    for (k in L) { if (L[k] instanceof Array) out[k] = L[k].map(function (v, i) { return lerp(P[k] ? P[k][i] : v, v, q); }); else out[k] = lerp(P[k] != null ? P[k] : L[k], L[k], q); }
    for (k in P) if (!(k in out)) out[k] = P[k] instanceof Array ? P[k] : lerp(P[k], 0, q);
    return out;
  }
  // the Ravel storage unit: white ribbed walls, light grey floor, steel frame, white double door, hasp and a yellow padlock, cyan seal
  function makeUnit(X, parent, dims, items) {
    var T = X.T, R = X.R, canvasTex = X.canvasTex, radial = X.radial, quad = X.quad, addMat = X.addMat, softTex = X.softTex;
    if (!Q_INV) Q_INV = new T.Quaternion();
    var UW = dims.w, UD = dims.d, UH = dims.h, ZF = UD / 2 + .035;
    var DW = Math.min(1.8, UW - .8), DH = Math.min(2.3, UH - .55);
    function panelTex(w, h, m) {
      var c = R.mk(w, h), g = c.getContext('2d'); g.fillStyle = '#F3F5F6'; g.fillRect(0, 0, w, h); R.paint.ribs(g, 0, 0, w, h, w / (m / .104), .05);
      var ao = g.createLinearGradient(0, 0, 0, h); ao.addColorStop(0, 'rgba(30,40,52,.10)'); ao.addColorStop(.1, 'rgba(30,40,52,0)'); ao.addColorStop(.86, 'rgba(30,40,52,0)'); ao.addColorStop(1, 'rgba(30,40,52,.16)');
      g.fillStyle = ao; g.fillRect(0, 0, w, h); var t = canvasTex(c); t.anisotropy = 4; return t;
    }
    var wTex = panelTex(512, 512, 3.2);
    var wallMat = new T.MeshLambertMaterial({ map: wTex }), inMat = new T.MeshLambertMaterial({ map: wTex, color: 0xE4E8EC, side: T.BackSide });
    var whiteMat = new T.MeshLambertMaterial({ color: 0xF4F6F8 }), steelMat = new T.MeshPhongMaterial({ color: 0x8F979F, specular: 0xffffff, shininess: 90 });
    var fc = R.mk(256, 256), fg = fc.getContext('2d'); fg.fillStyle = '#D9DDE0'; fg.fillRect(0, 0, 256, 256);
    var fr = fg.createRadialGradient(128, 160, 20, 128, 128, 190); fr.addColorStop(0, 'rgba(255,255,255,.55)'); fr.addColorStop(.6, 'rgba(255,255,255,0)'); fr.addColorStop(1, 'rgba(40,50,64,.3)'); fg.fillStyle = fr; fg.fillRect(0, 0, 256, 256);
    var slabG = new T.Group(); parent.add(slabG);
    var fl = new T.Mesh(new T.PlaneGeometry(UW, UD), new T.MeshBasicMaterial({ map: canvasTex(fc) })); fl.rotation.x = -Math.PI / 2; fl.position.y = .014; slabG.add(fl);
    var plinth = new T.Mesh(merge(T, [
      { g: new T.BoxGeometry(UW + .16, .06, .02), m: new T.Matrix4().makeTranslation(0, .03, -UD / 2 - .075), c: NAVY },
      { g: new T.BoxGeometry(.02, .06, UD + .16), m: new T.Matrix4().makeTranslation(-UW / 2 - .075, .03, 0), c: NAVY },
      { g: new T.BoxGeometry(.02, .06, UD + .16), m: new T.Matrix4().makeTranslation(UW / 2 + .075, .03, 0), c: NAVY },
      { g: new T.BoxGeometry((UW - DW) / 2 - .06, .06, .02), m: new T.Matrix4().makeTranslation(-(UW + DW) / 4 - .05, .03, UD / 2 + .075), c: NAVY },
      { g: new T.BoxGeometry((UW - DW) / 2 - .06, .06, .02), m: new T.Matrix4().makeTranslation((UW + DW) / 4 + .05, .03, UD / 2 + .075), c: NAVY }
    ]), new T.MeshLambertMaterial({ vertexColors: true })); slabG.add(plinth);
    var walls = [];
    function wall(w, h, d, x, z, mat) { var g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); var m = new T.Mesh(g, mat || wallMat); m.position.set(x, 0, z); parent.add(m); walls.push(m); return m; }
    var shellG = new T.BoxGeometry(UW, UH, UD); shellG.translate(0, UH / 2, 0); var shell = new T.Mesh(shellG, inMat); parent.add(shell);
    wall(UW, UH, .07, 0, -UD / 2 - .035);
    wall(.07, UH, UD + .14, -UW / 2 - .035, 0); wall(.07, UH, UD + .14, UW / 2 + .035, 0);
    wall((UW - DW) / 2, UH, .07, -(UW + DW) / 4, ZF); wall((UW - DW) / 2, UH, .07, (UW + DW) / 4, ZF);
    var header = new T.Mesh(new T.BoxGeometry(DW, UH - DH, .07), wallMat); header.position.set(0, (UH + DH) / 2, ZF); parent.add(header);
    var roof = new T.Mesh(new T.BoxGeometry(UW + .14, .08, UD + .14), whiteMat); roof.position.y = UH + .04; parent.add(roof);
    var frame = new T.Mesh(merge(T, [
      { g: new T.BoxGeometry(.06, DH, .1), m: new T.Matrix4().makeTranslation(-DW / 2 - .03, DH / 2, 0), c: 0xAEB5BC },
      { g: new T.BoxGeometry(.06, DH, .1), m: new T.Matrix4().makeTranslation(DW / 2 + .03, DH / 2, 0), c: 0xAEB5BC },
      { g: new T.BoxGeometry(DW + .12, .06, .1), m: new T.Matrix4().makeTranslation(0, DH + .03, 0), c: 0xAEB5BC },
      { g: new T.BoxGeometry(.56, .2, .02), m: new T.Matrix4().makeTranslation(0, DH + .38, .05), c: NAVY },
      { g: new T.BoxGeometry(DW + .12, .014, .012), m: new T.Matrix4().makeTranslation(0, DH + .085, .045), c: CYAN }
    ]), new T.MeshPhongMaterial({ vertexColors: true, specular: 0x888888, shininess: 80 })); frame.position.z = ZF + .01; parent.add(frame);
    function leafTex(flip) {
      var c = R.mk(256, 512), g = c.getContext('2d'); g.fillStyle = '#F4F5F6'; g.fillRect(0, 0, 256, 512); R.paint.ribs(g, 0, 0, 256, 512, 32, .05);
      var sh = g.createLinearGradient(0, 0, 0, 512); sh.addColorStop(0, 'rgba(0,0,0,.05)'); sh.addColorStop(.12, 'rgba(0,0,0,0)'); sh.addColorStop(.86, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.09)');
      g.fillStyle = sh; g.fillRect(0, 0, 256, 512); g.fillStyle = '#9299A0'; [70, 256, 440].forEach(function (y) { g.fillRect(flip ? 248 : 0, y - 16, 8, 32); });
      g.strokeStyle = 'rgba(21,34,73,.22)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 253, 509); return canvasTex(c);
    }
    function leaf(side) {
      var piv = new T.Group(); piv.position.set(side * DW / 2, 0, ZF + .05); parent.add(piv);
      var lm = new T.MeshLambertMaterial({ map: leafTex(side > 0) });
      var m = new T.Mesh(new T.BoxGeometry(DW / 2 - .006, DH - .02, .045), lm); m.position.set(-side * (DW / 4), DH / 2, 0); piv.add(m); return piv;
    }
    var doorL = leaf(-1), doorR = leaf(1);
    // the lock: staple on the left leaf, hasp on the right leaf, a yellow padlock through the staple
    var LY = 1.12, LZ = ZF + .05 + .0225;
    var lockG = new T.Group(); lockG.position.set(0, LY, LZ); parent.add(lockG);
    var staple = new T.Mesh(merge(T, [
      { g: new T.BoxGeometry(.05, .09, .006), m: new T.Matrix4().makeTranslation(-.07, 0, .003), c: 0xAEB5BC },
      { g: new T.TorusGeometry(.018, .005, 8, 16, Math.PI), m: new T.Matrix4().makeRotationX(Math.PI / 2).premultiply(new T.Matrix4().makeTranslation(-.07, 0, .008)), c: 0xC3C9CF }
    ]), new T.MeshPhongMaterial({ vertexColors: true, specular: 0xffffff, shininess: 90 })); lockG.add(staple);
    var haspBase = new T.Mesh(new T.BoxGeometry(.045, .075, .006), steelMat); haspBase.position.set(.085, 0, .003); lockG.add(haspBase);
    var haspPiv = new T.Group(); haspPiv.position.set(.07, 0, .012); lockG.add(haspPiv);
    var haspArmG = new T.BoxGeometry(.15, .036, .005); haspArmG.translate(-.07, 0, 0);
    var haspArm = new T.Mesh(haspArmG, steelMat); haspPiv.add(haspArm);
    var padG = new T.Group(); lockG.add(padG);
    var padShape = new T.Shape(), px0 = -.05, py0 = -.045, pw = .1, ph = .09, prr = .016;
    padShape.moveTo(px0 + prr, py0); padShape.lineTo(px0 + pw - prr, py0); padShape.quadraticCurveTo(px0 + pw, py0, px0 + pw, py0 + prr); padShape.lineTo(px0 + pw, py0 + ph - prr); padShape.quadraticCurveTo(px0 + pw, py0 + ph, px0 + pw - prr, py0 + ph);
    padShape.lineTo(px0 + prr, py0 + ph); padShape.quadraticCurveTo(px0, py0 + ph, px0, py0 + ph - prr); padShape.lineTo(px0, py0 + prr); padShape.quadraticCurveTo(px0, py0, px0 + prr, py0);
    var bodyG = new T.ExtrudeGeometry(padShape, { depth: .03, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 3, curveSegments: 6 }); bodyG.translate(0, 0, -.015);
    var padBody = new T.Mesh(bodyG, new T.MeshPhongMaterial({ color: 0xFFC83D, specular: 0xffffff, shininess: 85, emissive: 0x3A2A00, emissiveIntensity: .25 }));
    padBody.position.set(0, -.075, 0); padG.add(padBody);
    var keyhole = new T.Mesh(new T.CircleGeometry(.007, 12), new T.MeshBasicMaterial({ color: 0x2A2A2A })); keyhole.position.set(0, -.085, .022); padG.add(keyhole);
    var shackle = new T.Group(); shackle.position.set(-.03, -.03, 0); padG.add(shackle);
    var shG = merge(T, [
      { g: new T.TorusGeometry(.03, .0075, 10, 20, Math.PI), m: new T.Matrix4().makeTranslation(.03, .045, 0), c: 0xC9CED3 },
      { g: new T.CylinderGeometry(.0075, .0075, .06, 10), m: new T.Matrix4().makeTranslation(0, .015, 0), c: 0xC9CED3 },
      { g: new T.CylinderGeometry(.0075, .0075, .06, 10), m: new T.Matrix4().makeTranslation(.06, .015, 0), c: 0xC9CED3 }
    ]);
    var shMesh = new T.Mesh(shG, new T.MeshPhongMaterial({ vertexColors: true, specular: 0xffffff, shininess: 100 })); shackle.add(shMesh);
    padG.position.set(-.07, -.005, .016);
    var star = (function () { var c = R.mk(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(255,255,255,.5)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(64, 0); g.lineTo(67, 61); g.lineTo(128, 64); g.lineTo(67, 67); g.lineTo(64, 128); g.lineTo(61, 67); g.lineTo(0, 64); g.lineTo(61, 61); g.closePath(); g.fill(); return canvasTex(c); })();
    var glint = quad(addMat({ map: star, fog: false }), 8); parent.add(glint);
    // furniture, drawn by the viewer's own code
    var itemsMesh = null;
    if (items && items.length) { var b = new R.BoxBatch(T); items.forEach(function (it) { R.addItem(b, it); }); itemsMesh = b.mesh(new T.MeshLambertMaterial({ vertexColors: true })); parent.add(itemsMesh); }
    var led = new T.Mesh(new T.BoxGeometry(.1, .02, Math.min(1.6, UD * .5)), new T.MeshBasicMaterial({ color: 0xffffff })); led.position.set(0, UH - .02, 0); parent.add(led);
    var inside = new T.PointLight(0xffffff, .55, 9, 1.4); inside.position.set(0, UH - .4, .2); parent.add(inside);
    var inGlow = quad(addMat({ map: softTex, color: 0xFFFFFF, opacity: 0 }), 4); inGlow.rotation.x = -Math.PI / 2; inGlow.position.set(0, .02, ZF + 1.0); inGlow.scale.set(DW * 1.5, 2.4, 1); parent.add(inGlow);
    var ush = quad(new T.MeshBasicMaterial({ map: radial(128, [[0, 'rgba(21,34,73,.42)'], [.45, 'rgba(21,34,73,.26)'], [1, 'rgba(21,34,73,0)']]), transparent: true, depthWrite: false }), 2);
    ush.rotation.x = -Math.PI / 2; ush.position.y = .008; ush.scale.set(UW + 3, UD + 3, 1); parent.add(ush);
    // the seal: a thin cyan line runs from the lock out to the frame, up both sides and meets at the top
    var sealMat = new T.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, depthWrite: false, fog: false }), sx = DW / 2 + .12, sy = DH + .12, segs = [];
    function sline(x0, y0, x1, y1, z) { var m = new T.Mesh(new T.PlaneGeometry(1, 1), sealMat); m.renderOrder = 7; m.userData = { a: [x0, y0], b: [x1, y1], z: z, len: Math.abs(x1 - x0) + Math.abs(y1 - y0) }; parent.add(m); segs.push(m); return m; }
    [-1, 1].forEach(function (s) { sline(s * .14, LY, s * sx, LY, LZ + .004); sline(s * sx, LY, s * sx, sy, ZF + .07); sline(s * sx, sy, 0, sy, ZF + .07); });
    var ring = quad(new T.MeshBasicMaterial({ map: (function () { var c = R.mk(256, 256), g = c.getContext('2d'); g.strokeStyle = '#2EC5FF'; g.lineWidth = 5; g.shadowColor = '#2EC5FF'; g.shadowBlur = 10; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.stroke(); return canvasTex(c); })(), transparent: true, depthWrite: false, opacity: 0, fog: false }), 3);
    ring.rotation.x = -Math.PI / 2; ring.position.y = .02; parent.add(ring);
    return { group: parent, ZF: ZF, UW: UW, UD: UD, UH: UH, slabG: slabG, walls: walls, shell: shell, header: header, roof: roof, frame: frame, doorL: doorL, doorR: doorR, lockG: lockG, haspPiv: haspPiv, padG: padG, padBody: padBody, shackle: shackle, glint: glint,
      items: itemsMesh, led: led, inside: inside, inGlow: inGlow, ush: ush, segs: segs, sealMat: sealMat, ring: ring, staple: staple, haspBase: haspBase, DW: DW, DH: DH, LY: LY, LZ: LZ };
  }
  // the unit's own moves, from a schedule: b build, o doors open, i contents rise, c doors close, l lock (hasp, padlock, click, glint, seal, ring)
  function animUnit(U4, t, S, cam) {
    var b0 = S.b, i, ub = seg(t, b0, b0 + .35);
    U4.slabG.scale.set(out3(ub) || .001, 1, out3(ub) || .001);
    U4.walls.forEach(function (m, n) { var g = out3(seg(t, b0 + .2 + n * .08, b0 + .7 + n * .08)); m.scale.y = g || .001; m.visible = g > 0; });
    var sg = out3(seg(t, b0 + .2, b0 + .9)); U4.shell.scale.y = sg || .001; U4.shell.visible = sg > 0;
    var hg = out3(seg(t, b0 + .5, b0 + .9)); U4.header.visible = U4.frame.visible = hg > 0; U4.header.scale.y = U4.frame.scale.y = hg || .001;
    var rg = tw(t, b0 + .7, b0 + 1.15, out3); U4.roof.visible = rg > 0; U4.roof.position.z = (1 - rg) * -(U4.UD + 1); U4.roof.position.y = U4.UH + .04 + (1 - rg) * .6;
    var c0 = S.c, dOpen = tw(t, S.o, S.o + .7, out3), cL = tw(t, c0, c0 + .9), cR = tw(t, c0 + .25, c0 + 1.15);
    var setL = .035 * Math.sin(Math.PI * seg(t, c0 + .7, c0 + 1.05)), setR = .035 * Math.sin(Math.PI * seg(t, c0 + .95, c0 + 1.3));
    U4.doorL.visible = U4.doorR.visible = hg > .98;
    var ang = S.ang || 1.85; U4.doorL.rotation.y = -(dOpen * (1 - cL) * ang - setL); U4.doorR.rotation.y = dOpen * (1 - cR) * ang - setR;
    if (U4.items) { var it = tw(t, S.i, S.i + .6, out3); U4.items.visible = it > 0; U4.items.scale.set(1, it || .001, 1); }
    var inL = dOpen * (1 - cR); U4.inside.intensity = .55 * Math.max(.15, inL); U4.inGlow.visible = inL > .01 && S.glow !== 0; U4.inGlow.material.opacity = .45 * inL;
    U4.led.visible = rg > 0;
    var l0 = S.l, hasp = tw(t, l0, l0 + .25, out3), arrive = tw(t, l0 + .3, l0 + .55, out3), swing = tw(t, l0 + .55, l0 + .7), home = tw(t, l0 + .7, l0 + .8, back);
    U4.staple.visible = U4.haspBase.visible = U4.haspPiv.visible = cR >= 1 || t > l0 - .05;
    U4.haspPiv.rotation.z = (1 - hasp) * -Math.PI / 2;
    U4.padG.visible = arrive > 0;
    U4.padG.position.set(-.07, -.005 + .12 * (1 - arrive), .016 + .12 * (1 - arrive));
    U4.shackle.position.y = -.03 + .028 * (1 - home); U4.shackle.rotation.y = -(1 - swing) * 1.9;
    U4.padG.rotation.z = .021 * Math.sin(Math.PI * 2 * seg(t, l0 + .72, l0 + 1.0)) * (1 - seg(t, l0 + .72, l0 + 1.0));
    var gl = bell(seg(t, l0 + .75, l0 + 1.05)); U4.glint.visible = gl > 0;
    if (gl > 0) { U4.glint.position.set(-.04, U4.LY + .03, U4.LZ + .06); U4.glint.quaternion.copy(cam.quaternion); if (U4.group.parent) U4.glint.quaternion.premultiply(Q_INV.copy(U4.group.quaternion).invert()); U4.glint.material.opacity = gl; U4.glint.scale.setScalar(.12 + .1 * gl); }
    var sl = seg(t, l0 + .8, l0 + 1.4), sf = 1 - seg(t, l0 + 1.5, l0 + 2.0);
    U4.sealMat.opacity = sf * (sl > 0 ? .95 : 0);
    var total = U4.segs[0].userData.len + U4.segs[1].userData.len + U4.segs[2].userData.len, run = sl * total;
    for (i = 0; i < 6; i++) {
      var sm = U4.segs[i], u2 = sm.userData, before = 0; for (var q = i - (i % 3); q < i; q++) before += U4.segs[q].userData.len;
      var f2 = clamp((run - before) / u2.len, 0, 1); sm.visible = f2 > 0 && sf > 0;
      if (f2 > 0) {
        var x1 = lerp(u2.a[0], u2.b[0], f2), y1 = lerp(u2.a[1], u2.b[1], f2), hz = u2.a[1] === u2.b[1];
        sm.position.set((u2.a[0] + x1) / 2, (u2.a[1] + y1) / 2, u2.z); sm.scale.set(hz ? Math.abs(x1 - u2.a[0]) + .012 : .012, hz ? .012 : Math.abs(y1 - u2.a[1]) + .012, 1);
      }
    }
    var rs = seg(t, l0 + .9, l0 + 1.9); U4.ring.visible = rs > 0 && rs < 1; U4.ring.material.opacity = .7 * Math.sin(Math.PI * Math.min(1, rs * 1.6)) * (1 - rs);
    U4.ring.scale.setScalar(lerp(5.4, 11, out3(rs)));
    return { door: dOpen * (1 - Math.max(cL, cR)), lock: home };
  }
  var Q_INV = null;
  /* ============================== the 3D film ============================== */
  function createEngine(host, o) {
    var T = W.THREE, R = W.RV3D;
    var canvas = doc.createElement('canvas'); canvas.className = 'mfilm__gl'; host.appendChild(canvas);
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: !o.low, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.manual });
    renderer.localClippingEnabled = true; renderer.setClearColor(0x081226, 1);
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(32, 1, .1, 1500);
    scene.fog = new T.Fog(0x1A2550, 30, 130);
    var extra = [], dead = false;
    var PL_UP = new T.Plane(new T.Vector3(0, 1, 0), 0), PL_DN = new T.Plane(new T.Vector3(0, -1, 0), 0);
    var V1 = new T.Vector3(), V2 = new T.Vector3(), V3 = new T.Vector3(), Q1 = new T.Quaternion(), Q2 = new T.Quaternion(), M1 = new T.Matrix4();
    var AX = new T.Vector3(1, 0, 0), AY = new T.Vector3(0, 1, 0), AZ = new T.Vector3(0, 0, 1);
    var cA = new T.Color(), cB = new T.Color();
    function mixHex(a, b, k) { return cA.setHex(a).lerp(cB.setHex(b), k).getHex(); }
    function canvasTex(c) { var t = new T.CanvasTexture(c); extra.push(t); return t; }
    function radial(size, stops) {
      var c = R.mk(size, size), g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); g.fillStyle = gr; g.fillRect(0, 0, size, size); return canvasTex(c);
    }
    function quad(mat, ro) { var m = new T.Mesh(new T.PlaneGeometry(1, 1), mat); if (ro != null) m.renderOrder = ro; return m; }
    function addMat(o2) { var p = { transparent: true, blending: T.AdditiveBlending, depthWrite: false }; for (var k in o2) p[k] = o2[k]; return new T.MeshBasicMaterial(p); }

    /* ---------- lights ---------- */
    var hemi = new T.HemisphereLight(0xFFE2B0, 0x16224A, .55), key = new T.DirectionalLight(0xFFF4E0, 1), rim = new T.DirectionalLight(CYAN, .55);
    key.position.set(-14, 22, 26); rim.position.set(20, 10, -24);
    var sweep = new T.PointLight(0xFFF1D6, 0, 16, 1.2); sweep.position.set(-10, 4, 6);
    scene.add(hemi); scene.add(key); scene.add(rim); scene.add(sweep);

    /* ---------- sky dome, floor, haze ---------- */
    var domeGeo = new T.SphereGeometry(600, 32, 16), domeCol = new Float32Array(domeGeo.attributes.position.count * 3), skyKey = '';
    domeGeo.setAttribute('color', new T.BufferAttribute(domeCol, 3));
    var dome = new T.Mesh(domeGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -10; scene.add(dome);
    var cz = new T.Color(), chz = new T.Color(), tmpC = new T.Color();
    function sky(zen, hor) {
      var k2 = zen + ':' + hor; if (k2 === skyKey) return; skyKey = k2;
      cz.setHex(zen); chz.setHex(hor); var p = domeGeo.attributes.position;
      for (var i = 0; i < p.count; i++) { var e = clamp(p.getY(i) / 600, 0, 1), k = Math.pow(e, .55); tmpC.copy(chz).lerp(cz, k); domeCol[i * 3] = tmpC.r; domeCol[i * 3 + 1] = tmpC.g; domeCol[i * 3 + 2] = tmpC.b; }
      domeGeo.attributes.color.needsUpdate = true;
    }
    var floorTex = radial(256, [[0, '#ffffff'], [.12, '#dfe3ee'], [.4, '#7d86a6'], [1, '#4a5276']]);
    var floorMat = new T.MeshBasicMaterial({ color: 0x0E1A3A, map: floorTex, transparent: true, opacity: .8, depthWrite: false });
    var floor = new T.Mesh(new T.CircleGeometry(300, 64), floorMat); floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1; scene.add(floor);
    var glowTex = radial(128, [[0, 'rgba(255,255,255,1)'], [.3, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]);
    var softTex = radial(128, [[0, 'rgba(255,255,255,1)'], [.55, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
    var blobTex = radial(128, [[0, 'rgba(4,10,26,.62)'], [.5, 'rgba(4,10,26,.3)'], [1, 'rgba(4,10,26,0)']]);
    var haze = quad(addMat({ map: glowTex, color: 0xFF9A1C, fog: false }), 2); haze.position.set(0, 3, -14); haze.scale.set(70, 22, 1); scene.add(haze);

    /* ---------- the word ---------- */
    var U = { wipe: { value: -100 }, wipeW: { value: 1.1 }, dim: { value: 1 } }, wipeOK = true;
    function wordMat(col, to, up) {
      var m = new T.MeshPhongMaterial({ color: col, specular: 0x6A5A40, shininess: 70, emissive: col, emissiveIntensity: .1, clippingPlanes: [up ? PL_UP : PL_DN] });
      m.onBeforeCompile = function (sh) {
        sh.uniforms.uWipe = U.wipe; sh.uniforms.uWipeW = U.wipeW; sh.uniforms.uDim = U.dim; sh.uniforms.uTo = { value: new T.Color(to) }; sh.uniforms.uEdge = { value: new T.Color(CYAN) };
        var vs = sh.vertexShader, fs = sh.fragmentShader;
        if (vs.indexOf('#include <begin_vertex>') < 0 || fs.indexOf('#include <color_fragment>') < 0 || fs.indexOf('#include <emissivemap_fragment>') < 0) { wipeOK = false; return; }
        sh.vertexShader = vs.replace('#include <common>', '#include <common>\nvarying float vWx;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 rvW = modelMatrix * vec4(transformed, 1.0);\nvWx = rvW.x + abs(rvW.y) * .35;');
        sh.fragmentShader = fs.replace('#include <common>', '#include <common>\nvarying float vWx;\nuniform float uWipe, uWipeW, uDim;\nuniform vec3 uTo, uEdge;')
          .replace('#include <color_fragment>', '#include <color_fragment>\nfloat wk = smoothstep(uWipe + uWipeW, uWipe, vWx);\ndiffuseColor.rgb = mix(diffuseColor.rgb, uTo, wk) * uDim;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat we = exp(-abs(vWx - uWipe - uWipeW * .5) * 3.2 / uWipeW) * step(-90.0, uWipe) * step(uWipe, 90.0);\ntotalEmissiveRadiance = mix(totalEmissiveRadiance, uTo * .14, wk) * uDim + uEdge * we * .9;');
      };
      return m;
    }
    var matFace = wordMat(MANGO, NAVY, true), matSide = wordMat(MANGO_D, NAVY_D, true), mirFace = wordMat(MANGO, NAVY, false), mirSide = wordMat(MANGO_D, NAVY_D, false);
    function area(c) { var a = 0, x0, y0, x, y, i = 0, px = null, py; while (i < c.length) { var op = c[i]; if (op === 'M' || op === 'L') { x = c[i + 1]; y = c[i + 2]; i += 3; } else { x = c[i + 3]; y = c[i + 4]; i += 5; } if (px != null) a += px * y - x * py; else { x0 = x; y0 = y; } px = x; py = y; } return (a + px * y0 - x0 * py) / 2; }
    function trace(path, c) { var i = 0; while (i < c.length) { var op = c[i]; if (op === 'M') { path.moveTo(c[i + 1], c[i + 2]); i += 3; } else if (op === 'L') { path.lineTo(c[i + 1], c[i + 2]); i += 3; } else { path.quadraticCurveTo(c[i + 1], c[i + 2], c[i + 3], c[i + 4]); i += 5; } } path.closePath(); }
    function letterGeo(ch) {
      var shapes = [], holes = [];
      GLY[ch].c.forEach(function (c) { if (area(c) < 0) { var s = new T.Shape(); trace(s, c); shapes.push(s); } else { var h = new T.Path(); trace(h, c); holes.push(h); } });
      holes.forEach(function (h) { shapes[0].holes.push(h); });
      var g = new T.ExtrudeGeometry(shapes, { depth: DEPTH - 2 * BEV, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelOffset: -BEV, bevelSegments: 3, curveSegments: 10 });
      g.translate(0, 0, -(DEPTH - 2 * BEV) / 2); return g;
    }
    var LT = wordLayout('TRAVEL'), LR = wordLayout('RAVEL'), letters = [];
    var word = new T.Group(); word.scale.setScalar(H); scene.add(word);
    var mirror = new T.Group(); mirror.scale.set(H, -H, H); scene.add(mirror);
    'RAVEL'.split('').forEach(function (ch, i) {
      var g = letterGeo(ch), m = new T.Mesh(g, [matFace, matSide]), m2 = new T.Mesh(g, [mirFace, mirSide]);
      m.userData = { x0: LT.pos[i + 1], x1: LR.pos[i] }; word.add(m); mirror.add(m2); letters.push([m, m2]);
    });
    var wordShadow = quad(new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0 }), 2);
    wordShadow.rotation.x = -Math.PI / 2; wordShadow.position.set(0, .01, .2); wordShadow.scale.set(17, 2.6, 1); scene.add(wordShadow);
    var RAVEL_R = (LR.pos[4] + GLY.L.c[0][13]) * H, RAVEL_L = (LR.pos[0] + .1) * H;

    /* ---------- the T / aeroplane ---------- */
    var PL = makePlane(T);
    var planeMat = new T.MeshPhongMaterial({ vertexColors: true, specular: 0x6A5A40, shininess: 70, emissive: 0x332200, emissiveIntensity: .25, clippingPlanes: [PL_UP] });
    var planeMirMat = planeMat.clone(); planeMirMat.clippingPlanes = [PL_DN]; planeMirMat.transparent = true; planeMirMat.depthWrite = false;
    var plane = new T.Mesh(PL.geo, planeMat), planeMir = new T.Mesh(PL.geo, planeMirMat);
    plane.frustumCulled = planeMir.frustumCulled = false; scene.add(plane); scene.add(planeMir);
    var planeShadow = quad(new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0 }), 2); planeShadow.rotation.x = -Math.PI / 2; scene.add(planeShadow);
    var QB = new T.Quaternion(-.5, -.5, -.5, .5), TXL = LT.pos[0] + TG.cx;
    var lastK = -1, lastGear = -1, lastGlow = -1;
    // the airstair door, a child of the aeroplane (local units: cap heights; x = span, y = nose, z = up)
    var DOOR_Y = .3, stair = new T.Group(); stair.position.set(.088, DOOR_Y, -.045); plane.add(stair);
    var stairMat = new T.MeshPhongMaterial({ color: 0xF2EFE8, specular: 0x333333, shininess: 30 });
    var slab = new T.Mesh(merge(T, (function () {
      var L2 = [{ g: new T.BoxGeometry(.008, .09, .18), m: new T.Matrix4().makeTranslation(.004, 0, .09), c: 0xF2EFE8 }];
      for (var s = 0; s < 5; s++) L2.push({ g: new T.BoxGeometry(.016, .084, .005), m: new T.Matrix4().makeTranslation(-.005, 0, .025 + s * .032), c: 0xDCDFE3 });
      L2.push({ g: new T.BoxGeometry(.022, .006, .18), m: new T.Matrix4().makeTranslation(-.01, .045, .09), c: 0xF2EFE8 });
      L2.push({ g: new T.BoxGeometry(.022, .006, .18), m: new T.Matrix4().makeTranslation(-.01, -.045, .09), c: 0xF2EFE8 });
      return L2;
    })()), new T.MeshPhongMaterial({ vertexColors: true, specular: 0x333333, shininess: 30 }));
    stairMat.dispose(); stair.add(slab);
    var doorGlow = quad(addMat({ map: softTex, color: 0xFFD08A }), 6); doorGlow.position.set(.1, DOOR_Y, .02); doorGlow.rotation.y = Math.PI / 2; doorGlow.scale.set(.12, .18, 1); plane.add(doorGlow);
    var engGlow = [0, 1].map(function () { var m = quad(addMat({ map: glowTex, color: 0xFFC27A, fog: false }), 6); scene.add(m); return m; });
    var groundLight = quad(addMat({ map: softTex, color: 0xFFB866, opacity: 0 }), 3); groundLight.rotation.x = -Math.PI / 2; scene.add(groundLight);
    var doorFlare = quad(addMat({ map: glowTex, color: 0xFFE2B0, fog: false }), 7); scene.add(doorFlare);

    // the pure path of the aeroplane: position, attitude and scale at any time
    var PK = [
      { t: 3.4, v: [TXL * H, PIVOT * H, 0], hold: 1 },
      { t: 4.3, v: [TXL * H - .3, PIVOT * H + 1.4, 2.4] },
      { t: 5.45, v: [-10.4, 6.4, 8.2] },
      { t: 6.6, v: [-8, 1.56, 15], hold: 1 }
    ];
    tangents(PK);
    var stP = { p: new T.Vector3(), q: new T.Quaternion(), s: 1 }, tmpS = { p: new T.Vector3(), q: new T.Quaternion(), s: 1 }, hv = [0, 0, 0];
    function entrance(t, i) { var a = .25 + i * .11, e = back(seg(t, a, a + .95)); return { y: (1 - e) * -.9, rx: (1 - e) * -1.396, sc: .92 + .08 * Math.min(e, 1.03), on: t > a }; }
    function planeState(t, st) {
      if (t < 3.4) {
        var e = entrance(t, 0), lift = .04 * Math.sin(Math.PI * seg(t, 3.0, 3.4));
        Q1.setFromAxisAngle(AX, e.rx); V1.set(TG.cx, PIVOT, 0).multiplyScalar(H * e.sc).applyQuaternion(Q1);
        st.p.set(LT.pos[0] * H + V1.x, e.y * H + V1.y + lift, V1.z); st.q.copy(Q1); st.s = H * e.sc; return st;
      }
      if (t < 9.8) {
        herm(PK, t, hv); st.p.set(hv[0], hv[1], hv[2]);
        var a = io(seg(t, 4.5, 6.6)); Q1.set(0, 0, 0, 1).slerp(QB, a);
        Q2.setFromAxisAngle(AY, .14 * io(seg(t, 3.4, 4.3)) * (1 - a)); st.q.copy(Q2).multiply(Q1);
        st.s = H * (1 + 1.6 * io(seg(t, 5.0, 6.6)));
        var u = seg(t, 6.6, 7.2);
        if (u > 0 && u < 1) { var b = Math.sin(Math.PI * u) * Math.exp(-2.2 * u); st.p.y -= .06 * b * 1.8; Q2.setFromAxisAngle(AZ, -.021 * b * 1.8); st.q.premultiply(Q2); }
        return st;
      }
      var s = t - 9.8;
      st.p.set(-8 + 8 * s * s, 1.56 + 9 * Math.pow(Math.max(0, s - .7), 2), 15 - 6 * io(seg(s, .7, 2.0)));
      st.s = H * 2.6;
      Q1.setFromAxisAngle(AZ, .2094 * io(seg(t, 10.5, 10.9))); Q2.setFromAxisAngle(AX, -.14 * io(seg(t, 10.6, 11.3)));
      st.q.copy(Q1).multiply(Q2).multiply(QB);
      return st;
    }
    function localToWorld(st, x, y, z, out) { return out.set(x, y, z).multiplyScalar(st.s).applyQuaternion(st.q).add(st.p); }
    planeState(8, tmpS);
    var DOOR = localToWorld(tmpS, .1, DOOR_Y, .02, new T.Vector3()), DOOR_FOOT = localToWorld(tmpS, .088 + .09, DOOR_Y, -.2, new T.Vector3());
    var JM = new T.Vector3(DOOR.x + 1.25, 0, DOOR.z + 3.7);

    /* ---------- the trail: two ribbons, read from the same path at earlier times ---------- */
    var TN = 48, tPos = new Float32Array(2 * TN * 2 * 3), tCol = new Float32Array(2 * TN * 2 * 3), tUv = new Float32Array(2 * TN * 2 * 2), tIdx = [];
    (function () { for (var r = 0; r < 2; r++) for (var j = 0; j < TN; j++) { var b = (r * TN + j) * 2; tUv[b * 2] = 0; tUv[b * 2 + 1] = j / (TN - 1); tUv[b * 2 + 2] = 1; tUv[b * 2 + 3] = j / (TN - 1); if (j < TN - 1) tIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } })();
    var trailGeo = new T.BufferGeometry(); trailGeo.setAttribute('position', new T.BufferAttribute(tPos, 3)); trailGeo.setAttribute('color', new T.BufferAttribute(tCol, 3)); trailGeo.setAttribute('uv', new T.BufferAttribute(tUv, 2)); trailGeo.setIndex(tIdx);
    var stripe = (function () { var c = R.mk(64, 4), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 4); return canvasTex(c); })();
    var trail = new T.Mesh(trailGeo, addMat({ map: stripe, vertexColors: true, side: T.DoubleSide, fog: false })); trail.frustumCulled = false; trail.renderOrder = 6; scene.add(trail);
    var cWhite = new T.Color(0xFFF6E6), cMangoT = new T.Color(0xFFA020);

    /* ---------- James: a photographed cut-out (main), or a sculpted backlit silhouette (fallback) ---------- */
    var james = new T.Group(); james.position.copy(JM); scene.add(james);
    var jShadow = quad(new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: .8 }), 2); jShadow.rotation.x = -Math.PI / 2; jShadow.position.y = .01; jShadow.scale.set(1.2, .7, 1); james.add(jShadow);
    var rimU = { dir: { value: new T.Vector3(0, 0, -1) }, col: { value: new T.Color(0xFFC98A) }, k: { value: 0 } };
    var jMat = new T.MeshPhongMaterial({ vertexColors: true, specular: 0x111622, shininess: 12 });
    jMat.onBeforeCompile = function (sh) {
      sh.uniforms.uRimDir = rimU.dir; sh.uniforms.uRimCol = rimU.col; sh.uniforms.uRimK = rimU.k;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRimDir, uRimCol;\nuniform float uRimK;')
        .replace('#include <output_fragment>', 'vec3 rvN = normalize(normal);\nfloat rvF = pow(1.0 - clamp(dot(rvN, normalize(vViewPosition)), 0.0, 1.0), 2.6);\nfloat rvD = clamp(dot(rvN, uRimDir) * .7 + .35, 0.0, 1.0);\noutgoingLight += uRimCol * rvF * rvD * uRimK;\n#include <output_fragment>');
    };
    var JH = 2.6, sil = new T.Mesh(buildSilhouette(T), jMat); sil.scale.setScalar(JH / 1.83); james.add(sil);
    var photo = null, photoMat = null, photoTex = null, photoAsp = .413;
    if (o.jamesImg) {
      var img = new Image();
      if (!/^data:/.test(o.jamesImg)) img.crossOrigin = 'anonymous';
      img.onload = function () {
        if (dead || !api) return;
        photoTex = new T.Texture(img); photoTex.needsUpdate = true; photoTex.anisotropy = 4; extra.push(photoTex);
        photoAsp = img.naturalWidth / img.naturalHeight || .413;
        photoMat = new T.MeshBasicMaterial({ map: photoTex, transparent: true, depthWrite: false, alphaTest: .02, side: T.DoubleSide, color: 0x1B2748 });
        var g = new T.PlaneGeometry(1, 1); g.translate(0, .5, 0);
        photo = new T.Mesh(g, photoMat); photo.scale.set(JH * photoAsp, JH, 1); photo.renderOrder = 5; james.add(photo);
        sil.visible = false;
        if (api.onReady) api.onReady();
      };
      img.onerror = function () { /* the silhouette stays */ };
      img.src = o.jamesImg;
    }

    /* ---------- the storage unit ---------- */
    var UW = o.unit && o.unit.w || 3, UD = o.unit && o.unit.d || 4, UH = o.unit && o.unit.h || 3;
    var UX = RAVEL_R + .85 + UW / 2, ZF = UD / 2 + .035, UZ = 1.5 - ZF, ZFW = 1.5;
    var unit = new T.Group(); unit.position.set(UX, 0, UZ); scene.add(unit);
    var U4 = makeUnit({ T: T, R: R, canvasTex: canvasTex, radial: radial, quad: quad, addMat: addMat, softTex: softTex }, unit, { w: UW, d: UD, h: UH }, o.items && o.items.length ? o.items : fallbackItems(UW, UD));

    /* ---------- camera keys (framings), resolved for the screen's shape ---------- */
    var CX_RU = (RAVEL_L + UX + UW / 2) / 2, W_RU = UX + UW / 2 - RAVEL_L, OXS = o.rtl ? -1 : 1;
    function camKeys() {
      planeState(10.7, tmpS); var pf = tmpS.p.clone(); planeState(5.45, tmpS); var p1 = tmpS.p.clone(); planeState(6.1, tmpS); var p2 = tmpS.p.clone();
      return [
        { t: 0, L: { c: [0, 1.5, 0], w: 17.8, h: 3, d: .6, az: -.16, el: .07, fill: .74, fov: 30 }, P: { c: [TXL * H, 1.4, 0], w: 2.8, h: 3, d: .6, az: -.55, el: .06, fill: .74, fov: 40 } },
        { t: 1.9, L: { c: [0, 1.5, 0], w: 17.8, h: 3, d: .6, az: -.11, el: .07, fill: .8, fov: 30 }, P: { c: [-.5, 1.5, 0], w: 17.8, h: 3, d: .6, az: -1.0, el: .1, fill: .9, fov: 42 } },
        { t: 3.4, L: { c: [0, 1.5, 0], w: 17.8, h: 3, d: .6, az: -.06, el: .07, fill: .82, fov: 30 }, P: { c: [-.8, 1.5, 0], w: 17.8, h: 3, d: .6, az: -.96, el: .1, fill: .9, fov: 42 } },
        { t: 4.5, L: { c: [-6.8, 3.5, 2.2], w: 7, h: 5.5, az: -.3, el: .1, fill: .66, fov: 30 }, P: { c: [-7.8, 3.8, 2.4], w: 5, h: 5.5, az: -.55, el: .1, fill: .72, fov: 40 } },
        { t: 5.45, L: { c: [p1.x + .6, p1.y - .3, p1.z], w: 11, h: 7, az: -.18, el: .06, fill: .72, fov: 30 }, P: { c: [p1.x + .3, p1.y - .4, p1.z], w: 8, h: 7, az: -.3, el: .06, fill: .82, fov: 40 } },
        { t: 6.1, L: { c: [p2.x + 1.2, p2.y + .2, p2.z], w: 13, h: 5, az: .22, el: .1, fill: .8, fov: 30 }, P: { c: [p2.x + .9, p2.y + .2, p2.z], w: 10, h: 5, az: .55, el: .14, fill: .9, fov: 40 } },
        { t: 6.6, L: { c: [-7.6, 2.2, 15], w: 13, h: 4.2, d: 2, az: .42, el: .16, fill: .8, fov: 30 }, P: { c: [-7.0, 2.1, 15], w: 8.5, h: 4.4, d: 2, az: .95, el: .2, fill: .9, fov: 40 } },
        { t: 7.45, L: { c: [JM.x - .7, 1.35, JM.z - 1.6], w: 6.2, h: 3.4, d: 2, az: .3, el: .14, fill: .82, fov: 30 }, P: { c: [JM.x - .45, 1.35, JM.z - 1.1], w: 3.4, h: 3.9, d: 1, az: .3, el: .15, fill: .9, fov: 40 } },
        { t: 8.3, pos: [DOOR.x - 3.0, 1.85, DOOR.z + 4.9], look: [DOOR.x - .1, DOOR.y - .2, DOOR.z], fovL: 32, fovP: 42 },
        { t: 8.95, pos: [DOOR.x - 2.0, DOOR.y + .2, DOOR.z + 3.5], look: [DOOR.x - .05, DOOR.y + .05, DOOR.z], fovL: 32, fovP: 42 },
        { t: 8.95, cut: 1, L: { c: [-7, 2.3, 15], w: 14, h: 5, d: 2, az: .14, el: .1, fill: .78, fov: 30 }, P: { c: [-6.4, 2.4, 15], w: 12.5, h: 5, d: 2, az: .5, el: .14, fill: 1, fov: 40 } },
        { t: 9.8, L: { c: [-6.6, 2.4, 15], w: 14.5, h: 5, d: 2, az: .12, el: .1, fill: .76, fov: 30 }, P: { c: [-5.8, 2.5, 15], w: 13, h: 5, d: 2, az: .48, el: .14, fill: 1, fov: 40 } },
        { t: 10.7, L: { c: [pf.x - 2, pf.y * .6 + 1, (pf.z + 4) / 2], w: 22, h: 8, az: .1, el: .09, fill: .9, fov: 30 }, P: { c: [pf.x - 4, pf.y * .6 + 1, (pf.z + 4) / 2], w: 14, h: 8, az: .45, el: .1, fill: 1, fov: 42 } },
        { t: 11.7, L: { c: [1.35, 1.6, 0], w: 17, h: 3.8, d: .6, az: .06, el: .07, fill: .78, fov: 30 }, P: { c: [.5, 1.6, 0], w: 16, h: 3.8, d: .6, az: .5, el: .1, fill: .9, fov: 42 } },
        { t: 12.7, L: { c: [0, 1.5, 0], w: 15.1, h: 3, d: .6, az: .08, el: .07, fill: .72, fov: 30 }, P: { c: [0, 1.5, 0], w: 15.1, h: 3, d: .6, az: .55, el: .1, fill: .84, fov: 42 } },
        { t: 13.6, L: { c: [.3, 1.5, 0], w: 15.1, h: 3, d: .6, az: .11, el: .075, fill: .72, fov: 30 }, P: { c: [.4, 1.5, 0], w: 15.1, h: 3, d: .6, az: .6, el: .1, fill: .84, fov: 42 } },
        { t: 14.7, L: { c: [CX_RU, 1.55, -.2], w: W_RU, h: 3.2, d: UD, az: .16, el: .09, fill: .84, fov: 30 }, P: { c: [UX - 4.4, 1.6, -.2], w: 15, h: 3.4, d: UD, az: .72, el: .12, fill: .96, fov: 42 } },
        { t: 15.8, pos: [UX + .35, 1.62, ZFW + 2.9], look: [UX - .1, 1.25, ZFW - 1.5], fovL: 40, fovP: 52 },
        { t: 16.85, pos: [UX - .45, 1.7, ZFW + 1.8], look: [UX + .25, 1.0, ZFW - 1.9], fovL: 46, fovP: 58 },
        { t: 17.55, pos: [UX + 3.5, 1.7, ZFW + 4.2], look: [UX + .15, 1.25, ZFW], fovL: 34, fovP: 46 },
        { t: 18.35, pos: [UX + 2.2, 1.5, ZFW + 3.4], look: [UX - .05, 1.2, ZFW], fovL: 34, fovP: 46 },
        { t: 19.0, pos: [UX + .22, 1.24, ZFW + 1.2], look: [UX - .07, 1.06, ZFW + .08], fovL: 30, fovP: 38, hold: 1 },
        { t: 19.3, pos: [UX + .21, 1.24, ZFW + 1.16], look: [UX - .07, 1.06, ZFW + .08], fovL: 30, fovP: 38 },
        { t: 20.05, pos: [UX + 1.0, 1.75, ZFW + 5.6], look: [UX, 1.4, ZFW], fovL: 36, fovP: 48 },
        { t: 21.0, L: { c: [CX_RU + .4, 2.0, -.3], w: W_RU, h: 4.2, d: UD, az: .2, el: .14, fill: .5, ox: .2 * OXS, oy: .03, fov: 30 }, P: { c: [UX - 4.3, 2.0, -.2], w: 15, h: 5, d: UD, az: .7, el: .14, fill: .97, ox: .2, oy: .2, fov: 42 } },
        { t: 25.4, L: { c: [CX_RU + .4, 2.0, -.3], w: W_RU, h: 4.2, d: UD, az: .24, el: .15, fill: .5, ox: .2 * OXS, oy: .03, fov: 30 }, P: { c: [UX - 4.3, 2.0, -.2], w: 15, h: 5, d: UD, az: .75, el: .15, fill: .97, ox: .2, oy: .2, fov: 42 }, hold: 1 }
      ];
    }
    var CAMS = [], aspect = 1, jFace = 0;
    function resolveCams() {
      var q = clamp((aspect - .8) / .4, 0, 1), list = camKeys(), segs = [], cur = [];
      list.forEach(function (k) {
        var v = k.pos ? k.pos.concat(k.look, [lerp(k.fovP, k.fovL, q)]) : frame(blend(k.L, k.P || k.L, q), aspect);
        if (k.cut && cur.length) { segs.push(cur); cur = []; }
        cur.push({ t: k.t, v: v, hold: k.hold });
      });
      segs.push(cur); segs.forEach(tangents); CAMS = segs;
      herm(segs[0], 7.6, camV); jFace = Math.atan2(camV[0] - JM.x, camV[2] - JM.z);
    }
    var camV = [0, 0, 0, 0, 0, 0, 0];
    function camera(t) {
      var s = CAMS[0]; for (var i = 1; i < CAMS.length; i++) if (t >= CAMS[i][0].t) s = CAMS[i];
      herm(s, t, camV);
      var dx = .012 * Math.sin(1.7 * t), dy = .012 * Math.sin(2.3 * t + 1);
      var wk = bell(seg(t, 7.85, 8.95)), ph = Math.PI * 1.9 * (t - 7.85);
      cam.position.set(camV[0] + dx, camV[1] + dy + .022 * wk * Math.abs(Math.sin(ph)), camV[2]);
      cam.lookAt(camV[3] + dx, camV[4] + dy, camV[5]);
      if (wk > 0) cam.rotateZ(.0044 * wk * Math.sin(ph));
      if (cam.fov !== camV[6] || cam.aspect !== aspect) { cam.fov = camV[6]; cam.aspect = aspect; cam.updateProjectionMatrix(); }
      cam.updateMatrixWorld();
    }

    /* ---------- one frame, a pure function of t ---------- */
    var info = {};
    function draw(t) {
      camera(t);
      var day = tw(t, 11.3, 12.5), dawn = tw(t, 6.4, 7.6) * (1 - day), close5 = tw(t, 20.0, 21.0);
      // stage and colour script
      var zen = mixHex(mixHex(0x050B1C, 0x0B1430, dawn), 0xFFFFFF, day), hor = mixHex(mixHex(0x1A2550, 0x3A2F5A, dawn), 0xE6E9EB, day);
      sky(zen, hor); scene.fog.color.setHex(hor); renderer.setClearColor(hor, 1);
      scene.fog.near = lerp(lerp(30, 90, day), 26, close5); scene.fog.far = lerp(lerp(130, 420, day), 120, close5);
      floorMat.color.setHex(mixHex(0x0E1A3A, 0xF2F4F6, day)); floorMat.opacity = lerp(lerp(.8, .965, day), 1, tw(t, 13.7, 14.55));
      var pool = lerp(.3, 1, tw(t, 0, 1.2, out3)); floorTex.repeat.set(1 / pool, 1 / pool); floorTex.offset.set(.5 - .5 / pool, .5 - .5 / pool);
      haze.material.opacity = (.3 + .15 * dawn) * (1 - day); haze.position.y = lerp(3, 1.2, dawn); haze.visible = day < 1;
      hemi.color.setHex(mixHex(0xFFE2B0, 0xFFFFFF, day)); hemi.groundColor.setHex(mixHex(0x16224A, 0xC9D1DC, day)); hemi.intensity = lerp(.55, .85, day);
      key.intensity = lerp(1.0, .75, day); rim.color.setHex(mixHex(CYAN, 0xFFFFFF, day)); rim.intensity = lerp(.55, .35, day) * (1 + .3 * bell(seg(t, 3.0, 3.6)));
      // light sweeps: across TRAVEL (1.6-2.6) and the navy RAVEL (12.6-13.4)
      var s1 = seg(t, 1.6, 2.6), s2 = seg(t, 12.6, 13.4);
      if (s1 > 0 && s1 < 1) { sweep.position.set(lerp(-10, 10, s1), 4, 6); sweep.intensity = 1.6 * bell(s1); }
      else if (s2 > 0 && s2 < 1) { sweep.position.set(lerp(-9, 9, s2), 3.6, 5); sweep.intensity = 2.2 * bell(s2); }
      else sweep.intensity = 0;
      // letters
      U.dim.value = 1 - .15 * tw(t, 3.5, 4.2) * (1 - tw(t, 6.6, 7.6));
      var lean = -.035 * bell(seg(t, 3.5, 4.2));
      for (var i = 0; i < 5; i++) {
        var p = letters[i], e = entrance(t, i + 1), cx = lerp(p[0].userData.x0, p[0].userData.x1, tw(t, 11.6 + i * .06, 12.3 + i * .06, out3));
        p[0].position.set(cx, e.y, 0); p[0].rotation.x = e.rx + lean; p[0].scale.setScalar(e.sc);
        p[1].position.copy(p[0].position); p[1].rotation.x = p[0].rotation.x; p[1].scale.copy(p[0].scale);
        p[0].visible = p[1].visible = e.on;
      }
      var wp = t < 10.9 ? -100 : t > 12.4 ? 100 : lerp(-8, 11, seg(t, 10.9, 12.3));
      if (wipeOK) U.wipe.value = wp;
      else { var nk = tw(t, 10.9, 12.3); matFace.color.setHex(mixHex(MANGO, NAVY, nk)); matSide.color.setHex(mixHex(MANGO_D, NAVY_D, nk)); matFace.emissive.copy(matFace.color); matSide.emissive.copy(matSide.color); mirFace.color.copy(matFace.color); mirSide.color.copy(matSide.color); }
      wordShadow.material.opacity = .55 * day; wordShadow.visible = day > 0;
      mirror.visible = t < 14.6;
      // the aeroplane
      var k = seg(t, 4.2, 6.6), gear = t > 10.6 ? 1 - tw(t, 10.7, 11.3) : null, glow = tw(t, 9.3, 9.8);
      var K = sched(k); if (gear != null) K.gear = gear;
      if (k !== lastK || K.gear !== lastGear) { PL.build(K); lastK = k; lastGear = K.gear; lastGlow = -1; info.rebuilt = true; } else info.rebuilt = false;
      if (glow !== lastGlow) { PL.colour(K, glow); lastGlow = glow; }
      planeState(t, stP);
      var flying = t < 11.9;
      plane.visible = flying && t > .25; planeMirMat.opacity = 1 - tw(t, 3.4, 4.4); planeMir.visible = plane.visible && planeMirMat.opacity > 0;
      plane.position.copy(stP.p); plane.quaternion.copy(stP.q); plane.scale.setScalar(stP.s);
      planeMir.position.set(stP.p.x, -stP.p.y, stP.p.z); planeMir.quaternion.set(-stP.q.x, stP.q.y, -stP.q.z, stP.q.w); planeMir.scale.set(stP.s, -stP.s, stP.s);
      var ap = tw(t, 4.5, 6.6), shF = 1 / (1 + stP.p.y * .25);
      planeShadow.position.set(stP.p.x, .02, stP.p.z); planeShadow.scale.set(stP.s * 1.9, stP.s * 1.5, 1); planeShadow.material.opacity = .85 * ap * shF; planeShadow.visible = flying && ap > 0;
      // the airstair door and its light
      var door = tw(t, 6.9, 7.3, out3) * (1 - tw(t, 9.3, 9.8));
      stair.visible = door > .005; stair.rotation.y = door * 2.6; slab.scale.setScalar(clamp(door / .35, 0, 1) * .99 + .01);
      doorGlow.visible = door > .005; doorGlow.material.opacity = door;
      groundLight.visible = door > .005; groundLight.material.opacity = .5 * door; groundLight.position.set(DOOR_FOOT.x, .03, DOOR_FOOT.z + 2.0); groundLight.scale.set(3.2, 5.5, 1);
      var flare = door * (.35 + .65 * tw(t, 8.4, 8.95, inq)) * (t < 8.95 ? 1 : 0);
      doorFlare.visible = flare > .01; doorFlare.position.copy(DOOR); doorFlare.position.z += .1; doorFlare.quaternion.copy(cam.quaternion); doorFlare.material.opacity = flare; doorFlare.scale.setScalar(2.2 + 3 * tw(t, 8.4, 8.95));
      // engines and the trail
      var eg = tw(t, 9.6, 9.9, inq) * (t < 11.9 ? 1 : 0);
      for (i = 0; i < 2; i++) {
        var m = engGlow[i]; m.visible = eg > 0;
        if (eg > 0) { localToWorld(stP, i ? .15 : -.15, .19 - PIVOT, .04, m.position); m.quaternion.copy(cam.quaternion); m.scale.setScalar(1.1 + .4 * tw(t, 9.8, 10.6)); m.material.opacity = eg; }
      }
      var ta = tw(t, 10.0, 10.3) * (1 - tw(t, 11.4, 12.2));
      trail.visible = ta > 0;
      if (ta > 0) {
        V3.copy(cam.position);
        for (var r = 0; r < 2; r++) for (var j = 0; j < TN; j++) {
          planeState(Math.max(9.8, t - j * .05), tmpS); localToWorld(tmpS, r ? .15 : -.15, .19 - PIVOT, .04, V1);
          planeState(Math.max(9.8, t - j * .05 - .02), tmpS); localToWorld(tmpS, r ? .15 : -.15, .19 - PIVOT, .04, V2);
          V2.sub(V1); var tg = V2.length() > 1e-5 ? V2.normalize() : V2.set(1, 0, 0);
          var side = V2.clone().cross(V3.clone().sub(V1)).normalize(), f = j / (TN - 1), wd = lerp(.25, .025, f);
          var b2 = (r * TN + j) * 2 * 3;
          tPos[b2] = V1.x + side.x * wd; tPos[b2 + 1] = V1.y + side.y * wd; tPos[b2 + 2] = V1.z + side.z * wd;
          tPos[b2 + 3] = V1.x - side.x * wd; tPos[b2 + 4] = V1.y - side.y * wd; tPos[b2 + 5] = V1.z - side.z * wd;
          tmpC.copy(cWhite).lerp(cMangoT, Math.min(1, f * 2.2)).multiplyScalar(ta * Math.pow(1 - f, 1.5) * (f < .02 ? f / .02 : 1));
          tCol[b2] = tCol[b2 + 3] = tmpC.r; tCol[b2 + 1] = tCol[b2 + 4] = tmpC.g; tCol[b2 + 2] = tCol[b2 + 5] = tmpC.b;
        }
        trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
      }
      // James: found by the door's light, still; the camera takes the walk
      var reveal = tw(t, 7.0, 7.7);
      james.visible = t > 6.7 && t < 8.95;
      if (james.visible) {
        james.rotation.y = jFace;
        if (photo) { photoMat.color.setHex(mixHex(0x1B2748, 0xFFFFFF, reveal)); }
        else {
          sil.rotation.y = Math.atan2(DOOR.x - JM.x, DOOR.z - JM.z) - james.rotation.y;
          V1.copy(DOOR).sub(JM).normalize().transformDirection(cam.matrixWorldInverse); rimU.dir.value.copy(V1); rimU.k.value = .35 + 1.5 * reveal;
        }
        jShadow.material.opacity = .5 + .3 * reveal;
      }
      // the storage unit
      unit.visible = t > 13.6;
      if (unit.visible) { var ur = animUnit(U4, t, { b: 13.6, o: 14.3, i: 14.4, c: 17.3, l: 18.5 }, cam); info.door = ur.door; info.lock = ur.lock; }
      else { info.door = 0; info.lock = 0; }
      info.k = k; info.sub = K; info.wipe = wp; info.close = tw(t, 11.6, 12.54, out3); info.plane = [stP.p.x, stP.p.y, stP.p.z]; info.day = day;
      renderer.render(scene, cam);
      info.calls = renderer.info.render.calls; info.tris = renderer.info.render.triangles;
    }
    function resize(w, h, pr) {
      renderer.setPixelRatio(pr); renderer.setSize(w, h, false); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      aspect = w / h; resolveCams();
    }
    function dispose() {
      dead = true;
      scene.traverse(function (ob) {
        if (ob.geometry) ob.geometry.dispose();
        if (ob.material) (ob.material instanceof Array ? ob.material : [ob.material]).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
      });
      extra.forEach(function (t2) { t2.dispose(); });
      renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* already lost */ }
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
    var api = { draw: draw, resize: resize, dispose: dispose, info: info, canvas: canvas, renderer: renderer,
      solid: function (k2) { PL.build(sched(k2)); lastK = -1; return PL.solid(); }, hasPhoto: function () { return !!photo; }, wipeOK: function () { return wipeOK; } };
    return api;
  }

  /* ============================== Rashid: his crowded room (photo), the move to a Ravel unit (3D), his tidy room (photo) ============================== */
  // A and C are the two photographs of the same room, composited in 2D (Ken Burns push, parallax, a light-sweep wipe);
  // B is real 3D: the wrapped pieces leave the house through its lit doorway in a line and are stored in a white Ravel unit.
  // The hand-offs hide in the window's light: A pushes into the window, the light blooms, B opens on the house's lit doorway.
  var RTM = { swapA: 4.65, load: 5.0, loadGap: .28, loadDur: 1.7, drive: 8.8, cut: 10.0, arrive: 11.7, unload: 11.9, unloadGap: .26, unloadDur: 1.7, close: 15.6, lock: 16.9, swapB: 19.65, wipe: [20.2, 21.7] };
  var RPOS = { P: { u: .34, v: .9, h: .56 }, Len: { u: .82, v: .975, h: .84 }, Lar: { u: .25, v: .975, h: .84 } };   // Rashid's feet and height in the photo (fractions of the photo)
  var PFOCUS = { P: [.8, .42], L: [.66, .38] };                                                                        // the window: where A pushes in and C comes out
  function createRashid(host, o) {
    var T = W.THREE, R = W.RV3D;
    var canvas = doc.createElement('canvas'); canvas.className = 'mfilm__gl'; host.appendChild(canvas);
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: !o.low, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.manual });
    renderer.setClearColor(0xEFE6D8, 1);
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(36, 1, .05, 1500);
    scene.fog = new T.Fog(0xF2C99C, 40, 260);
    var extra = [], dead = false, info = {}, tmpC = new T.Color(), cA = new T.Color(), cB = new T.Color();
    function mixHex(a, b, k) { return cA.setHex(a).lerp(cB.setHex(b), k).getHex(); }
    function canvasTex(c) { var t = new T.CanvasTexture(c); extra.push(t); return t; }
    function radial(size, stops) {
      var c = R.mk(size, size), g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); g.fillStyle = gr; g.fillRect(0, 0, size, size); return canvasTex(c);
    }
    function quad(mat, ro) { var m = new T.Mesh(new T.PlaneGeometry(1, 1), mat); if (ro != null) m.renderOrder = ro; return m; }
    function addMat(o2) { var p = { transparent: true, blending: T.AdditiveBlending, depthWrite: false }; for (var k in o2) p[k] = o2[k]; return new T.MeshBasicMaterial(p); }
    function M(x, y, z) { return new T.Matrix4().makeTranslation(x, y, z); }
    var softTex = radial(128, [[0, 'rgba(255,255,255,1)'], [.55, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
    var glowTex = radial(128, [[0, 'rgba(255,255,255,1)'], [.3, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]);
    var blobTex = radial(128, [[0, 'rgba(40,28,18,.55)'], [.5, 'rgba(40,28,18,.26)'], [1, 'rgba(40,28,18,0)']]);
    function loadImg(src, cb) {
      if (!src) return;
      var im = new Image(); if (!/^data:/.test(src)) im.crossOrigin = 'anonymous';
      im.onload = function () { if (dead) return; var tx = new T.Texture(im); tx.minFilter = T.LinearFilter; tx.generateMipmaps = false; tx.needsUpdate = true; extra.push(tx); cb(tx, im.naturalWidth / im.naturalHeight); if (api && api.onReady) api.onReady(); };
      im.src = src;
    }

    /* ---------- the 2D layer: the room photographs ---------- */
    var scene2 = new T.Scene(), ortho = new T.OrthographicCamera(-.5, .5, .5, -.5, -10, 10);
    var PU = { tA: { value: null }, tB: { value: null }, uW: { value: -1 }, uSoft: { value: .07 }, uBand: { value: 0 }, uBright: { value: 1 } };
    var photoMat = new T.ShaderMaterial({ uniforms: PU, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tA, tB; uniform float uW, uSoft, uBand, uBright; varying vec2 vUv;\n' +
        'void main() { vec3 a = texture2D(tA, vUv).rgb, b = texture2D(tB, vUv).rgb; float x = vUv.x - (vUv.y - .5) * .28;\n' +
        ' float e = smoothstep(uW - uSoft, uW + uSoft, x); vec3 c = mix(b, a, e);\n' +
        ' float band = exp(-pow((x - uW) / (uSoft * 1.6), 2.0)); c = c * uBright + vec3(1.0, .86, .62) * band * uBand;\n' +
        ' gl_FragColor = vec4(c, 1.0); }' });
    var photo = new T.Mesh(new T.PlaneGeometry(1, 1), photoMat); photo.renderOrder = 0; scene2.add(photo);
    var standGeo = new T.PlaneGeometry(1, 1); standGeo.translate(0, .5, 0);
    var standMat = new T.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, color: 0xFFFFFF });
    var stand = new T.Mesh(standGeo, standMat); stand.renderOrder = 2; stand.visible = false; scene2.add(stand);
    var stand2Sh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthTest: false, depthWrite: false, opacity: .9 })); stand2Sh.renderOrder = 1; scene2.add(stand2Sh);
    var RI = o.roomImgs || {}, ROOM = { fullP: null, fullL: null, tidyP: null, tidyL: null }, RASP = { P: .5625, L: 1.7778 }, standAsp = .364;
    ['fullP', 'fullL', 'tidyP', 'tidyL'].forEach(function (k) { loadImg(RI[k], function (tx, a) { ROOM[k] = tx; RASP[k.slice(-1)] = a; }); });
    loadImg(o.rashidStandImg, function (tx, a) { standMat.map = tx; standMat.needsUpdate = true; standAsp = a; stand.visible = true; });

    /* ---------- the 3D world: the house's front, the lane, the unit, golden hour ---------- */
    var hemi = new T.HemisphereLight(0xFFF7EE, 0xB9B2A8, .64), key = new T.DirectionalLight(0xFFF0DC, .82); key.position.set(-6, 8, 7);
    scene.add(hemi); scene.add(key);
    var domeGeo = new T.SphereGeometry(600, 32, 16), domeCol = new Float32Array(domeGeo.attributes.position.count * 3);
    domeGeo.setAttribute('color', new T.BufferAttribute(domeCol, 3));
    (function () { var cz = new T.Color(0x7394C4), ch = new T.Color(0xF2C99C), p = domeGeo.attributes.position; for (var i = 0; i < p.count; i++) { var e = clamp(p.getY(i) / 600, 0, 1); tmpC.copy(ch).lerp(cz, Math.pow(e, .5)); domeCol[i * 3] = tmpC.r; domeCol[i * 3 + 1] = tmpC.g; domeCol[i * 3 + 2] = tmpC.b; } })();
    var dome = new T.Mesh(domeGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -10; scene.add(dome);
    var ground = new T.Mesh(new T.CircleGeometry(300, 64), new T.MeshBasicMaterial({ color: 0xCFC7BB, map: radial(256, [[0, '#ffffff'], [.2, '#f1eee9'], [.6, '#d9d5ce'], [1, '#c9c4bc']]) }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    // the house: a sand-white front with a lit doorway, a canopy, two lit windows
    var HX0 = -6.5, HX1 = 1.6, HD = 6, HH = 6.4, DXH = -.6, DWH = 1.2, DHH = 2.5, SAND = 0xEEE6D9, TRIM = 0xD7CCBB, BRONZE = 0x7A6650;
    var house = new T.Mesh(merge(T, [
      { g: new T.BoxGeometry(HX1 - HX0, HH, HD - .3), m: M((HX0 + HX1) / 2, HH / 2, -.3 - (HD - .3) / 2), c: SAND },
      { g: new T.BoxGeometry(DXH - DWH / 2 - HX0, HH, .3), m: M((HX0 + DXH - DWH / 2) / 2, HH / 2, -.15), c: SAND },
      { g: new T.BoxGeometry(HX1 - DXH - DWH / 2, HH, .3), m: M((HX1 + DXH + DWH / 2) / 2, HH / 2, -.15), c: SAND },
      { g: new T.BoxGeometry(DWH, HH - DHH, .3), m: M(DXH, (HH + DHH) / 2, -.15), c: SAND },
      { g: new T.BoxGeometry(HX1 - HX0 + .1, .2, HD + .1), m: M((HX0 + HX1) / 2, HH + .1, -HD / 2 + .05), c: TRIM },
      { g: new T.BoxGeometry(HX1 - HX0 + .04, .18, .04), m: M((HX0 + HX1) / 2, .09, .02), c: TRIM },
      { g: new T.BoxGeometry(.08, DHH + .08, .1), m: M(DXH - DWH / 2 - .04, (DHH + .08) / 2, .02), c: BRONZE },
      { g: new T.BoxGeometry(.08, DHH + .08, .1), m: M(DXH + DWH / 2 + .04, (DHH + .08) / 2, .02), c: BRONZE },
      { g: new T.BoxGeometry(DWH + .16, .08, .1), m: M(DXH, DHH + .04, .02), c: BRONZE },
      { g: new T.BoxGeometry(DWH + 1.0, .1, .9), m: M(DXH, DHH + .45, .42), c: TRIM },
      { g: new T.BoxGeometry(HX1 - HX0 + .06, .14, .12), m: M((HX0 + HX1) / 2, 3.35, .06), c: TRIM }
    ].concat([[-3.4, 1.75, 1.4], [.85, 1.75, 1.0], [-4.6, 4.75, 1.3], [-2.0, 4.75, 1.3], [.6, 4.75, 1.3]].reduce(function (a, w) {
      // a window: bronze frame, a sill, a cross mullion
      return a.concat([{ g: new T.BoxGeometry(w[2] + .1, 1.6, .06), m: M(w[0], w[1], .01), c: BRONZE }, { g: new T.BoxGeometry(w[2] + .3, .07, .2), m: M(w[0], w[1] - .84, .08), c: TRIM },
        { g: new T.BoxGeometry(.04, 1.42, .1), m: M(w[0], w[1], .06), c: BRONZE }, { g: new T.BoxGeometry(w[2] - .04, .04, .1), m: M(w[0], w[1] + .2, .06), c: BRONZE }]);
    }, []))), new T.MeshLambertMaterial({ vertexColors: true })); scene.add(house);
    var warm = new T.MeshBasicMaterial({ color: 0xFFE6C2 });
    var doorLight = new T.Mesh(new T.PlaneGeometry(DWH, DHH), warm); doorLight.position.set(DXH, DHH / 2, -.29); scene.add(doorLight);
    var glass = new T.Mesh(merge(T, [[-3.4, 1.75, 1.3], [.85, 1.75, .9], [-4.6, 4.75, 1.2], [-2.0, 4.75, 1.2], [.6, 4.75, 1.2]].map(function (w, i) { return { g: new T.PlaneGeometry(w[2], 1.42), m: M(w[0], w[1], .045), c: i < 2 ? 0xFFDDB0 : 0xC9D3E0 }; })), new T.MeshBasicMaterial({ vertexColors: true })); scene.add(glass);
    var spill = quad(addMat({ map: softTex, color: 0xFFC98E, opacity: .55 }), 3); spill.rotation.x = -Math.PI / 2; spill.position.set(DXH, .02, 1.3); spill.scale.set(2.6, 3.2, 1); scene.add(spill);
    var doorGlow = quad(addMat({ map: glowTex, color: 0xFFE0B0, opacity: .5, fog: false }), 6); doorGlow.position.set(DXH, 1.3, .1); doorGlow.scale.set(2.6, 3.4, 1); scene.add(doorGlow);
    // the unit, at a Ravel site away from the house: a white block of units, navy band, cyan line
    var UW = Math.max(3.6, o.unit && o.unit.w || 3), UD = o.unit && o.unit.d || 4, UH = o.unit && o.unit.h || 3, ZF = UD / 2 + .035;
    var UX = 40, UZ = -ZF;
    var site = new T.Group(); scene.add(site);
    var unitG = new T.Group(); unitG.position.set(UX, 0, UZ); site.add(unitG);
    var U4 = makeUnit({ T: T, R: R, canvasTex: canvasTex, radial: radial, quad: quad, addMat: addMat, softTex: softTex }, unitG, { w: UW, d: UD, h: UH }, []);
    (function () {
      var WALL = 0xF4F5F6, NAVY = 0x1B2A55, CY = 0x2EC5FF, DOOR = 0xE1E4E8, FR = 0xB8BEC6, L = [], x0 = UX - UW / 2 - .05, x1 = UX + UW / 2 + .05, BH = UH + .55;
      [[x0 - 11, x0], [x1, x1 + 13]].forEach(function (s) {
        var w = s[1] - s[0], cx = (s[0] + s[1]) / 2;
        L.push({ g: new T.BoxGeometry(w, BH, UD), m: M(cx, BH / 2, -UD / 2 - .02), c: WALL });
        L.push({ g: new T.BoxGeometry(w, .42, .06), m: M(cx, BH - .3, .03), c: NAVY });
        L.push({ g: new T.BoxGeometry(w, .05, .07), m: M(cx, BH - .56, .035), c: CY });
        for (var dx = s[0] + 1.9; dx < s[1] - 1.2; dx += 3.7) {
          L.push({ g: new T.BoxGeometry(2.2, 2.45, .05), m: M(dx, 1.225, .03), c: FR });
          L.push({ g: new T.BoxGeometry(1.04, 2.36, .06), m: M(dx - .54, 1.2, .04), c: DOOR });
          L.push({ g: new T.BoxGeometry(1.04, 2.36, .06), m: M(dx + .54, 1.2, .04), c: DOOR });
        }
      });
      L.push({ g: new T.BoxGeometry(UW + .1, BH - UH - .02, UD), m: M(UX, UH + (BH - UH) / 2 + .01, -UD / 2 - .02), c: WALL });
      L.push({ g: new T.BoxGeometry(UW + .1, .42, .06), m: M(UX, BH - .3, .03), c: NAVY });
      L.push({ g: new T.BoxGeometry(60, .02, 9), m: M(UX, .005, 3.6), c: 0xD9D6D0 });
      site.add(new T.Mesh(merge(T, L), new T.MeshLambertMaterial({ vertexColors: true })));
    })();

    /* ---------- the pickup: a plain white pickup with an open bed; it faces +x, its origin under the middle of the bed ---------- */
    var BED_Y = .95, WR = .4;
    function makeTruck() {
      var g = new T.Group(), BODY = 0xF3F3F1, DARK = 0x2C2F35, GL = 0x5B6E86, TR = 0x9AA1AA, L = [];
      function bx(x0, x1, y0, y1, z0, z1, c) { L.push({ g: new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m: M((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), c: c }); }
      bx(-1.38, 3.98, .46, .76, -.88, .88, DARK);             // chassis
      bx(-1.32, 1.32, .74, BED_Y, -.94, .94, BODY);            // bed floor
      bx(-1.32, 1.32, BED_Y, 1.47, -.95, -.88, BODY); bx(-1.32, 1.32, BED_Y, 1.47, .88, .95, BODY);   // bed sides
      bx(1.26, 1.32, BED_Y, 1.47, -.88, .88, BODY); bx(-1.32, -1.26, BED_Y, 1.42, -.88, .88, BODY);   // bulkhead, tailgate
      bx(-1.34, 1.34, 1.45, 1.5, -.96, -.86, TR); bx(-1.34, 1.34, 1.45, 1.5, .86, .96, TR);           // rails
      bx(1.38, 2.95, .74, 2.02, -.93, .93, BODY);              // cab
      bx(1.62, 2.82, 1.36, 1.9, -.94, .94, GL);                // side windows
      bx(1.37, 1.39, 1.4, 1.88, -.72, .72, GL);                // rear window
      bx(2.95, 2.97, 1.34, 1.92, -.82, .82, GL);               // windscreen
      bx(2.9, 3.98, .74, 1.34, -.93, .93, BODY);               // bonnet
      bx(3.97, 4.0, .82, 1.2, -.66, .66, DARK);                // grille
      bx(3.97, 4.01, 1.12, 1.27, -.88, -.62, 0xFFF4D6); bx(3.97, 4.01, 1.12, 1.27, .62, .88, 0xFFF4D6);  // headlamps
      bx(-1.35, -1.31, 1.08, 1.36, -.92, -.78, 0xB3262E); bx(-1.35, -1.31, 1.08, 1.36, .78, .92, 0xB3262E);  // tail lamps
      bx(-1.46, -1.32, .5, .66, -.95, .95, DARK); bx(3.96, 4.1, .5, .7, -.95, .95, DARK);                // bumpers
      bx(2.02, 2.06, 1.1, 1.14, -.96, .96, TR);                // door line
      g.add(new T.Mesh(merge(T, L), new T.MeshLambertMaterial({ vertexColors: true })));
      var wheels = [], tg = new T.CylinderGeometry(WR, WR, .3, 22); tg.rotateX(Math.PI / 2);
      var hg2 = new T.CylinderGeometry(.21, .21, .32, 14); hg2.rotateX(Math.PI / 2);
      var tm = new T.MeshLambertMaterial({ color: 0x25272B }), hm = new T.MeshLambertMaterial({ color: 0xC4C8CE });
      [[-.55, -.8], [-.55, .8], [3.2, -.8], [3.2, .8]].forEach(function (p) {
        var w = new T.Group(); w.position.set(p[0], WR, p[1]);
        w.add(new T.Mesh(tg, tm)); var hb = new T.Mesh(hg2, hm); w.add(hb);
        var sp = new T.Mesh(new T.BoxGeometry(.36, .05, .33), hm); w.add(sp);
        g.add(w); wheels.push(w);
      });
      var sh = quad(new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: .75 }), 1); sh.rotation.x = -Math.PI / 2; sh.position.set(1.3, .015, 0); sh.scale.set(6.6, 2.7, 1); g.add(sh);
      g.userData.wheels = wheels; return g;
    }
    var truck = makeTruck(); scene.add(truck);
    var TX1 = DXH + 2.4, TZ1 = 1.75, TX2 = UX + UW / 2 + .55 + 1.32, TZ2 = 2.25;
    function truckAt(t, out) {
      if (t < RTM.cut) { var a = seg(t, RTM.drive, RTM.cut); out.x = TX1 + 30 * a * a * a; out.z = TZ1; }
      else { var b = 1 - seg(t, RTM.cut, RTM.arrive); out.x = TX2 - 26 * b * b; out.z = TZ2; }
      return out;
    }

    /* ---------- the pieces, wrapped: out of the house into the pickup's bed, then out of the bed into the unit ---------- */
    var CAT = { box: [.5, .45, .42, '#C69D70'], wardrobeS: [1.0, .58, 1.95, '#7A5236'], dresser: [.9, .45, .8, '#7A5236'], suit: [.5, .3, .72, '#4A5A73'] };
    // [kind, place in the bed (x along the truck, z across), place in the unit (unit-local x, z), extra] in the order they are loaded
    var LIST = [['wardrobeS', .7, -.45, -1.2, .2], ['dresser', .72, .42, .6, -.95, { top: true }], ['box', -.05, -.5, -.85, -.9, { n: 3 }], ['box', -.05, .1, -1.45, -1.7, { n: 2 }],
      ['suit', -.08, .58, .3, -1.75, { v: 1 }], ['box', -.75, -.5, -.85, -1.7, { n: 2, small: true }], ['box', -.75, .08, 1.4, -1.7, { n: 1 }], ['suit', -.78, .58, .85, -1.75, { v: 0 }]];
    var itemMat = new T.MeshLambertMaterial({ vertexColors: true }), movers = [], NL = LIST.length;
    function poly(P) { var lens = [], tot = 0; for (var j = 0; j < P.length - 1; j++) { var dx = P[j + 1][0] - P[j][0], dy = P[j + 1][1] - P[j][1], dz = P[j + 1][2] - P[j][2], l = Math.sqrt(dx * dx + dy * dy + dz * dz) || .001; lens.push(l); tot += l; } return { P: P, lens: lens, tot: tot }; }
    function along(pl, u, out) {
      var d = u * pl.tot, j = 0; while (j < pl.lens.length - 1 && d > pl.lens[j]) { d -= pl.lens[j]; j++; }
      var f = clamp(d / pl.lens[j], 0, 1), A = pl.P[j], B = pl.P[j + 1];
      out.x = lerp(A[0], B[0], f); out.y = lerp(A[1], B[1], f); out.z = lerp(A[2], B[2], f); return out;
    }
    LIST.forEach(function (L2, i) {
      var c = CAT[L2[0]], ex = L2[5] || {}, it = { kind: L2[0], x: 0, z: 0, w: c[0], d: c[1], h: c[2], c: c[3], yaw: 0, v: ex.v != null ? ex.v : i }, k;
      for (k in ex) it[k] = ex[k];
      var hh = it.kind === 'box' ? it.n * .42 : it.kind === 'dresser' && it.top ? it.h + .4 : it.h;
      var b = new R.BoxBatch(T); R.addItem(b, it); var mesh = b.mesh(itemMat); mesh.visible = false; scene.add(mesh);
      var hy = Math.max(.04, Math.min(.35, DHH - .08 - hh)), bxp = L2[1], bzp = L2[2], sx = UX + L2[3], sz = UZ + L2[4], lift = 1.58;
      var P1 = poly([[DXH, hy, -1.4], [DXH, hy, .9], [TX1 - 2.05, .3, TZ1 + bzp * .4], [TX1 - 1.6, lift, TZ1 + bzp * .4], [TX1 + bxp, lift, TZ1 + bzp], [TX1 + bxp, BED_Y, TZ1 + bzp]]);
      var P2 = poly([[TX2 + bxp, BED_Y, TZ2 + bzp], [TX2 + bxp, lift, TZ2 + bzp], [TX2 - 1.95, 1.0, TZ2 + bzp * .4], [UX + .5, .2, 1.45], [UX, .05, .45], [UX, .04, -.6], [sx, 0, sz]]);
      var shadow = quad(new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0 }), 2); shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
      movers.push({ it: it, mesh: mesh, shadow: shadow, P1: P1, P2: P2, bx: bxp, bz: bzp, yaw0: it.w > 1.1 ? Math.PI / 2 : 0, syaw: 0, foot: Math.max(it.w, it.d) * .9,
        tL: RTM.load + i * RTM.loadGap, tU: RTM.unload + (NL - 1 - i) * RTM.unloadGap });
    });
    var TP = { x: 0, z: 0 };
    // where a piece is at t: in the house, on the way to the bed, riding in the bed, on the way into the unit, stored
    function moverAt(m, t, out) {
      out.free = false;
      if (t < m.tL) { out.u = 0; out.x = DXH; out.y = 0; out.z = -2; out.yaw = 0; return out; }
      if (t < m.tL + RTM.loadDur) { var u = io(seg(t, m.tL, m.tL + RTM.loadDur)); along(m.P1, u, out); out.yaw = lerp(m.yaw0, 0, io(clamp(u * 3, 0, 1))); out.u = .01 + .49 * u; out.free = true; return out; }
      if (t < m.tU) { truckAt(t, TP); out.x = TP.x + m.bx; out.y = BED_Y; out.z = TP.z + m.bz; out.yaw = 0; out.u = .5; return out; }
      var v = io(seg(t, m.tU, m.tU + RTM.unloadDur)); along(m.P2, v, out); out.yaw = lerp(0, m.syaw, v); out.u = .5 + .5 * v; out.free = v < 1; return out;
    }

    /* ---------- Rashid at the unit, greeting (the waving photo) ---------- */
    var RH = 2.6, RW = new T.Vector3(UX - UW / 2 - .75, 0, 1.25);
    var rashid = new T.Group(); rashid.position.copy(RW); site.add(rashid);
    var rShadow = quad(new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: .7 }), 2); rShadow.rotation.x = -Math.PI / 2; rShadow.position.y = .01; rShadow.scale.set(1.1, .6, 1); rashid.add(rShadow);
    var sil = new T.Mesh(buildKandura(T), new T.MeshPhongMaterial({ vertexColors: true, specular: 0x333333, shininess: 18 })); sil.scale.setScalar(RH / 1.78); rashid.add(sil);
    var wavePhoto = null, rFace = 0;
    loadImg(o.rashidImg, function (tx, a) {
      var g = new T.PlaneGeometry(1, 1); g.translate(0, .5, 0);
      wavePhoto = new T.Mesh(g, new T.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, alphaTest: .02, side: T.DoubleSide, color: 0xFFF6EC }));
      wavePhoto.scale.set(RH * a, RH, 1); wavePhoto.renderOrder = 5; rashid.add(wavePhoto); sil.visible = false;
    });

    /* ---------- camera keys for B: shot 1 at the house (loading, the pickup leaves), a cut, shot 2 at the unit ---------- */
    var CAMS = [], CAMS2 = [], aspect = 1, camV = [0, 0, 0, 0, 0, 0, 0], set = 'P', pw = 1, ph = 1, C0 = RTM.close;
    function camKeys() {
      return [
        { t: RTM.swapA, pos: [DXH, 1.35, 1.7], look: [DXH, 1.25, -1], fovL: 44, fovP: 58 },
        { t: 6.1, L: { c: [DXH + 2.9, 1.25, 1.2], w: 9.4, h: 3.6, d: 3, az: .1, el: .2, fill: .95, fov: 36 }, P: { c: [DXH + 2.9, 1.25, 1.3], w: 7.2, h: 3.8, d: 3, az: .2, el: .2, fill: .98, fov: 46 } },
        { t: 8.7, L: { c: [DXH + 3.2, 1.25, 1.3], w: 9.2, h: 3.6, d: 3, az: .06, el: .19, fill: .95, fov: 36 }, P: { c: [DXH + 3.2, 1.25, 1.4], w: 7.0, h: 3.8, d: 3, az: .14, el: .19, fill: .98, fov: 46 } },
        { t: RTM.cut, L: { c: [DXH + 7.0, 1.2, 1.6], w: 8.2, h: 3.6, d: 3, az: -.05, el: .16, fill: .95, fov: 36 }, P: { c: [DXH + 5.0, 1.2, 1.7], w: 4.5, h: 3.8, d: 3, az: -.04, el: .16, fill: .98, fov: 46 } }
      ];
    }
    function camKeys2() {
      return [
        { t: RTM.cut, L: { c: [UX + 1.0, 1.15, 1.1], w: 10.4, h: 3.6, d: 2, az: .06, el: .18, fill: .95, fov: 36 }, P: { c: [UX + .7, 1.15, 1.2], w: 5.4, h: 3.6, d: 2, az: .1, el: .18, fill: .98, fov: 46 } },
        { t: RTM.arrive + .3, L: { c: [UX + 1.2, 1.15, 1.0], w: 9.6, h: 3.6, d: 2, az: .05, el: .18, fill: .95, fov: 36 }, P: { c: [UX + 1.6, 1.15, 1.1], w: 6.4, h: 3.6, d: 2, az: .08, el: .18, fill: .98, fov: 46 } },
        { t: C0 - 1.6, L: { c: [UX + .7, 1.2, .7], w: 8.0, h: 3.5, d: 2, az: .05, el: .17, fill: .95, fov: 36 }, P: { c: [UX + 1.3, 1.2, .9], w: 6.0, h: 3.6, d: 2, az: .07, el: .17, fill: .98, fov: 46 } },
        { t: C0 - .5, L: { c: [UX, 1.3, .3], w: 6.2, h: 3.4, d: 2, az: .06, el: .16, fill: .95, fov: 36 }, P: { c: [UX, 1.3, .4], w: 3.8, h: 3.6, d: 2, az: .08, el: .16, fill: .98, fov: 46 } },
        { t: C0 + .8, pos: [UX - 1.0, 1.9, 6.4], look: [UX, 1.3, 0], fovL: 38, fovP: 50 },
        { t: C0 + 1.55, pos: [UX + .22, 1.24, 1.2], look: [UX - .07, 1.06, .08], fovL: 30, fovP: 38, hold: 1 },
        { t: C0 + 2.1, pos: [UX + .21, 1.24, 1.16], look: [UX - .07, 1.06, .08], fovL: 30, fovP: 38 },
        { t: C0 + 3.0, L: { c: [UX - 1.2, 1.45, .5], w: 6.6, h: 3.4, d: 2, az: .1, el: .1, fill: .9, fov: 34 }, P: { c: [UX - 1.6, 1.3, .9], w: 3.4, h: 3.8, d: 1, az: .12, el: .1, fill: .95, fov: 44 } },
        { t: C0 + 4.1, L: { c: [UX - 1.2, 1.45, .5], w: 6.6, h: 3.4, d: 2, az: .05, el: .1, fill: .92, fov: 34 }, P: { c: [UX - 1.6, 1.3, .9], w: 3.4, h: 3.8, d: 1, az: .07, el: .1, fill: .97, fov: 44 }, hold: 1 }
      ];
    }
    function resolveCams() {
      var q = clamp((aspect - .8) / .4, 0, 1);
      function build(keys) { var K = []; keys.forEach(function (k) { K.push({ t: k.t, v: k.pos ? k.pos.concat(k.look, [lerp(k.fovP, k.fovL, q)]) : frame(blend(k.L, k.P || k.L, q), aspect), hold: k.hold }); }); tangents(K); return K; }
      CAMS = build(camKeys()); CAMS2 = build(camKeys2());
      herm(CAMS2, C0 + 3.1, camV); rFace = Math.atan2(camV[0] - RW.x, camV[2] - RW.z);
    }
    function camera(t) {
      herm(t < RTM.cut ? CAMS : CAMS2, t, camV);
      var dx = .008 * Math.sin(1.7 * t), dy = .008 * Math.sin(2.3 * t + 1);
      cam.position.set(camV[0] + dx, camV[1] + dy, camV[2]); cam.lookAt(camV[3] + dx, camV[4] + dy, camV[5]);
      if (cam.fov !== camV[6] || cam.aspect !== aspect) { cam.fov = camV[6]; cam.aspect = aspect; cam.updateProjectionMatrix(); }
      cam.updateMatrixWorld();
    }

    /* ---------- the photo layer from t: Ken Burns into / out of the window, Rashid with parallax, the light wipe ---------- */
    function photoLayer(t) {
      var full = ROOM['full' + set], tidy = ROOM['tidy' + set] || full;
      photo.visible = !!full; if (!full) return;
      PU.tA.value = full; PU.tB.value = tidy;
      var s, F = PFOCUS[set];
      if (t < RTM.swapB) s = 1 + .1 * io(seg(t, 0, 4.2)) + .5 * inq(seg(t, 3.85, RTM.swapA));
      else s = lerp(1.22, 1.0, io(seg(t, RTM.swapB, RTM.swapB + 3.05)));
      var ww = RTM.wipe, wu = seg(t, ww[0], ww[1]);
      PU.uW.value = t < ww[0] ? -1 : t > ww[1] ? 2 : lerp(-.2, 1.25, io(wu)); PU.uBand.value = .75 * bell(wu); PU.uBright.value = 1 + .05 * bell(wu);
      photo.scale.set(pw * s, ph * s, 1); photo.position.set(-(F[0] - .5) * pw * (s - 1), (F[1] - .5) * ph * (s - 1), 0);
      // Rashid in the room: standing, a nearer layer, so he slides a little faster than the room
      var rp = RPOS[set === 'P' ? 'P' : o.rtl ? 'Lar' : 'Len'], sr = 1 + (s - 1) * 1.22;
      var fx = (rp.u - .5) * pw * sr - (F[0] - .5) * pw * (sr - 1), fy = (.5 - rp.v) * ph * sr + (F[1] - .5) * ph * (sr - 1), hgt = rp.h * ph * sr;
      stand.position.set(fx, fy, 0); stand.scale.set(hgt * standAsp, hgt, 1);
      standMat.color.setHex(mixHex(0x6E6470, 0xF6EADC, tw(t, .25, 1.3)));
      stand2Sh.visible = stand.visible; stand2Sh.position.set(fx, fy + hgt * .004, 0); stand2Sh.scale.set(hgt * .62, hgt * .07, 1); stand2Sh.material.opacity = .85 * tw(t, .25, 1.3);
    }

    /* ---------- one frame ---------- */
    var st = {};
    function draw(t) {
      var inPhoto = t < RTM.swapA || t >= RTM.swapB;
      info.phase = t < RTM.swapA ? 'room-full' : t < RTM.swapB ? 'move' : t < RTM.wipe[1] ? 'room-reveal' : 'room-tidy';
      var stored = 0;
      for (var i = 0; i < movers.length; i++) { var m = movers[i], p = moverAt(m, t, st); if (p.u >= 1) stored++; }
      info.stored = stored; info.wrapped = movers.length;
      if (inPhoto) {
        photoLayer(t); renderer.render(scene2, ortho);
        info.door = t < RTM.swapA ? 0 : 0; info.lock = t >= RTM.swapB ? 1 : 0;
      } else {
        camera(t);
        var atSite = t >= RTM.cut;
        house.visible = glass.visible = doorLight.visible = spill.visible = doorGlow.visible = !atSite; site.visible = atSite;
        truckAt(t, TP); truck.position.set(TP.x, 0, TP.z);
        var roll = (TP.x - TX1) / WR; truck.userData.wheels.forEach(function (w) { w.rotation.z = -roll; });
        for (i = 0; i < movers.length; i++) {
          m = movers[i]; p = moverAt(m, t, st);
          var vis = p.u > 0 && !(p.u >= 1 && t > RTM.close + 1.3);
          m.mesh.visible = vis; m.mesh.position.set(p.x, p.y, p.z); m.mesh.rotation.y = p.yaw;
          m.shadow.visible = vis && p.free && p.z > -.25; m.shadow.material.opacity = .5 / (1 + p.y * 2); m.shadow.position.set(p.x, .012, p.z); m.shadow.scale.set(m.foot * 1.6, m.foot * 1.6, 1);
        }
        var ur = animUnit(U4, t, { b: -10, o: RTM.arrive - .5, i: 0, c: RTM.close, l: RTM.lock, ang: 2.95, glow: 0 }, cam);
        info.door = ur.door; info.lock = ur.lock; info.truck = +TP.x.toFixed(2);
        rashid.rotation.y = rFace;
        renderer.render(scene, cam);
      }
      info.calls = renderer.info.render.calls; info.tris = renderer.info.render.triangles;
    }
    function resize(w, h, pr) {
      renderer.setPixelRatio(pr); renderer.setSize(w, h, false); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      aspect = w / h; set = aspect < 1 ? 'P' : 'L'; if (!RI['full' + set]) set = set === 'P' ? 'L' : 'P';
      var pa = RASP[set]; ortho.left = -aspect / 2; ortho.right = aspect / 2; ortho.top = .5; ortho.bottom = -.5; ortho.updateProjectionMatrix();
      if (aspect > pa) { pw = aspect; ph = aspect / pa; } else { ph = 1; pw = pa; }
      resolveCams();
    }
    function dispose() {
      dead = true;
      [scene, scene2].forEach(function (sc) { sc.traverse(function (ob) {
        if (ob.geometry) ob.geometry.dispose();
        if (ob.material) (ob.material instanceof Array ? ob.material : [ob.material]).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
      }); });
      extra.forEach(function (t2) { t2.dispose(); });
      renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* already lost */ }
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
    var api = { draw: draw, resize: resize, dispose: dispose, info: info, canvas: canvas, renderer: renderer,
      hasPhoto: function () { return !!(wavePhoto && stand.visible && ROOM['full' + set] && ROOM['tidy' + set]); }, wipeOK: function () { return null; } };
    return api;
  }

  // Rashid without a photograph: a standing man in a white kandura, ghutra and black agal, right hand raised (one mesh)
  function buildKandura(T) {
    var L = [], ROBE = 0xF3F2EE, GHUT = 0xFAFAF7, AGAL = 0x15161A, SKIN = 0x9A7458, SHOE = 0x3A2A20;
    function M(x, y, z, sx, sy, sz) { return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion(), new T.Vector3(sx || 1, sy || 1, sz || 1)); }
    function lathe(pts, n) { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), n || 32); }
    function limb(a, b, r, col) { var d = new T.Vector3().subVectors(b, a), len = d.length(); L.push({ g: new T.CapsuleGeometry(r, Math.max(.001, len), 6, 16), m: new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()), new T.Vector3(1, 1, 1)), c: col }); }
    L.push({ g: lathe([[0, .03], [.2, .035], [.215, .1], [.2, .4], [.185, .7], [.175, .95], [.18, 1.15], [.2, 1.3], [.21, 1.38], [.2, 1.43], [.15, 1.46], [.07, 1.49], [0, 1.5]], 36), m: M(0, 0, 0, 1, 1, .62), c: ROBE });
    [-1, 1].forEach(function (s) { L.push({ g: new T.SphereGeometry(1, 16, 10), m: M(s * .08, .03, .06, .05, .035, .11), c: SHOE }); });
    L.push({ g: new T.CylinderGeometry(.048, .052, .1, 16), m: M(0, 1.53, .01), c: SKIN });
    L.push({ g: new T.SphereGeometry(1, 22, 16), m: M(0, 1.64, .02, .088, .11, .1), c: SKIN });
    L.push({ g: lathe([[0, 1.79], [.06, 1.785], [.105, 1.755], [.118, 1.7], [.13, 1.6], [.16, 1.46], [.2, 1.38], [.0, 1.37]], 30), m: M(0, 0, -.02, 1, 1, .95), c: GHUT });
    L.push({ g: new T.TorusGeometry(.098, .014, 10, 28), m: new T.Matrix4().compose(new T.Vector3(0, 1.735, -.012), new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2 - .12), new T.Vector3(1, 1, 1)), c: AGAL });
    var shL = new T.Vector3(-.2, 1.4, 0), elL = new T.Vector3(-.235, 1.12, .02), wrL = new T.Vector3(-.235, .88, .05);
    limb(shL, elL, .055, ROBE); limb(elL, wrL, .046, ROBE); L.push({ g: new T.SphereGeometry(1, 12, 8), m: M(wrL.x, wrL.y - .06, wrL.z, .032, .06, .04), c: SKIN });
    var shR = new T.Vector3(.2, 1.4, 0), elR = new T.Vector3(.39, 1.3, .05), wrR = new T.Vector3(.42, 1.58, .08);
    limb(shR, elR, .055, ROBE); limb(elR, wrR, .046, ROBE); L.push({ g: new T.SphereGeometry(1, 12, 8), m: M(wrR.x + .005, wrR.y + .07, wrR.z, .035, .07, .022), c: SKIN });
    return merge(T, L);
  }

  // the camera and the aeroplane both move on C1 Hermite curves through timed keys (tangents from the neighbours)
  function tangents(K) {
    for (var i = 0; i < K.length; i++) {
      var k = K[i], n = k.v.length, m = [];
      for (var j = 0; j < n; j++) {
        if (k.hold || i === 0 || i === K.length - 1) m.push(0);
        else m.push(.9 * (K[i + 1].v[j] - K[i - 1].v[j]) / (K[i + 1].t - K[i - 1].t));
      }
      k.m = m;
    }
  }
  function herm(K, t, out) {
    var n = K[0].v.length, i, j;
    if (t <= K[0].t) { for (j = 0; j < n; j++) out[j] = K[0].v[j]; return out; }
    if (t >= K[K.length - 1].t) { for (j = 0; j < n; j++) out[j] = K[K.length - 1].v[j]; return out; }
    for (i = 0; i < K.length - 1; i++) if (t < K[i + 1].t) break;
    var a = K[i], b = K[i + 1], h = b.t - a.t, s = (t - a.t) / h, s2 = s * s, s3 = s2 * s;
    var h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    for (j = 0; j < n; j++) out[j] = h00 * a.v[j] + h10 * h * a.m[j] + h01 * b.v[j] + h11 * h * b.m[j];
    return out;
  }

  // a standing man in shirt and trousers, one hand on the handle of an upright carry-on, from smooth solids (one mesh)
  function buildSilhouette(T) {
    var L = [], SHIRT = 0x18234A, TROU = 0x0D1530, SHOE = 0x070B18, SKIN = 0x141E3E, CASE = 0x111A36, STEEL = 0x2C3655;
    function M(x, y, z, sx, sy, sz) { return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion(), new T.Vector3(sx || 1, sy || 1, sz || 1)); }
    function lathe(pts, seg2) { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg2 || 28); }
    function limb(a, b, r, col) {
      var d = new T.Vector3().subVectors(b, a), len = d.length(), g = new T.CapsuleGeometry(r, Math.max(.001, len), 6, 16);
      var q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()), m = new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), q, new T.Vector3(1, 1, 1));
      L.push({ g: g, m: m, c: col });
    }
    function ik(s, w, la, lb, hint) {     // two-bone elbow position
      var d = w.clone().sub(s), dl = Math.min(d.length(), la + lb - 1e-4), a = (la * la - lb * lb + dl * dl) / (2 * dl), h = Math.sqrt(Math.max(0, la * la - a * a));
      var dir = d.normalize(), side = hint.clone().sub(dir.clone().multiplyScalar(hint.dot(dir))).normalize();
      return s.clone().add(dir.multiplyScalar(a)).add(side.multiplyScalar(h));
    }
    // legs: trousers with a soft break over the shoe
    [-1, 1].forEach(function (sd) {
      var g = lathe([[0, .06], [.052, .065], [.056, .12], [.058, .3], [.062, .48], [.07, .62], [.08, .78], [.092, .93], [.0, .97]], 24);
      L.push({ g: g, m: M(sd * .092, 0, 0, 1, 1, .92), c: TROU });
      var sg = new T.SphereGeometry(1, 20, 12); L.push({ g: sg, m: M(sd * .095, .045, .035, .052, .045, .125), c: SHOE });
    });
    // hips and torso: an elliptical lathe, shirt tucked in at the waist
    L.push({ g: lathe([[0, .86], [.15, .87], [.172, .93], [.163, 1.02], [.168, 1.12], [.188, 1.26], [.2, 1.37], [.205, 1.42], [.18, 1.475], [.11, 1.515], [.058, 1.535], [0, 1.54]], 32), m: M(0, 0, 0, 1, 1, .6), c: SHIRT });
    L.push({ g: lathe([[0, .955], [.168, .955], [.17, .985], [0, .985]], 28), m: M(0, 0, 0, 1, 1, .6), c: TROU });     // belt line
    // neck and head
    L.push({ g: new T.CylinderGeometry(.05, .056, .12, 18), m: M(0, 1.57, .005), c: SKIN });
    L.push({ g: lathe([[0, -.118], [.05, -.11], [.075, -.085], [.088, -.04], [.094, .01], [.092, .05], [.08, .088], [.05, .112], [0, .12]], 28), m: M(0, 1.705, .012, 1, 1, 1.08), c: SKIN });
    L.push({ g: new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * .55), m: M(0, 1.72, -.004, .1, .11, .112), c: TROU });  // hair
    // arms: one hangs relaxed, one holds the suitcase handle
    var shL = new T.Vector3(-.205, 1.425, 0), wrL = new T.Vector3(-.235, .87, .03), elL = ik(shL, wrL, .3, .27, new T.Vector3(0, 0, -1));
    limb(shL, elL, .047, SHIRT); limb(elL, wrL, .039, SHIRT);
    L.push({ g: new T.SphereGeometry(1, 14, 10), m: M(wrL.x, wrL.y - .06, wrL.z, .03, .065, .045), c: SKIN });
    var grip = new T.Vector3(.4, .93, .02), shR = new T.Vector3(.205, 1.425, 0), wrR = new T.Vector3(.39, .985, .02), elR = ik(shR, wrR, .3, .27, new T.Vector3(.6, 0, -1));
    limb(shR, elR, .047, SHIRT); limb(elR, wrR, .039, SHIRT);
    L.push({ g: new T.SphereGeometry(1, 14, 10), m: M(grip.x - .005, grip.y + .02, grip.z, .035, .045, .045), c: SKIN });
    // the carry-on: a rounded shell, a telescopic handle, four wheels
    var cs = new T.Shape(), cw = .37, chh = .54, cr = .05; cs.moveTo(-cw / 2 + cr, 0); cs.lineTo(cw / 2 - cr, 0); cs.quadraticCurveTo(cw / 2, 0, cw / 2, cr); cs.lineTo(cw / 2, chh - cr); cs.quadraticCurveTo(cw / 2, chh, cw / 2 - cr, chh);
    cs.lineTo(-cw / 2 + cr, chh); cs.quadraticCurveTo(-cw / 2, chh, -cw / 2, chh - cr); cs.lineTo(-cw / 2, cr); cs.quadraticCurveTo(-cw / 2, 0, -cw / 2 + cr, 0);
    var cg = new T.ExtrudeGeometry(cs, { depth: .18, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 4, curveSegments: 8 }); cg.translate(0, 0, -.09);
    var CX = .4, CZ = -.02;
    L.push({ g: cg, m: M(CX, .075, CZ, 1, 1, 1).multiply(new T.Matrix4().makeRotationY(Math.PI / 2)), c: CASE });
    [-1, 1].forEach(function (sd) { L.push({ g: new T.CylinderGeometry(.008, .008, .34, 10), m: M(CX, .78, CZ + sd * .06), c: STEEL }); });
    L.push({ g: new T.CapsuleGeometry(.014, .13, 4, 12), m: new T.Matrix4().compose(new T.Vector3(CX, .945, CZ), new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2), new T.Vector3(1, 1, 1)), c: STEEL });
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (q) { L.push({ g: new T.CylinderGeometry(.03, .03, .022, 14), m: new T.Matrix4().compose(new T.Vector3(CX + q[0] * .07, .03, CZ + q[1] * .15), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), Math.PI / 2), new T.Vector3(1, 1, 1)), c: SHOE }); });
    return merge(T, L);
  }

  // the hand-placed fallback contents for a 3 x 4 m unit (only used when the page passes no layout)
  function fallbackItems(w, d) {
    var bx = -w / 2, bz = -d / 2, list = [];
    function it(kind, x, z, iw, id, ih, c, yaw, ex) { var o = { kind: kind, x: x, z: z, w: iw, d: id, h: ih, c: c, yaw: yaw || 0, v: list.length }; for (var k in ex || {}) o[k] = ex[k]; list.push(o); }
    it('wardrobe', bx + .62, bz + .32, 1.2, .6, 2.0, '#7A5236'); it('carpet', bx + 1.55, bz + .3, .56, .5, 2.3, '#8E2F3A'); it('fridge', bx + 2.2, bz + .38, .7, .7, 1.8, '#DDE3EA');
    it('sofa', bx + .47, bz + 1.75, 2.0, .9, .85, '#22346E', Math.PI / 2); it('table', bx + 1.85, bz + 1.35, 1.4, .86, .75, '#6A4630', 0);
    it('box', bx + 2.7, bz + 1.0, .5, .45, .42, '#C69D70', 0, { n: 3 }); it('box', bx + 2.2, bz + 2.4, .5, .45, .42, '#C69D70', 0, { n: 2, small: true });
    it('tv', bx + 1.6, bz + 2.5, 1.25, .2, .78, '#C69D70', 0); it('box', bx + 2.72, bz + 2.0, .5, .45, .42, '#C69D70', Math.PI / 2, { n: 2 });
    return list;
  }

  /* ============================== overlay, captions and controls ============================== */
  var ICON = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    skip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.5v11l8.5-5.5L6 6.5z" fill="currentColor"/><path d="M17.5 6.5v11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.8 9.8 0 0 0-8.5 14.7L2.2 21.8l5-1.3A9.8 9.8 0 1 0 12 2.2zm0 1.8a8 8 0 1 1-4.1 14.9l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 0 1 12 4z"/><path fill="currentColor" d="M8.9 7.4c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.9 4.5 4 2.2.9 2.7.7 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.8-.2-.3 0-.4.1-.5l.4-.4.2-.4c.1-.2 0-.3 0-.4l-.8-1.9z"/></svg>',
    tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>',
    replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M4.5 3.8v4.6h4.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13M16 5.5v13" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.5v13l11-6.5-11-6.5z" fill="currentColor"/></svg>'
  };
  var UI = {
    en: { close: 'Close', skip: 'Skip', replay: 'Replay', scenes: 'Scenes', scene: 'Scene', of: 'of', call: 'Call', wa: 'WhatsApp', cta: 'Explore Storage Units', note: 'Still version: motion is off in this mode' },
    ar: { close: 'إغلاق', skip: 'تخطَّ', replay: 'إعادة العرض', scenes: 'مشاهد القصة', scene: 'المشهد', of: 'من', call: 'اتصال', wa: 'واتساب', cta: 'استكشف وحدات التخزين', note: 'عرض ثابت: الحركة متوقفة في هذا الوضع' }
  };
  // Each story: its clock (length, scene starts, skip target), when each caption comes and goes, and its words in both languages.
  // j2 and m3 are [before, marked, after]: the marked part is bold (j2) or underlined in cyan (m3); m4 is [first, on the mango block].
  var STORY = {
    james: {
      dur: 25.4, sc: [0, 3.4, 11.2, 13.6, 20.0], skip: 24.5, dayAt: 12.2, bloom: [[8.6, 8.95, 9.35]], scrim: [20.0, 21.0],
      j1: [7.3, 8.4, 8.6], j2: [14.6, 19.5, 19.8], m1: 20.3, m2: 21.3, m12: [22.6, 22.9], m3: [22.9, 24.3, 24.6], rule: [23.5, 24.0], m4: 24.5, hl: [24.8, 25.3], end: 24.9,
      en: { title: "James's story: TRAVEL to RAVEL", name: 'James', j1: 'Travelling for 6 months.', j2: ['Saved ', 'AED 6,600/month', ' by storing his furniture instead of keeping his apartment.'],
        m1: 'Travelling for months?', m2: 'Why keep paying rent?', m3: ['Store your furniture safely with ', 'Ravel Storage', '.'], m4: ['Travel light.', 'Save more.'],
        sr: 'James is travelling for 6 months. The T of TRAVEL becomes an aeroplane and leaves; the word that stays is RAVEL. His furniture is stored in a locked Ravel Storage unit. He saved AED 6,600 a month by storing it instead of keeping his apartment. Travel light. Save more.' },
      ar: { title: 'قصة جيمس: من TRAVEL إلى RAVEL', name: 'جيمس', j1: 'مسافر لمدة 6 أشهر.', j2: ['وفّر ', '6,600 درهم شهرياً', ' بتخزين أثاثه بدلاً من الاحتفاظ بشقته.'],
        m1: 'مسافر لعدة أشهر؟', m2: 'لماذا تستمر في دفع الإيجار؟', m3: ['خزّن أثاثك بأمان مع ', 'رافل للتخزين', '.'], m4: ['سافر بخفة.', 'ووفّر أكثر.'] }
    },
    rashid: {
      dur: 24.9, sc: [0, 4.6, 10.0, 19.65, 21.6], skip: 23.7, dayAt: 0, bloom: [[4.2, 4.65, 5.15], [9.7, 10.0, 10.3], [19.25, 19.65, 20.15]], scrim: [21.2, 22.0],
      j1: [1.0, 3.85, 4.1], j2: [5.6, 14.6, 14.8], m3: [21.6, 23.4, 23.7], rule: [22.2, 22.7], m4: 23.7, hl: [24.0, 24.5], end: 24.1,
      en: { title: "Rashid's story", name: 'Rashid', j1: 'His home was full.', j2: ['', '', 'He moved the extras into a Ravel unit.'], m3: ['For only ', 'AED 300', ' a month.'], m4: ['More space at home.', 'A tidier house.'] },
      ar: { title: 'قصة راشد', name: 'راشد', j1: 'بيته كان ممتلئاً بالأغراض.', j2: ['', '', 'نقل الأغراض الزائدة إلى وحدة في رافل.'], m3: ['بـ ', '300 درهم', ' فقط شهرياً.'], m4: ['مساحة أكبر في البيت،', 'وبيت أكثر ترتيباً.'] }
    }
  };
  function plainCopy(C) { return [C.name + ': ' + C.j1, C.j2.join(''), C.m1 || '', C.m2 || '', C.m3.join(''), C.m4.join(' ')].filter(Boolean).join(' '); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // each word in its own clipped box, so it can rise into view
  function words(s, cls) { return s.split(' ').filter(Boolean).map(function (w) { return '<span class="mfilm__w"><span class="mfilm__wi' + (cls ? ' ' + cls : '') + '">' + esc(w) + '</span></span>'; }).join(' '); }
  function tail(s) { return /^\s/.test(s) ? ' ' + words(s) : esc(s); }
  function j2html(C) { return esc(C.j2[0]) + (C.j2[1] ? '<strong>' + esc(C.j2[1]) + '</strong>' : '') + esc(C.j2[2]); }

  function buildDom(o, L, C, S) {
    var ar = o.lang === 'ar', LG = ar ? 'lang="ar" dir="rtl"' : 'lang="en" dir="ltr"';
    var root = doc.createElement('div');
    root.className = 'mfilm mfilm--' + o.story; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', C.title);
    root.setAttribute('dir', ar ? 'rtl' : 'ltr'); root.setAttribute('lang', ar ? 'ar' : 'en');
    var bar = ''; for (var i = 0; i < S.sc.length; i++) bar += '<button class="mfilm__seg" type="button" data-scene="' + i + '" aria-label="' + esc(L.scene + ' ' + (i + 1) + ' ' + L.of + ' ' + S.sc.length) + '"><i></i></button>';
    var wa = esc(o.wa || '#'), tel = esc(o.tel || 'tel:+971503250551');
    root.innerHTML =
      '<div class="mfilm__stage"></div>' +
      '<div class="mfilm__bloom" aria-hidden="true"></div><div class="mfilm__scrim" aria-hidden="true"></div><div class="mfilm__black" aria-hidden="true"></div>' +
      '<div class="mfilm__caps" ' + LG + ' aria-hidden="true">' +
        '<div class="mfilm__third mfilm__j1"><b class="mfilm__name">' + esc(C.name) + '</b><span class="mfilm__plate">' + esc(C.j1) + '</span></div>' +
        '<div class="mfilm__third mfilm__j2"><b class="mfilm__name">' + esc(C.name) + '</b><span class="mfilm__plate">' + j2html(C) + '</span></div>' +
      '</div>' +
      '<div class="mfilm__copy" ' + LG + '>' +
        '<div class="mfilm__msg" aria-hidden="true">' +
          (C.m1 ? '<p class="mfilm__line mfilm__m12"><span class="mfilm__l1">' + words(C.m1) + '</span><span class="mfilm__l2">' + words(C.m2) + '</span></p>' : '') +
          '<p class="mfilm__line mfilm__m3">' + words(C.m3[0]) + ' <span class="mfilm__rule">' + words(C.m3[1]) + '<i class="mfilm__ruleb"></i></span>' + tail(C.m3[2]) + '</p>' +
          '<p class="mfilm__line mfilm__m4">' + words(C.m4[0]) + ' <span class="mfilm__hl"><i class="mfilm__hlb"></i>' + words(C.m4[1]) + '</span></p>' +
        '</div>' +
        '<div class="mfilm__end">' +
          '<div class="mfilm__row"><button class="mfilm__btn mfilm__btn--navy mfilm__cta" type="button">' + esc(L.cta) + ICON.arrow + '</button>' +
          '<button class="mfilm__btn mfilm__btn--ghost mfilm__replay" type="button">' + ICON.replay + '<span>' + esc(L.replay) + '</span></button></div>' +
          '<div class="mfilm__row mfilm__contact"><a class="mfilm__btn mfilm__btn--wa" href="' + wa + '" target="_blank" rel="noopener">' + ICON.wa + '<span>' + esc(L.wa) + '</span></a></div>' +
        '</div>' +
      '</div>' +
      '<div class="mfilm__still" ' + LG + ' hidden></div>' +
      '<p class="mfilm__sr" ' + LG + '>' + esc(C.sr || plainCopy(C)) + '</p>' +
      '<div class="mfilm__bar" role="group" aria-label="' + esc(L.scenes) + '">' + bar + '</div>' +
      '<button class="mfilm__close" type="button" aria-label="' + esc(L.close) + '">' + ICON.close + '</button>' +
      '<button class="mfilm__skip" type="button"><span>' + esc(L.skip) + '</span>' + ICON.skip + '</button>' +
      '<a class="mfilm__fab" href="' + wa + '" target="_blank" rel="noopener" aria-label="' + esc(L.wa) + '">' + ICON.wa + '</a>' +
      '<div class="mfilm__pause" aria-hidden="true"></div>' +
      '<div class="mfilm__flash" aria-hidden="true"></div>';
    function q(s) { return root.querySelector(s); }
    return {
      root: root, stage: q('.mfilm__stage'), black: q('.mfilm__black'), bloom: q('.mfilm__bloom'), scrim: q('.mfilm__scrim'), j1: q('.mfilm__j1'), j2: q('.mfilm__j2'),
      copy: q('.mfilm__copy'), msg: q('.mfilm__msg'), m12: q('.mfilm__m12'), l1: q('.mfilm__l1'), l2: q('.mfilm__l2'), m3: q('.mfilm__m3'), m4: q('.mfilm__m4'), rule: q('.mfilm__ruleb'), hl: q('.mfilm__hlb'),
      end: q('.mfilm__end'), endBtns: [q('.mfilm__cta'), q('.mfilm__replay'), q('.mfilm__btn--wa')], cta: q('.mfilm__cta'), replay: q('.mfilm__replay'),
      still: q('.mfilm__still'), bar: q('.mfilm__bar'), segs: [].slice.call(root.querySelectorAll('.mfilm__seg')), close: q('.mfilm__close'), skip: q('.mfilm__skip'), fab: q('.mfilm__fab'),
      pause: q('.mfilm__pause'), flash: q('.mfilm__flash')
    };
  }

  var SB_UNIT = '<svg viewBox="0 0 120 100" width="104" height="87" aria-hidden="true"><path d="M8 94V26L60 6l52 20v68" fill="none" stroke="#152249" stroke-width="3" stroke-linejoin="round"/><path d="M4 94h112" stroke="#152249" stroke-width="3" stroke-linecap="round"/><rect x="30" y="40" width="60" height="54" rx="2" fill="#fff" stroke="#152249" stroke-width="3"/><path d="M60 40v54" stroke="#152249" stroke-width="2.4"/><path d="M36 50h18M66 50h18M36 60h18M66 60h18M36 84h18M66 84h18" stroke="#B9C2CF" stroke-width="1.6"/><path d="M55 66a5 5 0 0 1 10 0v4" fill="none" stroke="#152249" stroke-width="2.4"/><rect x="52.5" y="69" width="15" height="12" rx="2.5" fill="#FFC83D" stroke="#152249" stroke-width="1.6"/><path d="M26 36h68" stroke="#2EC5FF" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var SB_HOME = '<svg viewBox="0 0 120 100" width="104" height="87" aria-hidden="true"><path d="M10 94V44L60 10l50 34v50" fill="none" stroke="#152249" stroke-width="3" stroke-linejoin="round"/><path d="M4 94h112" stroke="#152249" stroke-width="3" stroke-linecap="round"/><rect x="24" y="66" width="20" height="16" rx="1.5" fill="#C69D70" stroke="#152249" stroke-width="1.6"/><rect x="40" y="74" width="18" height="20" rx="1.5" fill="#C69D70" stroke="#152249" stroke-width="1.6"/><rect x="28" y="52" width="14" height="14" rx="1.5" fill="#E2C7A2" stroke="#152249" stroke-width="1.6"/><rect x="66" y="58" width="18" height="36" rx="1.5" fill="#fff" stroke="#152249" stroke-width="1.6"/><rect x="86" y="70" width="14" height="24" rx="1.5" fill="#C69D70" stroke="#152249" stroke-width="1.6"/></svg>';
  var SB_ARROW = '<svg viewBox="0 0 48 24" width="40" height="20" aria-hidden="true"><path d="M4 12h36M32 5l8 7-8 7" fill="none" stroke="#2EC5FF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function storyboard(o, C) {
    var cap = '<p class="mfilm__sbcap"><b>' + esc(C.name) + '</b>' + esc(C.j1) + ' ' + j2html(C) + '</p>';
    var lines = '<div class="mfilm__sblines">' + (C.m1 ? '<p class="mfilm__sbl">' + esc(C.m1) + '<br>' + esc(C.m2) + '</p>' : '') +
      '<p class="mfilm__sbm">' + esc(C.m3[0]) + '<span class="mfilm__sbrule">' + esc(C.m3[1]) + '</span>' + esc(C.m3[2]) + '</p>' +
      '<p class="mfilm__sbbig">' + esc(C.m4[0]) + ' <span class="mfilm__sbhl">' + esc(C.m4[1]) + '</span></p></div>';
    if (o.story === 'rashid') return '<div class="mfilm__sb"><div class="mfilm__sbpair">' + SB_HOME + '<span class="mfilm__sbarrow">' + SB_ARROW + '</span>' + SB_UNIT + '</div>' + cap + lines + '</div>';
    return '<div class="mfilm__sb">' +
      '<div class="mfilm__sbword" aria-hidden="true" dir="ltr"><span class="mfilm__sbt">T<svg class="mfilm__sbtrail" viewBox="0 0 120 60" preserveAspectRatio="none"><path d="M118 8C80 10 40 30 2 56" fill="none" stroke="#FFB81C" stroke-width="2.2" stroke-linecap="round"/><path d="M118 8C82 12 46 30 10 54" fill="none" stroke="#FFE2A8" stroke-width="1" stroke-linecap="round" opacity=".7"/></svg></span><span class="mfilm__sbr">RAVEL</span></div>' +
      '<div class="mfilm__sbunit">' + SB_UNIT + cap + '</div>' + lines + '</div>';
  }

  /* ============================== the player ============================== */
  var cur = null, glOk = null;
  function webgl() {
    if (glOk != null) return glOk;
    try { var c = doc.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'); glOk = !!g; if (g && g.getExtension('WEBGL_lose_context')) g.getExtension('WEBGL_lose_context').loseContext(); }
    catch (e) { glOk = false; }
    return glOk;
  }
  function can() { return !!(W.THREE && W.RV3D && W.RV3D.BoxBatch && W.RV3D.addItem && W.RV3D.mk && webgl()); }

  function open(opts) {
    if (cur) return cur.player;
    var o = {}, k0; for (k0 in opts || {}) o[k0] = opts[k0];
    o.lang = o.lang === 'ar' ? 'ar' : 'en'; o.story = o.story === 'rashid' ? 'rashid' : 'james'; o.rtl = o.lang === 'ar';
    var S = STORY[o.story], C = S[o.lang], L = UI[o.lang], DUR = S.dur, SC = S.sc, SKIP_TO = S.skip;
    var d = buildDom(o, L, C, S), html = doc.documentElement;
    var st = { t: 0, playing: false, ended: false, raf: 0, last: 0, eng: null, mode: '3d', opener: doc.activeElement, pushed: false, dead: false, endFocused: false, pr: 1, slow: [], w: 0, h: 0 };
    var styleCache = typeof WeakMap === 'function' ? new WeakMap() : null;
    function css(el, s) { if (styleCache) { if (styleCache.get(el) === s) return; styleCache.set(el, s); } el.style.cssText = s; }

    doc.body.appendChild(d.root);
    html.classList.add('mfilm-lock');
    try { history.pushState({ mfilm: 1 }, ''); st.pushed = true; } catch (e) { /* sandboxed */ }

    function still(why) {
      st.mode = 'still'; st.why = why || 'reduced';
      if (st.eng) { st.eng.dispose(); st.eng = null; }
      cancelAnimationFrame(st.raf); st.playing = false;
      d.root.classList.add('mfilm--still');
      d.still.innerHTML = storyboard(o, C) + '<p class="mfilm__note" hidden dir="' + (o.lang === 'ar' ? 'rtl' : 'ltr') + '" lang="' + (o.lang === 'ar' ? 'ar' : 'en') + '">' + esc(L.note) + '</p>';
      d.still.hidden = false; d.still.appendChild(d.end); var nt = d.still.querySelector('.mfilm__note'); d.still.appendChild(nt); nt.hidden = false; d.end.classList.add('is-on');
      d.endBtns.forEach(function (b) { b.style.cssText = ''; });
      d.replay.hidden = true;
      [d.bar, d.skip, d.fab, d.copy, d.black].forEach(function (el) { el.hidden = true; });
    }
    var RI = o.roomImgs || {}, noRoom = o.story === 'rashid' && !((RI.fullP || RI.fullL) && (RI.tidyP || RI.tidyL));
    if (o.reduced || !can() || noRoom) still(o.reduced ? 'reduced' : noRoom ? 'noroom' : 'nogl');
    else {
      try { st.eng = (o.story === 'rashid' ? createRashid : createEngine)(d.stage, o); }
      catch (e) {
        if (W.console) console.warn('RVMotion: 3D failed, showing the storyboard', e);
        var fc = d.stage.querySelector('canvas');
        if (fc) { try { var fg = fc.getContext('webgl2') || fc.getContext('webgl'), fx = fg && fg.getExtension('WEBGL_lose_context'); if (fx) fx.loseContext(); } catch (e2) { /* ignore */ } fc.parentNode.removeChild(fc); }
        still('error');
      }
    }

    /* ---- captions and controls from t ---- */
    function wordIn(el, t0, t) { var ws = el.querySelectorAll('.mfilm__wi'), i; for (i = 0; i < ws.length; i++) { var p = out3(seg(t, t0 + i * .045, t0 + i * .045 + .5)); css(ws[i], p >= 1 ? '' : 'transform:translateY(' + ((1 - p) * 110).toFixed(2) + '%)'); } }
    function lineOut(el, t0, t1, t, tin) { var x = out3(seg(t, t0, t1)), on = t >= tin && x < 1; css(el, on ? 'visibility:visible' + (x > 0 ? ';opacity:' + (1 - x).toFixed(3) + ';transform:translateY(' + (-60 * x).toFixed(2) + '%)' : '') : 'visibility:hidden'); return on; }
    function third(el, a, b0, b1, t) { var p = out3(seg(t, a, a + .45)), x = seg(t, b0, b1), on = t >= a && x < 1; css(el, on ? 'visibility:visible;opacity:' + (p * (1 - x)).toFixed(3) + ';transform:translateY(' + ((1 - p) * 14 - x * 8).toFixed(2) + 'px)' : 'visibility:hidden'); }
    function captions(t) {
      css(d.black, t < .4 ? 'opacity:' + (1 - out3(t / .4)).toFixed(3) : 'visibility:hidden');
      var bl = 0; S.bloom.forEach(function (B) { bl = Math.max(bl, t < B[0] || t > B[2] ? 0 : t < B[1] ? inq(seg(t, B[0], B[1])) : 1 - out3(seg(t, B[1], B[2]))); });
      css(d.bloom, bl > 0 ? 'visibility:visible;opacity:' + bl.toFixed(3) : 'visibility:hidden');
      var sc = tw(t, S.scrim[0], S.scrim[1]); css(d.scrim, sc > 0 ? 'visibility:visible;opacity:' + sc.toFixed(3) : 'visibility:hidden');
      third(d.j1, S.j1[0], S.j1[1], S.j1[2], t); third(d.j2, S.j2[0], S.j2[1], S.j2[2], t);
      if (d.m12 && lineOut(d.m12, S.m12[0], S.m12[1], t, S.m1)) { wordIn(d.l1, S.m1, t); wordIn(d.l2, S.m2, t); }
      if (lineOut(d.m3, S.m3[1], S.m3[2], t, S.m3[0])) { wordIn(d.m3, S.m3[0], t); css(d.rule, 'transform:scaleX(' + out3(seg(t, S.rule[0], S.rule[1])).toFixed(3) + ')'); }
      if (lineOut(d.m4, 99, 100, t, S.m4)) { wordIn(d.m4, S.m4, t); css(d.hl, 'transform:scaleX(' + out3(seg(t, S.hl[0], S.hl[1])).toFixed(3) + ')'); }
      var endOn = t >= S.end; d.end.classList.toggle('is-on', endOn);
      d.endBtns.forEach(function (b, i) { var p = out3(seg(t, S.end + Math.min(i, 2) * .12, S.end + .5 + Math.min(i, 2) * .12)); css(b, endOn ? 'opacity:' + p.toFixed(3) + ';transform:translateY(' + ((1 - p) * 12).toFixed(2) + 'px)' : ''); });
      d.skip.hidden = t >= SKIP_TO - .01; d.fab.hidden = endOn;
      var s = sceneOf(t, SC);
      d.segs.forEach(function (b, i) { var f = seg(t, SC[i], i < SC.length - 1 ? SC[i + 1] : DUR); css(b.firstChild, 'transform:scaleX(' + f.toFixed(4) + ')'); if (i === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      d.root.classList.toggle('mfilm--end', endOn); d.root.classList.toggle('mfilm--day', t > S.dayAt);
    }
    function render() {
      if (!st.eng) return;
      st.eng.draw(st.t); captions(st.t);
    }
    function size() {
      if (!st.eng) return;
      var w = d.root.clientWidth || W.innerWidth, h = d.root.clientHeight || W.innerHeight;
      var pr = Math.min(W.devicePixelRatio || 1, o.low ? 1.5 : 2, Math.sqrt(2.2e6 / (w * h)));
      if (st.prCap) pr = Math.min(pr, st.prCap);
      st.w = w; st.h = h; st.pr = pr; st.eng.resize(w, h, pr);
    }
    function loop(now) {
      st.raf = 0; if (!st.playing || st.dead) return;
      var dt = st.last ? now - st.last : 16; st.last = now;
      st.t = Math.min(DUR, st.t + Math.min(dt, 50) / 1000);
      var t0 = performance.now(); render(); var cost = performance.now() - t0;
      watchdog(dt, cost);
      if (st.t >= DUR) { st.playing = false; st.ended = true; focusEnd(); return; }
      st.raf = requestAnimationFrame(loop);
    }
    function watchdog(dt) {
      if (o.manual || /perf=off/.test(location.search)) return;
      st.slow.push(dt); if (st.slow.length < 45) return;
      var m = st.slow.reduce(function (a, b) { return a + b; }, 0) / st.slow.length; st.slow = []; st.mean = m;
      if (m > 24 && st.pr > 1) { st.prCap = Math.max(1, st.pr * .8); size(); }
      else if (m > 60 && st.pr <= 1) { st.slowFor = (st.slowFor || 0) + 1; if (st.slowFor >= 2) { var t = st.t; still('slow'); st.t = t; } }
    }
    function focusEnd() { if (!st.endFocused && d.root.contains(doc.activeElement)) { st.endFocused = true; try { d.cta.focus({ preventScroll: true }); } catch (e) { d.cta.focus(); } } }
    function play() {
      if (!st.eng || st.dead) return;
      if (st.t >= DUR) { st.t = 0; st.endFocused = false; }
      st.playing = true; st.ended = false; st.last = 0; if (!o.manual && !st.raf) st.raf = requestAnimationFrame(loop);
    }
    function pause() { st.playing = false; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; }
    function seek(t) { st.t = clamp(+t || 0, 0, DUR); if (st.t < S.end) st.endFocused = false; render(); if (st.t >= DUR) { st.ended = true; if (st.playing) pause(); } }
    function skip() {
      if (st.mode !== '3d') return;
      d.flash.classList.remove('is-on'); void d.flash.offsetWidth; d.flash.classList.add('is-on');
      seek(SKIP_TO); if (!o.manual) play();
      try { d.cta.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    function replay() { st.endFocused = false; seek(0); if (!o.manual) play(); try { d.close.focus(); } catch (e) { /* ignore */ } }
    function toggle() {
      if (st.mode !== '3d' || st.t >= DUR) return;
      if (st.playing) pause(); else play();
      d.pause.innerHTML = st.playing ? ICON.play : ICON.pause; d.pause.classList.remove('is-on'); void d.pause.offsetWidth; d.pause.classList.add('is-on');
    }

    /* ---- events ---- */
    var down = null;
    function onDown(e) { down = { x: e.clientX, y: e.clientY, t: Date.now() }; }
    function onUp(e) { if (down && Math.abs(e.clientX - down.x) < 10 && Math.abs(e.clientY - down.y) < 10 && Date.now() - down.t < 500) toggle(); down = null; }
    function onKey(e) {
      var k = e.key;
      if (k === 'Escape' || k === 'Esc') { e.preventDefault(); close(); return; }
      if (k === 'Tab') {
        var f = [].slice.call(d.root.querySelectorAll('button,a[href]')).filter(function (el) { return !el.hidden && !el.closest('[hidden]') && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden'; });
        if (!f.length) return; var i = f.indexOf(doc.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
        return;
      }
      if (st.mode !== '3d') return;
      var tag = (e.target && e.target.tagName) || '';
      if ((k === ' ' || k === 'k' || k === 'K') && tag !== 'BUTTON' && tag !== 'A') { e.preventDefault(); toggle(); }
      else if (k === 'ArrowRight' || k === 'ArrowLeft') {
        var s = sceneOf(st.t, SC), fwd = (k === 'ArrowRight') !== (d.root.getAttribute('dir') === 'rtl');
        var nt = fwd ? (s < SC.length - 1 ? SC[s + 1] : SKIP_TO) : (st.t - SC[s] > 1 || s === 0 ? SC[s] : SC[s - 1]);
        e.preventDefault(); seek(nt); if (!o.manual) play();
      } else if (k === 'r' || k === 'R') { e.preventDefault(); replay(); }
    }
    function onPop() { if (!st.dead) { st.pushed = false; close(); } }
    function onVis() { if (doc.hidden && st.playing) { pause(); st.hiddenPaused = true; } else if (!doc.hidden && st.hiddenPaused) { st.hiddenPaused = false; play(); } }
    var rt = 0; function onResize() { clearTimeout(rt); rt = setTimeout(function () { size(); if (st.eng) render(); }, 60); }
    function onLost(e) { e.preventDefault(); var t = st.t; still('lost'); st.t = t; }
    d.stage.addEventListener('pointerdown', onDown); d.stage.addEventListener('pointerup', onUp);
    doc.addEventListener('keydown', onKey, true); W.addEventListener('popstate', onPop); doc.addEventListener('visibilitychange', onVis); W.addEventListener('resize', onResize);
    if (st.eng) st.eng.canvas.addEventListener('webglcontextlost', onLost);
    d.close.addEventListener('click', function () { close(); });
    d.skip.addEventListener('click', skip);
    d.replay.addEventListener('click', replay);
    d.cta.addEventListener('click', function () { var cb = o.onExplore; close(); if (cb) cb(o.story); });
    d.segs.forEach(function (b, i) { b.addEventListener('click', function () { seek(SC[i]); if (!o.manual) play(); }); });

    function close() {
      if (st.dead) return; st.dead = true;
      pause();
      d.stage.removeEventListener('pointerdown', onDown); d.stage.removeEventListener('pointerup', onUp);
      doc.removeEventListener('keydown', onKey, true); W.removeEventListener('popstate', onPop); doc.removeEventListener('visibilitychange', onVis); W.removeEventListener('resize', onResize);
      if (st.eng) { st.eng.canvas.removeEventListener('webglcontextlost', onLost); st.eng.dispose(); st.eng = null; }
      if (d.root.parentNode) d.root.parentNode.removeChild(d.root);
      html.classList.remove('mfilm-lock');
      if (st.pushed && history.state && history.state.mfilm) { try { history.back(); } catch (e) { /* ignore */ } }
      cur = null;
      if (st.opener && st.opener.focus && doc.contains(st.opener)) { try { st.opener.focus({ preventScroll: true }); } catch (e) { st.opener.focus(); } }
      if (o.onClose) o.onClose();
    }

    var player = {
      dur: DUR, scenes: SC.slice(), mode: function () { return st.mode; },
      play: play, pause: pause, seek: seek, skip: skip, replay: replay, close: close, resize: function () { size(); render(); },
      probe: function () {
        var i = st.eng ? st.eng.info : {}, caps = [];
        [['j1', d.j1], ['j2', d.j2], ['m1', d.m12], ['m3', d.m3], ['m4', d.m4]].forEach(function (p) { if (p[1] && p[1].style.visibility === 'visible' && st.mode === '3d') caps.push(p[0]); });
        return { story: o.story, lang: o.lang, mode: st.mode, why: st.why, t: st.t, dur: DUR, scene: sceneOf(st.t, SC), playing: st.playing, ended: st.ended, k: i.k, sub: i.sub, plane: i.plane, wipe: i.wipe, close: i.close, door: i.door, lock: i.lock,
          day: i.day, phase: i.phase, wrapped: i.wrapped, stored: i.stored, clean: i.clean, calls: i.calls, tris: i.tris, rebuilt: i.rebuilt, pr: st.pr, meanFrame: st.mean, caps: caps, end: d.end.classList.contains('is-on'), photo: st.eng ? st.eng.hasPhoto() : false, wipeShader: st.eng ? st.eng.wipeOK() : null };
      },
      _eng: function () { return st.eng; }
    };
    cur = { player: player, st: st };
    if (st.eng) {
      st.eng.onReady = function () { if (!st.playing || o.manual) render(); };
      size(); render();
      try { d.close.focus({ preventScroll: true }); } catch (e) { d.close.focus(); }
      if (!o.manual) play();
    } else {
      try { d.end.querySelector('.mfilm__cta').focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    return player;
  }

  W.RVMotion = {
    version: 1,
    can: can,
    open: open,
    close: function () { if (cur) cur.player.close(); },
    isOpen: function () { return !!cur; },
    debug: {
      seek: function (s) { if (cur) cur.player.seek(s); return cur ? cur.player.probe() : null; },
      probe: function () { return cur ? cur.player.probe() : null; },
      player: function () { return cur ? cur.player : null; },
      sched: sched,
      solid: function (k) { var e = cur && cur.player._eng(); if (!e || !e.solid) return null; var r = e.solid(k); if (cur) cur.player.seek(cur.st.t); return r; }
    }
  };
})();
