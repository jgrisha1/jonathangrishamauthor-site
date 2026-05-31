/* ============================================================
   book-effects.js  v4 — Extreme Horror Atmospheres
   Reads <body data-book-effect="...">
   Each effect is a canvas anchored at the bottom of the viewport.
   No bubbles. No floating particles. Dark, oppressive, thematic.
   Environmental storytelling. Unease over jumpscares.
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
     Thick suffocating ooze. Gas pockets. CRT interference. Containment breach.
     No bubbles. Only thick, suffocating ooze and rising gas pockets.
     ================================================================ */
  var EFFECTS = {

    orangeGooSignal: function () {
      var cv  = makeCanvas(mobile ? 52 : 68);
      var ctx = cv.ctx;

      /* slow-deforming ooze blobs — more, bigger, darker */
      var blobs = [];
      var bcount = mobile ? 8 : 14;
      for (var i = 0; i < bcount; i++) {
        blobs.push({
          x: rng(0.02, 0.98), y: 0.5 + rng(0, 0.5),
          rx: rng(0.10, 0.28), ry: rng(0.05, 0.16),
          ph: rng(0, 6.28), spd: rng(0.0003, 0.0009),
          col: 'rgba(' + Math.round(rng(150,230)) + ',' + Math.round(rng(45,85)) + ',8,'
        });
      }

      /* gas pockets — slow vertical rise, thick and oppressive */
      var pockets = [];
      var pcount = mobile ? 5 : 10;
      for (var j = 0; j < pcount; j++) {
        pockets.push({
          x: rng(0, 1), y: rng(0.6, 1.1),
          r: rng(0.015, 0.055), vy: rng(0.00012, 0.00035),
          a: rng(0.35, 0.65), delay: rng(0, 600)
        });
      }

      /* scan line overlay — drawn via CSS, just need signal text */
      var sig = document.createElement('div');
      sig.className = 'bfx-signal';
      var msgs = ['CONTAINMENT BREACH', 'SIGNAL LOST', 'NO SAFE EXIT',
                  'DOORS SEALED', 'TRANSMISSION ENDS', 'MONSTER DETECTED',
                  'EXPOSURE CRITICAL', 'EVACUATE FAILED'];
      sig.textContent = msgs[0];
      layer.appendChild(sig);
      if (!reduced) {
        var midx = 0, last = 0;
        window.addEventListener('scroll', function () {
          var now = Date.now();
          if (now - last < 2400) return;
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

        /* base ooze gradient — heavy and suffocating */
        var grad = ctx.createLinearGradient(0, H * 0.05, 0, H);
        grad.addColorStop(0,    'rgba(0,0,0,0)');
        grad.addColorStop(0.22, 'rgba(70,22,3,' + (0.48 + sc * 0.15) + ')');
        grad.addColorStop(0.55, 'rgba(120,40,6,' + (0.78 + sc * 0.12) + ')');
        grad.addColorStop(0.82, 'rgba(155,52,8,' + (0.90 + sc * 0.08) + ')');
        grad.addColorStop(1,    'rgba(140,48,6,0.97)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        /* ooze blobs — heavier, slower deforming mass */
        for (var i = 0; i < blobs.length; i++) {
          var b = blobs[i];
          b.ph += b.spd * (1 + sc * 0.6);
          var bx = b.x * W + Math.sin(b.ph * 1.1) * W * 0.025;
          var by = (b.y - sc * 0.12) * H;
          var alpha = 0.52 + sc * 0.28;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(bx, by, b.rx * W + Math.sin(b.ph * 0.6) * W * 0.015,
            b.ry * H + Math.cos(b.ph) * H * 0.012, b.ph * 0.25, 0, Math.PI * 2);
          var rg = ctx.createRadialGradient(bx, by, 0, bx, by, b.rx * W);
          rg.addColorStop(0,   b.col + Math.min(0.98, alpha + 0.32) + ')');
          rg.addColorStop(0.5, b.col + alpha + ')');
          rg.addColorStop(1,   b.col + '0)');
          ctx.fillStyle = rg;
          ctx.filter = 'blur(4px)';
          ctx.fill();
          ctx.restore();
        }

        /* gas pockets — thick, slow rise, no pop */
        for (var j = 0; j < pockets.length; j++) {
          var p = pockets[j];
          if (Date.now() < p.delay) continue;
          p.y -= p.vy;
          if (p.y < -0.08) { p.y = 1.08; p.x = rng(0, 1); }
          var px = p.x * W, py = p.y * H;
          var pr = p.r * W * (1 + sc * 0.4);
          var fade = Math.min(1, (1.08 - p.y) * 6) * p.a;
          ctx.beginPath();
          ctx.ellipse(px, py, pr * 1.8, pr * 0.9, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(210,85,12,' + fade * 0.85 + ')';
          ctx.filter = 'blur(5px)';
          ctx.fill();
          ctx.filter = 'none';
        }

        /* surface texture striations — rusted pipe seams */
        ctx.globalAlpha = 0.18 + sc * 0.12;
        for (var k = 0; k < 8; k++) {
          var ky = H * (0.45 + k * 0.07 + Math.sin(t + k * 0.8) * 0.018);
          ctx.strokeStyle = 'rgba(200,90,18,0.7)';
          ctx.lineWidth = 1 + k * 0.3;
          ctx.beginPath();
          ctx.moveTo(0, ky);
          for (var x = 0; x <= W; x += 10) {
            ctx.lineTo(x, ky + Math.sin(t * 0.5 + x * 0.035 + k) * 4);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        /* top edge drip mass */
        ctx.globalAlpha = 0.55 + sc * 0.25;
        var topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.28);
        topGrad.addColorStop(0, 'rgba(180,60,8,0.85)');
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, W, H * 0.28);
        ctx.globalAlpha = 1;
      });
    },

    /* ================================================================
       2. BONE FIELD  —  SPUR
       Bone protrusions, antler growths. Bone dust falls. Dry. Merciless.
       No comfort. No mercy.
       ================================================================ */
    boneProtrusion: function () {
      var cv  = makeCanvas(mobile ? 58 : 72);
      var ctx = cv.ctx;

      /* bone shapes as path data (normalised 0..1) */
      function drawBone(ctx, ox, oy, W, H, scale, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(ox, oy);
        var s = scale;
        ctx.beginPath();
        /* jagged upward spike with side growths — more angular and brutal */
        ctx.moveTo(0, 0);
        ctx.lineTo(-W*0.028*s, -H*0.11*s);
        ctx.lineTo(-W*0.014*s, -H*0.22*s);
        ctx.lineTo(-W*0.038*s, -H*0.32*s);  /* spur left */
        ctx.lineTo(-W*0.010*s, -H*0.30*s);
        ctx.lineTo(-W*0.022*s, -H*0.46*s);
        ctx.lineTo(W*0.002*s,  -H*0.62*s);
        ctx.lineTo(W*0.024*s,  -H*0.46*s);
        ctx.lineTo(W*0.014*s,  -H*0.52*s);  /* spur right */
        ctx.lineTo(W*0.042*s,  -H*0.38*s);
        ctx.lineTo(W*0.020*s,  -H*0.26*s);
        ctx.lineTo(W*0.032*s,  -H*0.15*s);
        ctx.lineTo(W*0.018*s,  -H*0.06*s);
        ctx.closePath();
        var grad = ctx.createLinearGradient(0, 0, 0, -H * 0.62 * s);
        grad.addColorStop(0,   'rgba(140,128,108,0.98)');
        grad.addColorStop(0.4, 'rgba(192,178,155,0.92)');
        grad.addColorStop(0.8, 'rgba(210,196,172,0.75)');
        grad.addColorStop(1,   'rgba(225,212,190,0.50)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,50,38,0.75)';
        ctx.lineWidth = 1.0;
        ctx.stroke();
        /* hairline crack detail */
        ctx.beginPath();
        ctx.moveTo(-W*0.004*s, -H*0.18*s);
        ctx.lineTo(W*0.008*s,  -H*0.28*s);
        ctx.strokeStyle = 'rgba(90,78,62,0.35)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();
      }

      /* layout bones — more, wider spread */
      var bonePos = [
        {rx:0.05, scale:0.85}, {rx:0.15, scale:0.60},
        {rx:0.26, scale:1.05}, {rx:0.38, scale:0.72},
        {rx:0.50, scale:1.35}, {rx:0.62, scale:0.90},
        {rx:0.73, scale:1.15}, {rx:0.84, scale:0.68},
        {rx:0.93, scale:1.00}
      ];
      if (mobile) bonePos = bonePos.filter(function(_, i) { return i % 2 === 0; });

      /* falling bone dust — particles going DOWN */
      var dust = [];
      var dcount = mobile ? 30 : 65;
      for (var i = 0; i < dcount; i++) {
        dust.push({
          x: rng(0, 1), y: rng(0, 1),
          vy: rng(0.0003, 0.0010),
          r: rng(0.4, 2.2),
          a: rng(0.15, 0.45),
          vx: rng(-0.00018, 0.00018)
        });
      }

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.006;

        /* ground darkness — heavy and oppressive */
        var grad = ctx.createLinearGradient(0, H * 0.28, 0, H);
        grad.addColorStop(0,   'rgba(0,0,0,0)');
        grad.addColorStop(0.38,'rgba(22,16,10,0.55)');
        grad.addColorStop(0.72,'rgba(12,8,4,0.80)');
        grad.addColorStop(1,   'rgba(6,4,2,0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        /* sickly pale ground fog — low and thick */
        var fog = ctx.createLinearGradient(0, H * 0.72, 0, H);
        fog.addColorStop(0, 'rgba(0,0,0,0)');
        fog.addColorStop(1, 'rgba(185,172,148,' + (0.08 + sc * 0.06) + ')');
        ctx.fillStyle = fog;
        ctx.fillRect(0, H * 0.72, W, H * 0.28);

        /* bones rising — bigger, more prominent, start higher */
        var rise = 0.28 + sc * 0.48;
        for (var i = 0; i < bonePos.length; i++) {
          var bp = bonePos[i];
          var wobble = Math.sin(t * 0.8 + i * 1.4) * 0.002;
          drawBone(ctx,
            bp.rx * W + wobble * W,
            H * (1.02 - rise * bp.scale * 0.5),
            W, H,
            bp.scale * (0.82 + sc * 0.45),
            0.78 + sc * 0.20
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
          ctx.fillStyle = 'rgba(188,175,150,' + d.a + ')';
          ctx.fill();
        }

        /* bone marrow stain at base */
        var stain = ctx.createLinearGradient(0, H * 0.88, 0, H);
        stain.addColorStop(0, 'rgba(0,0,0,0)');
        stain.addColorStop(1, 'rgba(165,148,118,' + (0.12 + sc * 0.10) + ')');
        ctx.fillStyle = stain;
        ctx.fillRect(0, H * 0.88, W, H * 0.12);
      });
    },

    /* ================================================================
       3. BLOOD WOOD  —  Kept Warm for the Mountain
       Rough lumber, nails, screws. Blood seeping through seams.
       Cold rot and brutality. Nails, boards — everything violent.
       ================================================================ */
    frostWindow: function () {
      var cv  = makeCanvas(mobile ? 54 : 70);
      var ctx = cv.ctx;

      /* nails — more of them, bigger */
      var nailPos = [];
      for (var i = 0; i < 28; i++) {
        nailPos.push({ rx: rng(0, 1), plank: Math.floor(rng(0, 6)), ox: rng(-3, 3), r: rng(3, 5.5) });
      }

      /* blood drip points — more, heavier */
      var drips = [];
      for (var d = 0; d < (mobile ? 10 : 20); d++) {
        drips.push({
          rx: rng(0.02, 0.98),
          seam: Math.floor(rng(0, 5)),
          len: rng(0.06, 0.20),
          a: rng(0.55, 0.92),
          ph: rng(0, 6.28),
          spd: rng(0.0008, 0.0025),
          w: rng(1.5, 4)
        });
      }

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.005;

        var numPlanks = 6;
        var plankH = H / numPlanks;
        var revealY = H * (1 - (0.35 + sc * 0.65));

        /* draw planks from bottom — darker, more decayed */
        for (var p = numPlanks - 1; p >= 0; p--) {
          var py = p * plankH;
          if (py < revealY) continue;

          /* plank base — darker, more aged */
          var rVal = Math.round(22 + p * 3);
          var gVal = Math.round(13 + p * 2);
          var bVal = Math.round(8 + p * 1);
          ctx.fillStyle = 'rgb(' + rVal + ',' + gVal + ',' + bVal + ')';
          ctx.fillRect(0, py, W, plankH - 2);

          /* wood grain — more prominent */
          ctx.save();
          ctx.globalAlpha = 0.28;
          for (var g = 0; g < 9; g++) {
            var gy = py + plankH * (0.06 + g * 0.1);
            ctx.strokeStyle = 'rgba(48,26,14,0.9)';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(0, gy + Math.sin(t * 0.15 + g + p) * 2);
            for (var x = 0; x <= W; x += 8) {
              ctx.lineTo(x, gy + Math.sin(t * 0.15 + x * 0.018 + g + p * 0.5) * 2.5);
            }
            ctx.stroke();
          }
          ctx.restore();

          /* splinter texture */
          if (rng(0,1) < 0.4) {
            ctx.save();
            ctx.globalAlpha = 0.12;
            ctx.strokeStyle = 'rgba(80,45,22,0.8)';
            ctx.lineWidth = 1;
            var sx = rng(0, W);
            ctx.beginPath();
            ctx.moveTo(sx, py + plankH * 0.1);
            ctx.lineTo(sx + rng(-12, 12), py + plankH * 0.9);
            ctx.stroke();
            ctx.restore();
          }

          /* seam gap — blood pools here — wider and darker */
          if (p < numPlanks - 1) {
            var seamY = py - 2;
            ctx.fillStyle = 'rgba(65,4,4,0.95)';
            ctx.fillRect(0, seamY, W, 3);
          }
        }

        /* nails — bigger, more menacing */
        for (var n = 0; n < nailPos.length; n++) {
          var nail = nailPos[n];
          var ny = nail.plank * plankH + plankH * 0.5;
          if (ny < revealY) continue;
          var nx = nail.rx * W + nail.ox;
          var nr = nail.r;
          ctx.save();
          ctx.shadowBlur = 3;
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          /* nail head */
          ctx.fillStyle = 'rgba(48,44,40,0.98)';
          ctx.beginPath();
          ctx.arc(nx, ny, nr, 0, Math.PI * 2);
          ctx.fill();
          /* nail highlight */
          ctx.fillStyle = 'rgba(85,80,74,0.65)';
          ctx.beginPath();
          ctx.arc(nx - nr * 0.35, ny - nr * 0.35, nr * 0.4, 0, Math.PI * 2);
          ctx.fill();
          /* blood ring around some nails */
          if (nr > 4) {
            ctx.strokeStyle = 'rgba(110,5,5,0.55)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(nx, ny, nr + 2.5, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }

        /* blood seeping — heavier, more opaque, longer drips */
        for (var dr = 0; dr < drips.length; dr++) {
          var drip = drips[dr];
          drip.ph += drip.spd;
          var seamY2 = drip.seam * plankH;
          if (seamY2 < revealY) continue;
          var dripLen = drip.len * H * (0.5 + sc * 0.5);
          var dripX = drip.rx * W;
          var wiggle = Math.sin(drip.ph) * 2.5;

          var dg = ctx.createLinearGradient(0, seamY2, 0, seamY2 + dripLen);
          dg.addColorStop(0,   'rgba(145,8,8,' + drip.a + ')');
          dg.addColorStop(0.5, 'rgba(108,5,5,' + (drip.a * 0.88) + ')');
          dg.addColorStop(0.85,'rgba(78,3,3,' + (drip.a * 0.65) + ')');
          dg.addColorStop(1,   'rgba(55,2,2,0)');
          ctx.strokeStyle = dg;
          ctx.lineWidth = drip.w + drip.a * 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(dripX, seamY2);
          ctx.quadraticCurveTo(dripX + wiggle * 0.5, seamY2 + dripLen * 0.5, dripX + wiggle, seamY2 + dripLen);
          ctx.stroke();

          /* drip bulge at tip */
          if (dripLen > H * 0.05) {
            ctx.beginPath();
            ctx.arc(dripX + wiggle, seamY2 + dripLen, 2.5 + drip.a * 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(120,6,6,' + (drip.a * 0.72) + ')';
            ctx.fill();
          }
        }

        /* darkness vignette — heavy top fade */
        var vg = ctx.createLinearGradient(0, 0, 0, H);
        vg.addColorStop(0,   'rgba(0,0,0,0.90)');
        vg.addColorStop(0.25,'rgba(0,0,0,0.18)');
        vg.addColorStop(0.65,'rgba(0,0,0,0.05)');
        vg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      });
    },

    /* ================================================================
       4. BLOOD POOL / MEDICAL HORROR  —  My Baby
       Dark blood pool, slow clinical ripples. Pale sickly light.
       Surgical instruments. Fetal dread. Wrong in every detail.
       ================================================================ */
    nurseryRot: function () {
      var cv  = makeCanvas(mobile ? 54 : 68);
      var ctx = cv.ctx;

      /* ripple rings — spawn faster, more rings at once */
      var rings = [];
      function spawnRing(rx, ry) {
        rings.push({ x: rx, y: ry, r: 0, maxR: rng(0.05, 0.18), spd: rng(0.0004, 0.0009), a: 0.65 });
      }
      if (!reduced) {
        setInterval(function () {
          spawnRing(rng(0.1, 0.9), rng(0.58, 0.95));
        }, 1600);
      }
      spawnRing(0.5, 0.82);
      spawnRing(0.28, 0.72);
      spawnRing(0.72, 0.78);
      spawnRing(0.42, 0.90);

      /* medical instruments at edge */
      function drawScalpel(ctx, x, y, angle, W) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(188,172,172,0.72)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W * 0.09, 0);
        ctx.stroke();
        /* blade edge */
        ctx.beginPath();
        ctx.moveTo(W * 0.065, 0);
        ctx.lineTo(W * 0.09,  W * 0.014);
        ctx.lineTo(W * 0.072, 0);
        ctx.fillStyle = 'rgba(188,172,172,0.58)';
        ctx.fill();
        /* handle notch */
        ctx.strokeStyle = 'rgba(140,125,125,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W * 0.015, -W * 0.003);
        ctx.lineTo(W * 0.015,  W * 0.003);
        ctx.stroke();
        ctx.restore();
      }

      /* tubing / cord suggestion */
      function drawTube(ctx, x1, y1, x2, y2, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(160,140,130,0.6)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1 + 30, y1 - 20, x2 - 30, y2 + 20, x2, y2);
        ctx.stroke();
        ctx.restore();
      }

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.007;

        /* pool base — dark, viscous, spreading */
        var poolTop = H * (0.28 - sc * 0.16);
        var pg = ctx.createLinearGradient(0, poolTop, 0, H);
        pg.addColorStop(0,    'rgba(0,0,0,0)');
        pg.addColorStop(0.15, 'rgba(38,3,3,' + (0.45 + sc * 0.15) + ')');
        pg.addColorStop(0.42, 'rgba(72,4,4,' + (0.78 + sc * 0.12) + ')');
        pg.addColorStop(0.72, 'rgba(58,3,3,' + (0.90 + sc * 0.08) + ')');
        pg.addColorStop(1,    'rgba(42,2,2,0.97)');
        ctx.fillStyle = pg;
        ctx.fillRect(0, 0, W, H);

        /* pool surface sheen — like a wet operating floor */
        ctx.save();
        ctx.globalAlpha = 0.20 + sc * 0.12;
        var sg = ctx.createLinearGradient(0, H * 0.55, W, H);
        sg.addColorStop(0,   'rgba(155,15,15,0.7)');
        sg.addColorStop(0.4, 'rgba(90,6,6,0.25)');
        sg.addColorStop(0.8, 'rgba(155,15,15,0.6)');
        sg.addColorStop(1,   'rgba(60,3,3,0.8)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, H * 0.45, W, H * 0.55);
        ctx.restore();

        /* ripple rings — thin, clinical, wrong */
        for (var i = rings.length - 1; i >= 0; i--) {
          var rg = rings[i];
          rg.r += rg.spd;
          rg.a = Math.max(0, 0.65 * (1 - rg.r / rg.maxR));
          if (rg.r > rg.maxR) { rings.splice(i, 1); continue; }
          ctx.beginPath();
          ctx.ellipse(rg.x * W, rg.y * H,
            rg.r * W, rg.r * W * 0.28,
            0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(190,28,28,' + rg.a + ')';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        /* pale clinical top light — cold, fluorescent wrong */
        var lg = ctx.createLinearGradient(0, 0, 0, H * 0.42);
        lg.addColorStop(0,   'rgba(195,180,178,0.08)');
        lg.addColorStop(0.6, 'rgba(160,145,145,0.03)');
        lg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, W, H * 0.42);

        /* instruments — more of them */
        if (!mobile) {
          drawScalpel(ctx, W * 0.03, H * 0.60, -0.28, W);
          drawScalpel(ctx, W * 0.91, H * 0.56, 2.88, W);
          drawScalpel(ctx, W * 0.12, H * 0.70, 0.42, W);
          drawScalpel(ctx, W * 0.82, H * 0.68, -2.6, W);
          drawTube(ctx, W * 0.04, H * 0.52, W * 0.18, H * 0.65, 0.18 + sc * 0.12);
          drawTube(ctx, W * 0.88, H * 0.58, W * 0.72, H * 0.72, 0.15 + sc * 0.10);
        }

        /* blood drips from top edge — heavier and more numerous */
        for (var d = 0; d < 8; d++) {
          var dx = (0.06 + d * 0.12) * W;
          var dlen = (0.10 + Math.sin(t * 0.4 + d * 1.6) * 0.05 + sc * 0.07) * H;
          var dg2 = ctx.createLinearGradient(0, 0, 0, dlen);
          dg2.addColorStop(0,   'rgba(130,6,6,0.88)');
          dg2.addColorStop(0.7, 'rgba(96,4,4,0.52)');
          dg2.addColorStop(1,   'rgba(72,3,3,0)');
          ctx.strokeStyle = dg2;
          ctx.lineWidth = 2 + d * 0.28;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(dx, 0);
          ctx.lineTo(dx + Math.sin(t * 0.35 + d) * 4, dlen);
          ctx.stroke();
        }
      });
    },

    /* ================================================================
       5. CONDEMNED CHURCH  —  Growing Up Independent Baptist
       Dark pews. Rotting stained glass light. Hymn board flickers.
       Hell behind the glass. Scripture defiled.
       ================================================================ */
    churchPaperTrauma: function () {
      var cv  = makeCanvas(mobile ? 58 : 74);
      var ctx = cv.ctx;

      /* hymn board numbers — CSS overlay */
      var hymn = document.createElement('div');
      hymn.className = 'bfx-hymn';
      var hymnNums = [['235', '412', '527'], ['148', '320', '05'], ['391', '212', '78'],
                      ['001', '666', '---'], ['088', '521', '13']];
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
        }, 4200);
      }

      /* stained glass color bleeding — deeper, more corrupted */
      var glassColors = [
        'rgba(110,8,8,',  'rgba(65,22,80,',  'rgba(10,42,92,'
      ];

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.004;

        /* deep dark ground — oppressive and total */
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0,   'rgba(0,0,0,0)');
        bg.addColorStop(0.22,'rgba(6,3,3,0.55)');
        bg.addColorStop(0.62,'rgba(3,1,1,0.82)');
        bg.addColorStop(1,   'rgba(2,1,1,0.96)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        /* stained glass shafts — wider, heavier, bleeding */
        var numShafts = mobile ? 2 : 4;
        for (var i = 0; i < numShafts; i++) {
          var sx = W * (0.14 + i * 0.24);
          var sw = W * 0.10;
          var shaftH = H * (0.32 + sc * 0.22 + Math.sin(t * 0.25 + i * 0.8) * 0.04);
          var gc = glassColors[i % glassColors.length];
          var shaftAlpha = 0.22 + sc * 0.14;
          var sg = ctx.createLinearGradient(sx, 0, sx, shaftH);
          sg.addColorStop(0,   gc + shaftAlpha + ')');
          sg.addColorStop(0.5, gc + (shaftAlpha * 0.55) + ')');
          sg.addColorStop(1,   gc + '0)');
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(sx - sw * 0.6, 0);
          ctx.lineTo(sx + sw * 0.6, 0);
          ctx.lineTo(sx + sw * 1.5, shaftH);
          ctx.lineTo(sx - sw * 1.5, shaftH);
          ctx.closePath();
          ctx.fillStyle = sg;
          ctx.fill();
          ctx.restore();
        }

        /* pew silhouettes — larger, more solid, more threatening */
        var pewReveal = 0.28 + sc * 0.52;
        var pewBaseY = H * (1 - pewReveal);

        var numPews = mobile ? 3 : 6;
        for (var p = 0; p < numPews; p++) {
          var pw = W / numPews;
          var px = p * pw;
          var backH = H * pewReveal * 0.70;
          var seatH = H * pewReveal * 0.14;

          /* pew back — solid, imposing */
          ctx.fillStyle = 'rgba(10,5,4,0.98)';
          ctx.fillRect(px + pw * 0.06, pewBaseY, pw * 0.84, backH);
          /* pew seat ledge */
          ctx.fillStyle = 'rgba(18,10,7,0.95)';
          ctx.fillRect(px + pw * 0.02, pewBaseY + backH, pw * 0.94, seatH);
          /* vertical supports */
          ctx.fillStyle = 'rgba(6,3,2,0.98)';
          ctx.fillRect(px + pw * 0.04, pewBaseY, pw * 0.07, backH + seatH);
          ctx.fillRect(px + pw * 0.86, pewBaseY, pw * 0.07, backH + seatH);
          /* top cap detail */
          ctx.fillStyle = 'rgba(25,14,9,0.9)';
          ctx.fillRect(px + pw * 0.04, pewBaseY - 2, pw * 0.89, 4);
        }

        /* dust motes in shafts — falling slowly, more visible */
        ctx.globalAlpha = 0.45 + sc * 0.22;
        for (var m = 0; m < (mobile ? 16 : 36); m++) {
          var mt = (t * 0.38 + m * 0.38) % 1;
          var mx = W * (0.10 + (m % 4) * 0.24) + Math.sin(t * 0.4 + m) * W * 0.025;
          var my = mt * H;
          ctx.beginPath();
          ctx.arc(mx, my, 0.9, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(215,195,165,0.65)';
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* floor darkness — total at bottom */
        var fg = ctx.createLinearGradient(0, H * 0.80, 0, H);
        fg.addColorStop(0, 'rgba(0,0,0,0)');
        fg.addColorStop(1, 'rgba(0,0,0,0.88)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, H * 0.80, W, H * 0.20);
      });
    },

    /* ================================================================
       6. OCCULT DARK  —  Angels / The Devil Finds a Home (shared)
       Sigil circles. Black ash. Candle fire. Corrupted presence. Eyes.
       ================================================================ */
    occultVeil: function () {
      var cv  = makeCanvas(mobile ? 56 : 70);
      var ctx = cv.ctx;

      /* ash motes — more, more visible */
      var ash = [];
      for (var i = 0; i < (mobile ? 32 : 65); i++) {
        ash.push({
          x: rng(0, 1), y: rng(0, 1),
          vy: rng(0.00018, 0.00055),
          vx: rng(-0.00012, 0.00012),
          r: rng(0.7, 2.5),
          a: rng(0.12, 0.38)
        });
      }

      var t = 0;
      loop(function (sc) {
        var W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        t += 0.005;

        /* deep red-to-black base — oppressive */
        var bg = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, W * 0.9);
        bg.addColorStop(0,    'rgba(88,6,6,' + (0.45 + sc * 0.30) + ')');
        bg.addColorStop(0.35, 'rgba(42,3,3,' + (0.55 + sc * 0.15) + ')');
        bg.addColorStop(0.7,  'rgba(18,1,1,0.55)');
        bg.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        /* sigil circles — larger, more visible, more sinister */
        var numCircles = mobile ? 2 : 4;
        for (var c = 0; c < numCircles; c++) {
          var cx2 = W * (0.15 + c * 0.24);
          var cy2 = H * (0.78 + Math.sin(t * 0.35 + c * 1.2) * 0.025);
          var cr  = W * (0.07 + c * 0.018 + sc * 0.035);
          var ang = t * (0.28 + c * 0.08);

          ctx.save();
          ctx.globalAlpha = 0.45 + sc * 0.35;

          /* outer circle */
          ctx.beginPath();
          ctx.arc(cx2, cy2, cr, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(175,18,18,0.85)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          /* second ring */
          ctx.beginPath();
          ctx.arc(cx2, cy2, cr * 0.72, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(140,12,12,0.45)';
          ctx.lineWidth = 0.7;
          ctx.stroke();

          /* inner rotating geometry — pentagram / hexagram */
          var pts = c % 2 === 0 ? 5 : 6;
          ctx.beginPath();
          for (var v = 0; v <= pts; v++) {
            var va = ang + (v / pts) * Math.PI * 2;
            var vr = v % 2 === 0 ? cr * 0.88 : cr * 0.42;
            if (v === 0) ctx.moveTo(cx2 + Math.cos(va) * vr, cy2 + Math.sin(va) * vr);
            else ctx.lineTo(cx2 + Math.cos(va) * vr, cy2 + Math.sin(va) * vr);
          }
          ctx.strokeStyle = 'rgba(195,22,22,0.62)';
          ctx.lineWidth = 1.0;
          ctx.stroke();
          ctx.restore();
        }

        /* candle glow — more candles, more intense flicker */
        var candles = mobile ? 3 : 6;
        for (var cl = 0; cl < candles; cl++) {
          var clx = W * (0.08 + cl * 0.16);
          var cly = H * (0.52 + Math.sin(t * 0.7 + cl * 1.5) * 0.025);
          var flicker = 0.10 + Math.sin(t * 3.8 + cl * 2.3) * 0.032 + Math.sin(t * 7.5 + cl) * 0.012;
          var cg = ctx.createRadialGradient(clx, cly, 0, clx, cly, W * 0.14);
          cg.addColorStop(0,   'rgba(255,155,35,' + flicker * 3.2 + ')');
          cg.addColorStop(0.25,'rgba(200,65,8,' + flicker * 2.0 + ')');
          cg.addColorStop(0.6, 'rgba(120,25,5,' + flicker * 0.8 + ')');
          cg.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = cg;
          ctx.fillRect(0, 0, W, H);
        }

        /* ash falling — dark, dry, constant */
        for (var a = 0; a < ash.length; a++) {
          var ak = ash[a];
          ak.y += ak.vy;
          ak.x += ak.vx + Math.sin(t * 0.7 + a * 0.6) * 0.00022;
          if (ak.y > 1.02) { ak.y = -0.02; ak.x = rng(0, 1); }
          if (ak.x < 0 || ak.x > 1) ak.vx = -ak.vx;
          ctx.beginPath();
          ctx.arc(ak.x * W, ak.y * H, ak.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(22,14,14,' + ak.a + ')';
          ctx.fill();
        }

        /* edge shadow — closes in from sides */
        var edgeL = ctx.createLinearGradient(0, 0, W * 0.28, 0);
        edgeL.addColorStop(0, 'rgba(0,0,0,0.75)');
        edgeL.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = edgeL;
        ctx.fillRect(0, 0, W * 0.28, H);
        var edgeR = ctx.createLinearGradient(W, 0, W * 0.72, 0);
        edgeR.addColorStop(0, 'rgba(0,0,0,0.75)');
        edgeR.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = edgeR;
        ctx.fillRect(W * 0.72, 0, W * 0.28, H);
      });
    },

    /* ================================================================
       7. EMBER HOLLOW  —  The Devil Finds a Home
       Deep shadow. Corrupted warmth. Embers rising slow.
       A lantern that has no right being there.
       ================================================================ */
    emberHollow: function () {
      var cv  = makeCanvas(mobile ? 54 : 68);
      var ctx = cv.ctx;

      /* embers — more, brighter, more threatening */
      var embers = [];
      for (var i = 0; i < (mobile ? 14 : 28); i++) {
        embers.push({
          x: rng(0.08, 0.92), y: rng(0.35, 1.1),
          vy: rng(0.00025, 0.00085),
          r: rng(0.8, 2.8),
          a: rng(0.35, 0.82),
          ph: rng(0, 6.28)
        });
      }

      /* lantern glow — follows pointer on desktop */
      var lanternX = 0.5, lanternY = 0.42;
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

        /* deep shadow base — no light should be here */
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0,    'rgba(0,0,0,0)');
        bg.addColorStop(0.18, 'rgba(12,5,2,' + (0.38 + sc * 0.12) + ')');
        bg.addColorStop(0.55, 'rgba(32,12,4,' + (0.65 + sc * 0.15) + ')');
        bg.addColorStop(0.82, 'rgba(20,7,2,' + (0.85 + sc * 0.10) + ')');
        bg.addColorStop(1,    'rgba(8,3,1,0.97)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        /* lantern warmth — unstable, wrong */
        var lx = lanternX * W;
        var ly = (1 - lanternY) * H * 0.65;
        var flicker = Math.sin(t * 4.5) * 0.022 + Math.sin(t * 7.8) * 0.010 + Math.sin(t * 13.2) * 0.005;
        var lIntensity = 0.30 + sc * 0.18 + flicker;
        var lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.52);
        lg.addColorStop(0,   'rgba(230,115,28,' + lIntensity + ')');
        lg.addColorStop(0.22,'rgba(165,58,12,' + lIntensity * 0.7 + ')');
        lg.addColorStop(0.55,'rgba(88,26,6,' + lIntensity * 0.35 + ')');
        lg.addColorStop(0.82,'rgba(40,10,2,' + lIntensity * 0.12 + ')');
        lg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, W, H);

        /* embers rising — sparse, slow, wrong */
        for (var i = 0; i < embers.length; i++) {
          var e = embers[i];
          e.y -= e.vy;
          e.ph += 0.018;
          e.x += Math.sin(e.ph) * 0.00035;
          if (e.y < -0.02) { e.y = 1.08; e.x = rng(0.08, 0.92); }
          var ea = e.a * Math.min(1, e.y * 5) * (0.45 + sc * 0.55);
          ctx.beginPath();
          ctx.arc(e.x * W, e.y * H, e.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(235,105,22,' + ea + ')';
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(228,95,18,0.7)';
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        /* heavy corner shadows — presence closing in */
        var ls = ctx.createLinearGradient(0, 0, W * 0.40, 0);
        ls.addColorStop(0, 'rgba(0,0,0,0.80)');
        ls.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ls; ctx.fillRect(0, 0, W * 0.40, H);
        var rs = ctx.createLinearGradient(W, 0, W * 0.60, 0);
        rs.addColorStop(0, 'rgba(0,0,0,0.80)');
        rs.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rs; ctx.fillRect(W * 0.60, 0, W * 0.40, H);

        /* floor darkness — total */
        var fld = ctx.createLinearGradient(0, H * 0.82, 0, H);
        fld.addColorStop(0, 'rgba(0,0,0,0)');
        fld.addColorStop(1, 'rgba(0,0,0,0.92)');
        ctx.fillStyle = fld;
        ctx.fillRect(0, H * 0.82, W, H * 0.18);
      });
    }

  };

  (EFFECTS[theme] || function () {})();

}());
