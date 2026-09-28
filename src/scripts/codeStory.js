// CodeStory: alguien "escribe" Program.cs y el código va contando la carrera.
// Uso: <div data-code-story data-source='[...líneas...]'> con .cs-code, .cs-gutter, .cs-term, .cs-replay, .cs-skip

const CTRL = new Set(["await", "foreach", "return", "using", "for", "if", "in", "throw"]);
const KW = new Set(["var", "new", "true", "false", "null", "async"]);

// Divide una línea en tokens con su clase de color (estilo VS Dark+)
function tokenize(line) {
  const out = [];
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g;
  let m;
  let prevWord = "";
  let prevChar = "";
  while ((m = re.exec(line))) {
    const [t, com, str, num, word, ws] = m;
    let cls = "p";
    if (com) cls = "c";
    else if (str) cls = "s";
    else if (num) cls = "n";
    else if (word) {
      const rest = line.slice(re.lastIndex).trimStart();
      if (CTRL.has(word)) cls = "ctrl";
      else if (KW.has(word)) cls = "kw";
      else if (prevWord === "new") cls = "t";
      else if (rest.startsWith("(") || rest.startsWith("<")) cls = "m";
      else if (prevChar === ".") cls = "i";
      else if (/^[A-Z]/.test(word)) cls = "t";
      else cls = "i";
      prevWord = word;
    } else if (ws) cls = "ws";
    if (!ws) prevChar = t.slice(-1);
    if (!word && !ws) prevWord = ""; // los espacios mantienen "new" para la palabra siguiente
    out.push({ text: t, cls });
  }
  return out;
}

// Arma la lista de pulsaciones, con errores de tipeo planificados
function buildKeystrokes(lines, typos) {
  const keys = [];
  lines.forEach((line, li) => {
    const chars = [];
    tokenize(line).forEach((tk) => [...tk.text].forEach((ch) => chars.push({ ch, cls: tk.cls })));
    const lineTypos = typos
      .map((t) => ({ ...t, col: line.indexOf(t.find) }))
      .filter((t) => t.col >= 0)
      .map((t) => ({ ...t, col: t.col + t.offset }));
    chars.forEach((c, col) => {
      const typo = lineTypos.find((t) => t.col === col);
      if (typo) {
        [...typo.wrong].forEach((ch) => keys.push({ k: "ch", ch, cls: c.cls, li }));
        keys.push({ k: "pause", ms: 420 });
        [...typo.wrong].forEach(() => keys.push({ k: "back", li }));
      }
      keys.push({ k: "ch", ch: c.ch, cls: c.cls, li });
    });
    keys.push({ k: "nl", li, blank: line.trim() === "", comment: line.trim().startsWith("//") });
  });
  return keys;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderLine(chars) {
  let html = "";
  let cur = null;
  let buf = "";
  for (const c of chars) {
    if (c.cls !== cur) {
      if (buf) html += `<span class="tk-${cur}">${esc(buf)}</span>`;
      cur = c.cls;
      buf = "";
    }
    buf += c.ch;
  }
  if (buf) html += `<span class="tk-${cur}">${esc(buf)}</span>`;
  return html;
}

function init(root) {
  const lines = JSON.parse(root.dataset.source || "[]");
  const typos = JSON.parse(root.dataset.typos || "[]");
  const termLines = JSON.parse(root.dataset.terminal || "[]");
  const code = root.querySelector(".cs-code");
  const gutter = root.querySelector(".cs-gutter");
  const term = root.querySelector(".cs-term");
  const replay = root.querySelector(".cs-replay");
  const skip = root.querySelector(".cs-skip");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let timer = null;
  let run = 0;

  const caret = '<span class="cs-caret"></span>';

  function paint(model, activeLine) {
    code.innerHTML = model
      .map((chars, i) => `<div class="cs-ln">${renderLine(chars)}${i === activeLine ? caret : ""}&#8203;</div>`)
      .join("");
    gutter.innerHTML = model.map((_, i) => `<div>${i + 1}</div>`).join("");
    const scroller = code.parentElement;
    scroller.scrollTop = scroller.scrollHeight;
  }

  function showTerminal(instant) {
    term.innerHTML = "";
    termLines.forEach((t, i) => {
      const d = document.createElement("div");
      d.className = `cs-tl ${t.cls || ""}`;
      d.innerHTML = t.html;
      if (!instant) d.style.animationDelay = `${i * 0.45}s`;
      else { d.style.animation = "none"; d.style.opacity = "1"; }
      term.appendChild(d);
    });
    skip.hidden = true;
    replay.hidden = false;
  }

  function finishInstant() {
    clearTimeout(timer);
    run++;
    const model = lines.map((l) => {
      const chars = [];
      tokenize(l).forEach((tk) => [...tk.text].forEach((ch) => chars.push({ ch, cls: tk.cls })));
      return chars;
    });
    paint(model, -1);
    showTerminal(true);
  }

  function start() {
    if (motion.matches) return finishInstant();
    clearTimeout(timer);
    const myRun = ++run;
    term.innerHTML = "";
    replay.hidden = true;
    skip.hidden = false;
    const keys = buildKeystrokes(lines, typos);
    const model = [[]];
    let idx = 0;

    const step = () => {
      if (myRun !== run || !root.isConnected) return;
      if (idx >= keys.length) {
        paint(model.slice(0, lines.length), -1);
        timer = setTimeout(() => showTerminal(false), 600);
        return;
      }
      const key = keys[idx++];
      let delay = 14 + Math.random() * 26;
      const li = model.length - 1;
      if (key.k === "ch") {
        model[li].push({ ch: key.ch, cls: key.cls });
        if (key.ch === " ") delay += 25;
        if (key.ch === "(" || key.ch === ".") delay += 60;
      } else if (key.k === "back") {
        model[li].pop();
        delay = 70;
      } else if (key.k === "pause") {
        delay = key.ms;
      } else if (key.k === "nl") {
        model.push([]);
        delay = key.blank ? 320 : key.comment ? 220 : 110;
      }
      paint(model, model.length - 1);
      timer = setTimeout(step, delay);
    };
    step();
  }

  replay.addEventListener("click", start);
  skip.addEventListener("click", finishInstant);

  motion.addEventListener("change", () => { if (motion.matches) finishInstant(); });
  if (motion.matches) return finishInstant();

  // Arranca cuando el editor entra en pantalla
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      start();
    }
  }, { threshold: 0.35 });
  io.observe(root);
}

document.querySelectorAll("[data-code-story]").forEach(init);
