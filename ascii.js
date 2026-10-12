// Procedural ASCII field behind the page, rewritten from performative-ui's
// AsciiHero (MIT, https://performative-ui.cncl.co). A slowly shifting
// plasma of characters painted in the theme's ink. It stays faint, then
// darkens and ripples around the cursor.
(() => {
  const RAMP = " .`'^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const FONT_SIZE = 12;      // character size, px
  const LINE_HEIGHT = 1.2;   // row height relative to FONT_SIZE
  const CONTRAST = 1.7;      // higher = more empty gaps and dense patches
  const BASE_ALPHA = 0.11;   // how visible the field is away from the cursor (or --ascii-alpha in CSS)
  const SPOT_ALPHA = 0.55;   // strength right under the cursor
  const SPOT_RADIUS = 140;   // spotlight radius, px
  const RIPPLE = 0.35;       // how much the cursor stirs the characters
  const RIPPLE_RADIUS = 90;  // px
  const FRAME_MS = 50;       // ~20 fps is plenty for a background
  const MONO = 'ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace';

  const canvas = document.createElement("canvas");
  canvas.className = "bg-ascii";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  // The spotlight is drawn here at full strength, then faded out radially.
  const spot = document.createElement("canvas");
  const spotCtx = spot.getContext("2d");

  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let cellW = 0;
  let cellH = 0;
  let cols = 0;
  let rows = 0;
  let radial = null;   // each cell's distance from the screen center
  let lines = [];      // the characters on screen, one string per row
  let fill = "#888";
  let spotFill = "#888";
  let baseAlpha = BASE_ALPHA;
  let pointer = null;  // { x, y } in px, or null while the cursor is away
  let time = 0;
  let last = 0;
  let running = false;

  function setFont(c) {
    c.font = `${FONT_SIZE}px ${MONO}`;
    c.textBaseline = "top";
  }

  function gradient(c) {
    const css = getComputedStyle(document.documentElement);
    const pick = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const g = c.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, pick("--grad-from", "#7c3aed"));
    g.addColorStop(0.5, pick("--grad-mid", "#ec4899"));
    g.addColorStop(1, pick("--grad-to", "#06b6d4"));
    return g;
  }

  function readColors() {
    fill = gradient(ctx);
    spotFill = gradient(spotCtx);
    const alpha = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ascii-alpha"));
    baseAlpha = Number.isFinite(alpha) ? alpha : BASE_ALPHA;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setFont(ctx);
    spot.width = spot.height = Math.ceil(SPOT_RADIUS * 2 * dpr);

    cellW = ctx.measureText("M").width;
    cellH = FONT_SIZE * LINE_HEIGHT;
    cols = Math.ceil(width / cellW);
    rows = Math.ceil(height / cellH);

    radial = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        radial[r * cols + c] = Math.hypot(c * cellW - width / 2, r * cellH - height / 2);
      }
    }
    readColors();
  }

  // Work out which character goes in every cell at time s.
  function build(s) {
    const top = RAMP.length - 1;
    const colWave = new Float32Array(cols);
    for (let c = 0; c < cols; c++) colWave[c] = Math.sin(c * cellW * 0.011 + s * 0.6);

    lines = new Array(rows);
    for (let r = 0; r < rows; r++) {
      const y = r * cellH;
      const rowWave = Math.sin(y * 0.009 - s * 0.45);
      let line = "";

      for (let c = 0; c < cols; c++) {
        const x = c * cellW;
        let v = colWave[c] + rowWave
          + Math.sin((x + y) * 0.004 + s * 0.3)
          + Math.sin(radial[r * cols + c] * 0.012 - s * 0.8);
        v = ((v / 8) * CONTRAST) + 0.5;  // -4..4 -> roughly 0..1

        if (pointer) {
          const d = Math.hypot(x - pointer.x, y - pointer.y);
          if (d < RIPPLE_RADIUS * 3) {
            v += RIPPLE * Math.exp(-(d * d) / (2 * RIPPLE_RADIUS * RIPPLE_RADIUS)) * Math.sin(d * 0.08 - s * 6);
          }
        }

        line += RAMP[Math.max(0, Math.min(top, Math.round(v * top)))];
      }
      lines[r] = line;
    }
  }

  function paint() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = baseAlpha;
    ctx.fillStyle = fill;
    for (let r = 0; r < rows; r++) ctx.fillText(lines[r], 0, r * cellH);
    ctx.globalAlpha = 1;
    if (pointer) paintSpotlight();
  }

  function paintSpotlight() {
    const size = SPOT_RADIUS * 2;
    const left = pointer.x - SPOT_RADIUS;
    const top = pointer.y - SPOT_RADIUS;

    // Redraw only the characters near the cursor, at full strength...
    spotCtx.setTransform(1, 0, 0, 1, 0, 0);
    spotCtx.globalCompositeOperation = "source-over";
    spotCtx.clearRect(0, 0, spot.width, spot.height);
    spotCtx.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr);
    setFont(spotCtx);
    spotCtx.fillStyle = spotFill;

    const c0 = Math.max(0, Math.floor(left / cellW));
    const c1 = Math.min(cols, Math.ceil((left + size) / cellW));
    const r0 = Math.max(0, Math.floor(top / cellH));
    const r1 = Math.min(rows, Math.ceil((top + size) / cellH));
    for (let r = r0; r < r1; r++) spotCtx.fillText(lines[r].slice(c0, c1), c0 * cellW, r * cellH);

    // ...then fade them out with distance from the cursor.
    const fade = spotCtx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, SPOT_RADIUS);
    fade.addColorStop(0, "#000");
    fade.addColorStop(1, "transparent");
    spotCtx.globalCompositeOperation = "destination-in";
    spotCtx.fillStyle = fade;
    spotCtx.fillRect(left, top, size, size);

    ctx.globalAlpha = SPOT_ALPHA;
    ctx.drawImage(spot, left, top, size, size);
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (still.matches) {
      running = false;
      build(0);
      paint();
      return;
    }
    if (now - last >= FRAME_MS) {
      last = now;
      time = now / 1000;
      build(time);
      paint();
    }
    requestAnimationFrame(frame);
  }

  function start() {
    if (still.matches) {
      build(0);
      paint();
    } else if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    pointer = { x: e.clientX, y: e.clientY };
    if (still.matches) paint();
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", () => {
    pointer = null;
    if (still.matches) paint();
  });

  window.addEventListener("resize", () => {
    resize();
    build(time);
    paint();
  });

  still.addEventListener("change", start);

  // Repaint in the new gradient when the theme changes.
  new MutationObserver(() => {
    readColors();
    paint();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  resize();
  start();
})();
