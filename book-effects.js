/* ============================================================
   book-effects.js  v3 — Extreme Horror Atmospheres
   Reads <body data-book-effect="...">
   Each effect is a canvas anchored at the bottom of the viewport.
   No bubbles. No floating particles. Dark, oppressive, thematic.
   ============================================================ */
(function () {
  'use strict';

  var body = document.body;
  var theme = body && body.getAttribute('data-book-effect');
  if (!theme) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile  = window.matchMedia('(max-width: 640px)').matches;

  /* ---- shared layer ---- */
  var layer = document.createElement('div');
  layer.className = 'bfx bfx-' + theme;
  layer.setAttribute('aria-hidden', 'true');
  body.appendChild(layer);

  /* ---- shared canvas helper ---- */
  function makeCanvas(heightVh) {
    var c = document.createElement('canvas');
    c.className = 'bfx-canvas';
    c.style.height = heightVh + 'vh';
    layer.appendChild(c);
    var ctx = c.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    function resize() {
      W = layer.clientWidth;
      H = Math.round(layer.clientHeight * (heightVh / 100));
      c.width  = W * dpr;
      c.height = H * dpr;
      c.style.width  = W + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', function () { resize(); }, { passive: true });
    return { c: c, ctx: ctx, get W() { return W; }, get H() { return H; } };
  }

  /* ---- scroll intensity (0..1) ---- */
  var scrollPct = 0;
  window.addEventListener('scroll', function () {
    var max = Math.max(1, document.body.scrollHeight - window.innerHeight);
    scrollPct = Math.min(1, window.scrollY / max);
  }, { passive: true });

  /* ---- rng shortcut ---- */
  var rng = function (a, b) { return a + Math.random() * (b - a); };

  /* ---- raf loop helper ---- */
  function loop(fn) {
    if (reduced) { fn(0); return; }
    var raf = null, running = false;
    function tick() { fn(scrollPct); raf = requestAnimationFrame(tick); }
    function start() { if (!running) { running = true; tick(); } }
    function stop()  { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
    start();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
  }

  /* ================================================================
     1. ORANGE GOO / TOXIC OOZE  —  The Big Orange Monster Fucked Up
     Thick suffocating ooze. Gas pockets. CRT interference. No bubbles.
     ================================================================ */
  var EFFECTS = {

    orangeGooSignal: function () {
      var cv  = makeCanvas(mobile ? 35 : 48);
      var ctx = cv.ctx;

      /* slow-deforming ooze blobs */
      var blobs = [];
      var bcount = mobile ? 5 : 9;
      for (var i = 0; i < bcount; i++) {
        blobs.push({
          x: rng(0.05, 0.95), y: 0.6 + rng(0, 0.4),
          rx: rng(0.08, 0.22), ry: rng(0.04, 0.12),
          ph: rng(0, 6.28), spd: rng(0.0003, 0.0008),
          col: 'rgba(' + Math.round(rng(160,220)) + ',' + Math.round(rng(55,90)) + ',10,'
        });
      }

      /* gas pockets — slow vertical rise, thick and slow, no pop */
      var pockets = [];
      var pcount = mobile ? 3 : 6;
      for (var j = 0; j < pcount; j++) {
        pockets.push({
          x: rng(0, 1), y: rng(0.7, 1.1),
          r: rng(0.01, 0.04), vy: rng(0.00015, 0.0004),
          a: rng(0.15, 0.35), delay: rng(0, 800)
        });
      }

      /* scan line overlay — drawn via CSS, just need signal text */
      var sig = document.createElement('div');
      sig.className = 'bfx-signal';
      var msgs = ['CONTAINMENT BREACH', 'SIGNAL LOST', 'NO SAFE EXIT',
                  'DOORS SEALED', 'TRANSMISSION ENDS', 'MONSTER DETECTED'];
      sig.textContent = msgs[0];
      layer.appendChild(sig);
      if (!reduced) {
        var midx = 0, last = 0;
        window.addEventListener('scroll', function () {
          var now = Date.now();
          if (now - last < 2800) return;
          last = now; midx = (midx + 1) % msgs.length;
          sig.textContent = msgs[midx];
          sig.classList.add('bfx-flicker');
          setTimeout(function () { sig.classList.remove('bfx-flicker'); }, 800);
        }, { passive: true });
      }

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.008;

        /* base ooze gradient */
        var grad = ctx.createLinearGradient(0, H * 0.1, 0, H);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.35, 'rgba(80,28,4,0.30)');
        grad.addColorStop(0.7,  'rgba(130,48,8,0.55)');
        grad.addColorStop(1,    'rgba(160,55,8,0.78)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        /* ooze blobs */
        for (var i = 0; i < blobs.length; i++) {
          var b = blobs[i];
          b.ph += b.spd * (1 + sc * 0.5);
          var bx = b.x * W + Math.sin(b.ph * 1.3) * W * 0.03;
          var by = (b.y - sc * 0.08) * H;
          var alpha = 0.28 + sc * 0.18;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(bx, by, b.rx * W + Math.sin(b.ph * 0.7) * W * 0.01,
            b.ry * H + Math.cos(b.ph) * H * 0.008, b.ph * 0.3, 0, Math.PI * 2);
          var rg = ctx.createRadialGradient(bx, by, 0, bx, by, b.rx * W);
          rg.addColorStop(0,   b.col + (alpha + 0.25) + ')');
          rg.addColorStop(0.6, b.col + alpha + ')');
          rg.addColorStop(1,   b.col + '0)');
          ctx.fillStyle = rg;
          ctx.filter = 'blur(6px)';
          ctx.fill();
          ctx.restore();
        }

        /* gas pockets — slow thick rise */
        for (var j = 0; j < pockets.length; j++) {
          var p = pockets[j];
          if (Date.now() < p.delay) continue;
          p.y -= p.vy;
          if (p.y < -0.05) { p.y = 1.05; p.x = rng(0, 1); }
          var px = p.x * W, py = p.y * H;
          var pr = p.r * W * (1 + sc * 0.3);
          var fade = Math.min(1, (1.05 - p.y) * 8) * p.a;
          ctx.beginPath();
          ctx.ellipse(px, py, pr * 1.6, pr, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200,90,15,' + fade * 0.7 + ')';
          ctx.filter = 'blur(4px)';
          ctx.fill();
          ctx.filter = 'none';
        }

        /* surface texture striations */
        ctx.globalAlpha = 0.08 + sc * 0.06;
        for (var k = 0; k < 5; k++) {
          var ky = H * (0.5 + k * 0.1 + Math.sin(t + k) * 0.02);
          ctx.strokeStyle = 'rgba(220,100,20,0.6)';
          ctx.lineWidth = 1 + k * 0.4;
          ctx.beginPath();
          ctx.moveTo(0, ky);
          for (var x = 0; x <= W; x += 12) {
            ctx.lineTo(x, ky + Math.sin(t * 0.6 + x * 0.04 + k) * 3);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
    },

    /* ================================================================
       2. BONE FIELD  —  SPUR
       Bone protrusions, antler growths. Bone dust falls. No upward float.
       ================================================================ */
    boneProtrusion: function () {
      var cv  = makeCanvas(mobile ? 40 : 52);
      var ctx = cv.ctx;

      /* bone shapes as path data (normalised 0..1) */
      function drawBone(ctx, ox, oy, W, H, scale, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(ox, oy);
        var s = scale;
        ctx.beginPath();
        /* jagged upward spike with side growths */
        ctx.moveTo(0, 0);
        ctx.lineTo(-W*0.025*s, -H*0.12*s);
        ctx.lineTo(-W*0.012*s, -H*0.22*s);
        ctx.lineTo(-W*0.032*s, -H*0.30*s);  /* side spur left */
        ctx.lineTo(-W*0.008*s, -H*0.28*s);
        ctx.lineTo(-W*0.018*s, -H*0.42*s);
        ctx.lineTo(W*0.004*s,  -H*0.55*s);
        ctx.lineTo(W*0.022*s,  -H*0.42*s);
        ctx.lineTo(W*0.012*s,  -H*0.48*s);  /* side spur right */
        ctx.lineTo(W*0.038*s,  -H*0.35*s);
        ctx.lineTo(W*0.018*s,  -H*0.24*s);
        ctx.lineTo(W*0.028*s,  -H*0.14*s);
        ctx.lineTo(W*0.016*s,  -H*0.06*s);
        ctx.closePath();
        var grad = ctx.createLinearGradient(0, 0, 0, -H * 0.55 * s);
        grad.addColorStop(0,   'rgba(150,138,118,0.95)');
        grad.addColorStop(0.5, 'rgba(195,182,162,0.85)');
        grad.addColorStop(1,   'rgba(210,198,178,0.60)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,70,55,0.6)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }

      /* layout bones */
      var bonePos = [
        {rx:0.08, scale:0.9}, {rx:0.20, scale:0.65},
        {rx:0.35, scale:1.1}, {rx:0.50, scale:0.75},
        {rx:0.62, scale:1.3}, {rx:0.76, scale:0.85},
        {rx:0.88, scale:0.95}
      ];
      if (mobile) bonePos = bonePos.filter(function(_, i) { return i % 2 === 0; });

      /* falling bone dust — particles going DOWN */
      var dust = [];
      var dcount = mobile ? 18 : 40;
      for (var i = 0; i < dcount; i++) {
        dust.push({
          x: rng(0, 1), y: rng(0, 1),
          vy: rng(0.0003, 0.0009),
          r: rng(0.5, 1.8),
          a: rng(0.1, 0.35),
          vx: rng(-0.00015, 0.00015)
        });
      }

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.006;

        /* ground haze */
        var grad = ctx.createLinearGradient(0, H * 0.4, 0, H);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, 'rgba(30,24,18,0.4)');
        grad.addColorStop(1,   'rgba(15,12,8,0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        /* bones rising from bottom on scroll */
        var rise = 0.15 + sc * 0.3;
        for (var i = 0; i < bonePos.length; i++) {
          var bp = bonePos[i];
          var wobble = Math.sin(t + i * 1.3) * 0.003;
          drawBone(ctx,
            bp.rx * W + wobble * W,
            H * (1.05 - rise * bp.scale * 0.5),
            W, H,
            bp.scale * (0.6 + sc * 0.4),
            0.55 + sc * 0.35
          );
        }

        /* dust falling downward */
        for (var j = 0; j < dust.length; j++) {
          var d = dust[j];
          d.y += d.vy;
          d.x += d.vx;
          if (d.y > 1.02) { d.y = -0.02; d.x = rng(0, 1); }
          if (d.x < 0 || d.x > 1) d.vx = -d.vx;
          ctx.beginPath();
          ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(190,178,155,' + d.a + ')';
          ctx.fill();
        }
      });
    },

    /* ================================================================
       3. BLOOD WOOD  —  Kept Warm for the Mountain
       Rough lumber, nails, blood seeping between boards. Cold and brutal.
       ================================================================ */
    frostWindow: function () {
      var cv  = makeCanvas(mobile ? 38 : 50);
      var ctx = cv.ctx;

      /* planks */
      var plankH = 0;  /* set in draw */
      var nailPos = [];
      for (var i = 0; i < 18; i++) {
        nailPos.push({ rx: rng(0, 1), plank: Math.floor(rng(0, 5)), ox: rng(-2, 2) });
      }

      /* blood drip points */
      var drips = [];
      for (var d = 0; d < (mobile ? 6 : 12); d++) {
        drips.push({
          rx: rng(0.05, 0.95),
          seam: Math.floor(rng(0, 4)),
          len: rng(0.04, 0.14),
          a: rng(0.4, 0.85),
          ph: rng(0, 6.28),
          spd: rng(0.001, 0.003)
        });
      }

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.006;

        var numPlanks = 5;
        plankH = H / numPlanks;
        var revealY = H * (1 - (0.3 + sc * 0.7));

        /* draw planks from bottom */
        for (var p = numPlanks - 1; p >= 0; p--) {
          var py = p * plankH;
          if (py < revealY) continue;

          /* plank base */
          var darkness = 0.18 + p * 0.04;
          ctx.fillStyle = 'rgb(' + Math.round(28 + p*3) + ',' + Math.round(18 + p*2) + ',' + Math.round(12 + p*2) + ')';
          ctx.fillRect(0, py, W, plankH - 1);

          /* wood grain lines */
          ctx.save();
          ctx.globalAlpha = 0.15;
          for (var g = 0; g < 6; g++) {
            var gy = py + plankH * (0.1 + g * 0.15);
            ctx.strokeStyle = 'rgba(60,35,20,0.8)';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(0, gy + Math.sin(t * 0.2 + g + p) * 1.5);
            for (var x = 0; x <= W; x += 8) {
              ctx.lineTo(x, gy + Math.sin(t * 0.2 + x * 0.02 + g + p) * 1.5);
            }
            ctx.stroke();
          }
          ctx.restore();

          /* seam gap — blood pools here */
          if (p < numPlanks - 1) {
            var seamY = py - 1;
            ctx.fillStyle = 'rgba(80,8,8,0.9)';
            ctx.fillRect(0, seamY, W, 2);
          }
        }

        /* nails */
        for (var n = 0; n < nailPos.length; n++) {
          var nail = nailPos[n];
          var ny = nail.plank * plankH + plankH * 0.5;
          if (ny < revealY) continue;
          var nx = nail.rx * W + nail.ox;
          ctx.save();
          ctx.shadowBlur = 2; ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.fillStyle = 'rgba(55,50,45,0.95)';
          ctx.beginPath();
          ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(80,75,70,0.7)';
          ctx.beginPath();
          ctx.arc(nx - 1, ny - 1, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        /* blood seeping down from seams */
        for (var dr = 0; dr < drips.length; dr++) {
          var drip = drips[dr];
          drip.ph += drip.spd;
          var seamY2 = drip.seam * plankH;
          if (seamY2 < revealY) continue;
          var dripLen = drip.len * H * (0.4 + sc * 0.6);
          var dripX = drip.rx * W;
          var wiggle = Math.sin(drip.ph) * 1.5;

          var dg = ctx.createLinearGradient(0, seamY2, 0, seamY2 + dripLen);
          dg.addColorStop(0,   'rgba(140,10,10,' + drip.a + ')');
          dg.addColorStop(0.7, 'rgba(100,6,6,' + (drip.a * 0.8) + ')');
          dg.addColorStop(1,   'rgba(70,4,4,0)');
          ctx.strokeStyle = dg;
          ctx.lineWidth = 2 + drip.a * 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(dripX, seamY2);
          ctx.lineTo(dripX + wiggle, seamY2 + dripLen);
          ctx.stroke();

          /* drip tip */
          if (dripLen > H * 0.06) {
            ctx.beginPath();
            ctx.arc(dripX + wiggle, seamY2 + dripLen, 2 + drip.a * 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(110,8,8,' + (drip.a * 0.6) + ')';
            ctx.fill();
          }
        }

        /* vignette */
        var vg = ctx.createLinearGradient(0, 0, 0, H);
        vg.addColorStop(0,   'rgba(0,0,0,0.85)');
        vg.addColorStop(0.3, 'rgba(0,0,0,0.1)');
        vg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      });
    },

    /* ================================================================
       4. BLOOD POOL  —  My Baby
       Medical horror. Dark blood pool. Slow ripples. Clinical wrong.
       ================================================================ */
    nurseryRot: function () {
      var cv  = makeCanvas(mobile ? 36 : 46);
      var ctx = cv.ctx;

      /* ripple rings */
      var rings = [];
      function spawnRing(rx, ry) {
        rings.push({ x: rx, y: ry, r: 0, maxR: rng(0.06, 0.16), spd: rng(0.0003, 0.0007), a: 0.5 });
      }
      if (!reduced) {
        setInterval(function () {
          spawnRing(rng(0.15, 0.85), rng(0.6, 0.95));
        }, 2200);
      }
      spawnRing(0.5, 0.85);
      spawnRing(0.3, 0.75);

      /* medical instruments at edge */
      function drawScalpel(ctx, x, y, angle, W) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(180,165,165,0.55)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W * 0.08, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W * 0.06, 0);
        ctx.lineTo(W * 0.08, W * 0.012);
        ctx.lineTo(W * 0.065, 0);
        ctx.fillStyle = 'rgba(180,165,165,0.45)';
        ctx.fill();
        ctx.restore();
      }

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.007;

        /* pool base */
        var poolTop = H * (0.35 - sc * 0.15);
        var pg = ctx.createLinearGradient(0, poolTop, 0, H);
        pg.addColorStop(0,    'rgba(0,0,0,0)');
        pg.addColorStop(0.2,  'rgba(45,5,5,0.3)');
        pg.addColorStop(0.55, 'rgba(80,6,6,0.65)');
        pg.addColorStop(1,    'rgba(60,4,4,0.92)');
        ctx.fillStyle = pg;
        ctx.fillRect(0, 0, W, H);

        /* pool surface sheen */
        ctx.save();
        ctx.globalAlpha = 0.12 + sc * 0.08;
        var sg = ctx.createLinearGradient(0, H * 0.6, W, H);
        sg.addColorStop(0, 'rgba(160,20,20,0.6)');
        sg.addColorStop(0.5, 'rgba(100,10,10,0.2)');
        sg.addColorStop(1, 'rgba(160,20,20,0.5)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, H * 0.5, W, H * 0.5);
        ctx.restore();

        /* ripple rings */
        for (var i = rings.length - 1; i >= 0; i--) {
          var rg = rings[i];
          rg.r += rg.spd;
          rg.a = Math.max(0, 0.5 * (1 - rg.r / rg.maxR));
          if (rg.r > rg.maxR) { rings.splice(i, 1); continue; }
          ctx.beginPath();
          ctx.ellipse(rg.x * W, rg.y * H,
            rg.r * W, rg.r * W * 0.3,
            0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(180,30,30,' + rg.a + ')';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        /* pale clinical top light */
        var lg = ctx.createLinearGradient(0, 0, 0, H * 0.45);
        lg.addColorStop(0,   'rgba(200,185,185,0.06)');
        lg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, W, H * 0.45);

        /* instruments */
        if (!mobile) {
          drawScalpel(ctx, W * 0.04, H * 0.62, -0.3, W);
          drawScalpel(ctx, W * 0.92, H * 0.58, 2.9, W);
          drawScalpel(ctx, W * 0.15, H * 0.72, 0.4, W);
        }

        /* blood drips from top edge */
        for (var d = 0; d < 5; d++) {
          var dx = (0.1 + d * 0.18) * W;
          var dlen = (0.08 + Math.sin(t * 0.5 + d * 1.8) * 0.04 + sc * 0.05) * H;
          var dg2 = ctx.createLinearGradient(0, 0, 0, dlen);
          dg2.addColorStop(0,   'rgba(120,8,8,0.8)');
          dg2.addColorStop(0.8, 'rgba(90,5,5,0.4)');
          dg2.addColorStop(1,   'rgba(70,4,4,0)');
          ctx.strokeStyle = dg2;
          ctx.lineWidth = 1.5 + d * 0.3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(dx, 0);
          ctx.lineTo(dx + Math.sin(t * 0.4 + d) * 3, dlen);
          ctx.stroke();
        }
      });
    },

    /* ================================================================
       5. CONDEMNED CHURCH  —  Growing Up Independent Baptist
       Dark pews. Hymn board flickers. Stained glass rot. Dust in light.
       ================================================================ */
    churchPaperTrauma: function () {
      var cv  = makeCanvas(mobile ? 42 : 55);
      var ctx = cv.ctx;

      /* hymn board numbers — CSS overlay */
      var hymn = document.createElement('div');
      hymn.className = 'bfx-hymn';
      var hymnNums = [['235', '412', '527'], ['148', '320', '05'], ['391', '212', '78']];
      var hymnIdx = 0;
      function updateHymn() {
        hymn.innerHTML = 'HYMN<br>' + hymnNums[hymnIdx].join('<br>');
        hymnIdx = (hymnIdx + 1) % hymnNums.length;
      }
      updateHymn();
      layer.appendChild(hymn);
      if (!reduced) {
        setInterval(function () {
          hymn.classList.add('bfx-flicker');
          setTimeout(function () {
            updateHymn();
            hymn.classList.remove('bfx-flicker');
          }, 180);
        }, 4800);
      }

      /* stained glass color bleeding */
      var glassColors = [
        'rgba(120,15,15,', 'rgba(80,30,90,', 'rgba(15,50,100,'
      ];

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.005;

        /* deep dark ground */
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0,   'rgba(0,0,0,0)');
        bg.addColorStop(0.3, 'rgba(8,5,5,0.4)');
        bg.addColorStop(1,   'rgba(4,2,2,0.85)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        /* stained glass light shafts bleeding from top */
        var numShafts = 3;
        for (var i = 0; i < numShafts; i++) {
          var sx = W * (0.2 + i * 0.3);
          var sw = W * 0.12;
          var shaftH = H * (0.25 + sc * 0.2 + Math.sin(t * 0.3 + i) * 0.03);
          var gc = glassColors[i % glassColors.length];
          var sg = ctx.createLinearGradient(sx, 0, sx, shaftH);
          sg.addColorStop(0,   gc + (0.12 + sc * 0.06) + ')');
          sg.addColorStop(0.6, gc + '0.04)');
          sg.addColorStop(1,   gc + '0)');
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(sx - sw * 0.5, 0);
          ctx.lineTo(sx + sw * 0.5, 0);
          ctx.lineTo(sx + sw * 1.2, shaftH);
          ctx.lineTo(sx - sw * 1.2, shaftH);
          ctx.closePath();
          ctx.fillStyle = sg;
          ctx.fill();
          ctx.restore();
        }

        /* pew silhouettes rising from bottom on scroll */
        var pewReveal = 0.2 + sc * 0.45;
        var pewBaseY = H * (1 - pewReveal);
        ctx.fillStyle = 'rgba(8,5,4,0.95)';

        var numPews = mobile ? 3 : 5;
        for (var p = 0; p < numPews; p++) {
          var pw = W / numPews;
          var px = p * pw;
          var backH = H * pewReveal * 0.65;
          var seatH = H * pewReveal * 0.12;

          /* pew back */
          ctx.fillStyle = 'rgba(12,7,5,0.95)';
          ctx.fillRect(px + pw * 0.08, pewBaseY, pw * 0.82, backH);
          /* pew seat ledge */
          ctx.fillStyle = 'rgba(20,12,8,0.9)';
          ctx.fillRect(px + pw * 0.04, pewBaseY + backH, pw * 0.9, seatH);
          /* vertical support */
          ctx.fillStyle = 'rgba(8,4,3,0.9)';
          ctx.fillRect(px + pw * 0.06, pewBaseY, pw * 0.06, backH + seatH);
          ctx.fillRect(px + pw * 0.86, pewBaseY, pw * 0.06, backH + seatH);
        }

        /* dust motes in shafts — falling slowly */
        ctx.globalAlpha = 0.3 + sc * 0.15;
        for (var m = 0; m < (mobile ? 12 : 25); m++) {
          var mt = (t * 0.4 + m * 0.41) % 1;
          var mx = W * (0.15 + (m % 3) * 0.3) + Math.sin(t * 0.5 + m) * W * 0.03;
          var my = mt * H;
          ctx.beginPath();
          ctx.arc(mx, my, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(210,190,160,0.6)';
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* floor darkness */
        var fg = ctx.createLinearGradient(0, H * 0.85, 0, H);
        fg.addColorStop(0, 'rgba(0,0,0,0)');
        fg.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, H * 0.85, W, H * 0.15);
      });
    },

    /* ================================================================
       6. OCCULT DARK  —  Angels / The Devil Finds a Home (shared)
       Sigil circles. Black ash falling. Deep red. Corrupted presence.
       ================================================================ */
    occultVeil: function () {
      var cv  = makeCanvas(mobile ? 40 : 52);
      var ctx = cv.ctx;

      /* ash motes — falling */
      var ash = [];
      for (var i = 0; i < (mobile ? 20 : 45); i++) {
        ash.push({
          x: rng(0, 1), y: rng(0, 1),
          vy: rng(0.0002, 0.0006),
          vx: rng(-0.0001, 0.0001),
          r: rng(0.8, 2.2),
          a: rng(0.08, 0.28)
        });
      }

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.005;

        /* deep red/black base */
        var bg = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, W * 0.8);
        bg.addColorStop(0,   'rgba(80,8,8,' + (0.25 + sc * 0.25) + ')');
        bg.addColorStop(0.5, 'rgba(35,5,5,0.4)');
        bg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        /* sigil circles at bottom */
        var numCircles = mobile ? 2 : 3;
        for (var c = 0; c < numCircles; c++) {
          var cx2 = W * (0.2 + c * 0.3);
          var cy2 = H * (0.8 + Math.sin(t * 0.4 + c) * 0.02);
          var cr  = W * (0.06 + c * 0.02 + sc * 0.03);
          var ang = t * (0.3 + c * 0.1);

          ctx.save();
          ctx.globalAlpha = 0.25 + sc * 0.2;

          /* outer circle */
          ctx.beginPath();
          ctx.arc(cx2, cy2, cr, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(160,20,20,0.7)';
          ctx.lineWidth = 1;
          ctx.stroke();

          /* inner rotating geometry */
          var pts = c % 2 === 0 ? 5 : 6;
          ctx.beginPath();
          for (var v = 0; v <= pts; v++) {
            var va = ang + (v / pts) * Math.PI * 2;
            var vr = v % 2 === 0 ? cr * 0.85 : cr * 0.45;
            if (v === 0) ctx.moveTo(cx2 + Math.cos(va) * vr, cy2 + Math.sin(va) * vr);
            else ctx.lineTo(cx2 + Math.cos(va) * vr, cy2 + Math.sin(va) * vr);
          }
          ctx.strokeStyle = 'rgba(180,25,25,0.5)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
        }

        /* candle glow points */
        var candles = mobile ? 2 : 4;
        for (var cl = 0; cl < candles; cl++) {
          var clx = W * (0.1 + cl * 0.25);
          var cly = H * (0.55 + Math.sin(t * 0.8 + cl * 1.6) * 0.02);
          var flicker = 0.06 + Math.sin(t * 3.5 + cl * 2.1) * 0.02;
          var cg = ctx.createRadialGradient(clx, cly, 0, clx, cly, W * 0.12);
          cg.addColorStop(0,   'rgba(255,160,40,' + flicker * 3 + ')');
          cg.addColorStop(0.3, 'rgba(180,60,10,' + flicker * 1.5 + ')');
          cg.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = cg;
          ctx.fillRect(0, 0, W, H);
        }

        /* ash falling */
        for (var a = 0; a < ash.length; a++) {
          var ak = ash[a];
          ak.y += ak.vy;
          ak.x += ak.vx + Math.sin(t * 0.8 + a * 0.7) * 0.0002;
          if (ak.y > 1.02) { ak.y = -0.02; ak.x = rng(0, 1); }
          if (ak.x < 0 || ak.x > 1) ak.vx = -ak.vx;
          ctx.beginPath();
          ctx.arc(ak.x * W, ak.y * H, ak.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(30,20,20,' + ak.a + ')';
          ctx.fill();
        }
      });
    },

    /* ================================================================
       7. EMBER HOLLOW  —  The Devil Finds a Home
       Deep shadow. Corrupted presence. Embers rising from below.
       Dark warmth that is wrong.
       ================================================================ */
    emberHollow: function () {
      var cv  = makeCanvas(mobile ? 38 : 50);
      var ctx = cv.ctx;

      /* embers — sparse, slow, few */
      var embers = [];
      for (var i = 0; i < (mobile ? 8 : 16); i++) {
        embers.push({
          x: rng(0.1, 0.9), y: rng(0.4, 1.1),
          vy: rng(0.0003, 0.0009),
          r: rng(0.8, 2.4),
          a: rng(0.3, 0.7),
          ph: rng(0, 6.28)
        });
      }

      /* lantern glow — follows pointer on desktop */
      var lanternX = 0.5, lanternY = 0.45;
      if (!reduced && !mobile) {
        window.addEventListener('mousemove', function (e) {
          lanternX = e.clientX / window.innerWidth;
          lanternY = 1 - (e.clientY / window.innerHeight);
        }, { passive: true });
      }

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.007;

        /* deep shadow base */
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0,    'rgba(0,0,0,0)');
        bg.addColorStop(0.25, 'rgba(15,8,4,0.3)');
        bg.addColorStop(0.65, 'rgba(35,16,6,0.55)');
        bg.addColorStop(1,    'rgba(20,8,3,0.85)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        /* lantern warmth */
        var lx = lanternX * W;
        var ly = (1 - lanternY) * H * 0.7;
        var flicker = Math.sin(t * 4.2) * 0.015 + Math.sin(t * 7.1) * 0.008;
        var lIntensity = 0.18 + sc * 0.12 + flicker;
        var lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.45);
        lg.addColorStop(0,   'rgba(220,110,30,' + lIntensity + ')');
        lg.addColorStop(0.3, 'rgba(150,55,15,' + lIntensity * 0.6 + ')');
        lg.addColorStop(0.7, 'rgba(80,25,8,' + lIntensity * 0.25 + ')');
        lg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, W, H);

        /* embers rising from bottom — few and slow */
        for (var i = 0; i < embers.length; i++) {
          var e = embers[i];
          e.y -= e.vy;
          e.ph += 0.02;
          e.x += Math.sin(e.ph) * 0.0004;
          if (e.y < -0.02) { e.y = 1.05; e.x = rng(0.1, 0.9); }
          var ea = e.a * Math.min(1, e.y * 6) * (0.5 + sc * 0.5);
          ctx.beginPath();
          ctx.arc(e.x * W, e.y * H, e.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(230,100,25,' + ea + ')';
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(220,90,20,0.6)';
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        /* deep corner shadows */
        var ls = ctx.createLinearGradient(0, 0, W * 0.35, 0);
        ls.addColorStop(0, 'rgba(0,0,0,0.6)');
        ls.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ls; ctx.fillRect(0, 0, W * 0.35, H);
        var rs = ctx.createLinearGradient(W, 0, W * 0.65, 0);
        rs.addColorStop(0, 'rgba(0,0,0,0.6)');
        rs.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rs; ctx.fillRect(W * 0.65, 0, W * 0.35, H);
      });
    }

  };

  (EFFECTS[theme] || function () {})();
})();
