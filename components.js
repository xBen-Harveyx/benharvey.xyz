// The Rotator, rewritten in plain JavaScript from performative-ui (MIT,
// https://performative-ui.cncl.co).
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Rotator: types a word, holds it, deletes it, moves on to the next.
// Without JS (or with reduced motion) the first word just sits there.
document.querySelectorAll(".rotator").forEach((el) => {
  const words = el.dataset.words.split(",").map((w) => w.trim()).filter(Boolean);
  if (calm || words.length < 2) return;

  const TYPE_MS = 70;
  const DELETE_MS = 32;
  const HOLD_MS = 1500;

  // Screen readers hear it once instead of every keystroke: data-label if
  // given (so a heading keeps a fixed name), otherwise the whole list.
  const label = document.createElement("span");
  label.className = "sr-only";
  label.textContent = el.dataset.label || words.join(", ");
  el.after(label);
  el.setAttribute("aria-hidden", "true");

  const word = document.createElement("span");
  const cursor = document.createElement("span");
  cursor.className = "rotator-cursor";
  el.replaceChildren(word, cursor);

  // Reserve room for the widest word so the line doesn't jump around.
  let widest = 0;
  for (const w of words) {
    word.textContent = w;
    widest = Math.max(widest, el.offsetWidth);
  }
  el.style.minWidth = `${widest}px`;

  let index = 0;
  let shown = words[0].length;
  let deleting = false;
  word.textContent = words[0];

  function tick() {
    const target = words[index];
    if (!deleting && shown < target.length) {
      word.textContent = target.slice(0, ++shown);
      setTimeout(tick, TYPE_MS);
    } else if (!deleting) {
      deleting = true;
      setTimeout(tick, HOLD_MS);
    } else if (shown > 0) {
      word.textContent = target.slice(0, --shown);
      setTimeout(tick, DELETE_MS);
    } else {
      deleting = false;
      index = (index + 1) % words.length;
      setTimeout(tick, TYPE_MS * 4);
    }
  }
  tick();
});
