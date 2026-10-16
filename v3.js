/* v3 layer — runs after script.js and only adds behaviour. */
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Signal field: dot grid with packets running along it ---------- */
  const canvas = document.querySelector(".signal-field");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const GAP = 28;
    let w = 0, h = 0, dpr = 1, cols = 0, rows = 0, ox = 0, oy = 0;
    let ink = "#f4f4f2", accent = "#22d3ee";
    let mouse = { x: -9999, y: -9999 };
    let packets = [];
    let running = false, last = 0, spawnIn = 0, raf = 0;

    const readColors = () => {
      const cs = getComputedStyle(root);
      ink = cs.getPropertyValue("--ink").trim() || ink;
      accent = cs.getPropertyValue("--accent").trim() || accent;
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1; rows = Math.ceil(h / GAP) + 1;
      ox = (w - (cols - 1) * GAP) / 2; oy = 14;
    };

    const spawn = () => {
      const horizontal = Math.random() < 0.6;
      const c = Math.floor(Math.random() * cols), r = Math.floor(Math.random() * rows * 0.85);
      const dir = Math.random() < 0.5 ? -1 : 1;
      packets.push({
        x: ox + c * GAP, y: oy + r * GAP,
        dx: horizontal ? dir : 0, dy: horizontal ? 0 : dir,
        speed: 70 + Math.random() * 70,
        left: (5 + Math.floor(Math.random() * 10)) * GAP,
        trail: [],
        fade: 1,
      });
    };

    const step = (p, dt) => {
      const move = p.speed * dt;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 14) p.trail.shift();
      // Turn at grid crossings now and then, like a signal on a circuit board
      const before = { x: p.x, y: p.y };
      p.x += p.dx * move; p.y += p.dy * move; p.left -= move;
      const crossX = Math.floor((before.x - ox) / GAP) !== Math.floor((p.x - ox) / GAP);
      const crossY = Math.floor((before.y - oy) / GAP) !== Math.floor((p.y - oy) / GAP);
      if ((crossX || crossY) && Math.random() < 0.18) {
        p.x = ox + Math.round((p.x - ox) / GAP) * GAP;
        p.y = oy + Math.round((p.y - oy) / GAP) * GAP;
        const t = p.dx; p.dx = p.dy; p.dy = t;
        if (Math.random() < 0.5) { p.dx *= -1; p.dy *= -1; }
      }
      if (p.left <= 0) p.fade -= dt * 2.2;
    };

    const draw = (animate) => {
      ctx.clearRect(0, 0, w, h);
      // Dots
      ctx.fillStyle = ink;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = ox + c * GAP, y = oy + r * GAP;
          const d = Math.hypot(x - mouse.x, y - mouse.y);
          const near = d < 150 ? (1 - d / 150) : 0;
          ctx.globalAlpha = 0.17 + near * 0.4;
          const s = 1.5 + near * 1;
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
      if (!animate) { ctx.globalAlpha = 1; return; }
      // Packets
      ctx.lineCap = "round";
      for (const p of packets) {
        const pts = [...p.trail, { x: p.x, y: p.y }];
        for (let i = 1; i < pts.length; i++) {
          ctx.globalAlpha = (i / pts.length) * 0.55 * p.fade;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
        }
        ctx.globalAlpha = 0.9 * p.fade;
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.18 * p.fade;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ink;
      }
      ctx.globalAlpha = 1;
    };

    const frame = (t) => {
      if (!running) return;
      const dt = Math.min((t - last) / 1000, 0.05); last = t;
      spawnIn -= dt;
      if (spawnIn <= 0 && packets.length < 6) { spawn(); spawnIn = 0.5 + Math.random() * 0.9; }
      packets.forEach((p) => step(p, dt));
      packets = packets.filter((p) => p.fade > 0 && p.x > -40 && p.x < w + 40 && p.y > -40 && p.y < h + 40);
      draw(true);
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (running || reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    readColors(); resize(); draw(false);
    requestAnimationFrame(() => canvas.classList.add("ready"));

    window.addEventListener("resize", () => { resize(); if (!running) draw(false); });
    window.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (reduced) draw(false);
    }, { passive: true });
    new MutationObserver(() => { readColors(); if (!running) draw(false); })
      .observe(root, { attributes: true, attributeFilter: ["class"] });

    const hero = document.querySelector(".hero");
    if (!reduced && "IntersectionObserver" in window && hero) {
      new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop())).observe(hero);
      document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    }
  }

  /* ---------- Header: reading progress and active section ---------- */
  const header = document.querySelector(".site-header");
  const bar = document.createElement("span");
  bar.className = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  header?.appendChild(bar);

  const links = [...document.querySelectorAll(".nav-links a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);

  /* ---------- Scroll-linked pieces ---------- */
  const process = document.querySelector(".process");
  const steps = process ? [...process.querySelectorAll(".step")] : [];
  const wordmark = document.querySelector(".wordmark");
  const clamp = (v) => Math.max(0, Math.min(1, v));

  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    bar.style.setProperty("--p", max > 0 ? (window.scrollY / max).toFixed(4) : 0);

    // Active nav link: the last section whose top has passed a third of the screen
    let current = null;
    sections.forEach((s) => { if (s.getBoundingClientRect().top < vh * 0.35) current = s; });
    links.forEach((a) => a.classList.toggle("active", current && a.getAttribute("href") === `#${current.id}`));

    if (process) {
      const r = process.getBoundingClientRect();
      const p = reduced ? 1 : clamp((vh * 0.8 - r.top) / (r.height + vh * 0.25));
      process.style.setProperty("--progress", p.toFixed(3));
      steps.forEach((s, i) => s.classList.toggle("lit", p >= (i / Math.max(steps.length - 1, 1)) * 0.96));
    }
    if (wordmark) {
      const r = wordmark.getBoundingClientRect();
      const p = reduced ? 1 : clamp((vh - r.top) / (vh * 0.55));
      wordmark.style.setProperty("--fill", `${(p * 100).toFixed(1)}%`);
    }
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();


  /* ---------- Process: a bubble hops from step to step ---------- */
  const procList = document.querySelector(".process");
  if (procList && !reduced && "animate" in Element.prototype) {
    const stepEls = [...procList.querySelectorAll(".step")];
    const bubble = document.createElement("span");
    bubble.className = "process-bubble"; bubble.setAttribute("aria-hidden", "true");
    procList.appendChild(bubble);
    const centre = (step) => {
      const n = step.querySelector(".step-node").getBoundingClientRect();
      const p = procList.getBoundingClientRect();
      return { x: n.left - p.left + n.width / 2, y: n.top - p.top + n.height / 2 };
    };
    const at = (pt, sx = 1, sy = 1) => `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px) scale(${sx}, ${sy})`;
    let idx = 0, active = false, timer = 0;
    const rest = (i) => {
      stepEls.forEach((s, k) => s.classList.toggle("here", k === i));
      const s = stepEls[i]; s.classList.remove("hit"); void s.offsetWidth; s.classList.add("hit");
    };
    const hop = () => {
      if (!active) return;
      const next = (idx + 1) % stepEls.length;
      const a = centre(stepEls[idx]), b = centre(stepEls[next]);
      let frames, duration;
      if (next === 0) {
        // Loop back: shrink away at the end, reappear at the start
        frames = [{ transform: at(a), opacity: 1 }, { transform: at(a, 0, 0), opacity: 0, offset: .45 },
                  { transform: at(b, 0, 0), opacity: 0, offset: .55 }, { transform: at(b), opacity: 1 }];
        duration = 900;
      } else {
        // Parabolic hop: sample the arc so x moves evenly while y rises and falls
        const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
        const lift = 26;
        frames = [];
        for (let k = 0; k <= 12; k++) {
          const t = k / 12, arc = 4 * lift * t * (1 - t);
          const pt = { x: a.x + (b.x - a.x) * t - (horizontal ? 0 : -arc), y: a.y + (b.y - a.y) * t - (horizontal ? arc : 0) };
          frames.push({ transform: at(pt, 1 - Math.abs(.5 - t) * .2, 1 + Math.abs(.5 - t) * .2), opacity: 1, offset: t * .86 });
        }
        frames.push({ transform: at(b, 1.3, .7), opacity: 1, offset: .93 }, { transform: at(b), opacity: 1, offset: 1 });
        duration = 760;
      }
      stepEls.forEach((s) => s.classList.remove("here"));
      const anim = bubble.animate(frames, { duration, easing: "linear", fill: "forwards" });
      anim.onfinish = () => { idx = next; rest(idx); timer = setTimeout(hop, 1100); };
    };
    const start = () => {
      if (active) return; active = true;
      bubble.animate([{ transform: at(centre(stepEls[idx]), 0, 0), opacity: 0 }, { transform: at(centre(stepEls[idx])), opacity: 1 }],
        { duration: 350, easing: "ease-out", fill: "forwards" });
      rest(idx); timer = setTimeout(hop, 1000);
    };
    const stop = () => { active = false; clearTimeout(timer); };
    let inView = false;
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? start() : stop(); }, { threshold: .4 }).observe(procList);
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else if (inView) start(); });
  }


  /* ---------- Portrait: tap, click or Enter switches photo and illustration ---------- */
  const portrait = document.querySelector(".hero-photo");
  if (portrait) {
    if (new URLSearchParams(location.search).get("portrait") === "illustrated") {
      root.classList.add("portrait-illustrated");
      portrait.removeAttribute("role"); portrait.removeAttribute("tabindex"); portrait.removeAttribute("aria-pressed");
      portrait.removeAttribute("aria-label");
      const alt = portrait.querySelector(".portrait-alt");
      const main = portrait.querySelector(".portrait-main");
      if (alt && main) { alt.alt = main.alt.replace("Portrait", "Illustrated portrait"); alt.removeAttribute("aria-hidden"); main.alt = ""; }
    } else {
      const flip = () => {
        const on = portrait.classList.toggle("swapped");
        portrait.setAttribute("aria-pressed", String(on));
      };
      portrait.addEventListener("click", flip);
      portrait.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
    }
  }

  /* ---------- Section titles: wrap words for the blur-in ---------- */
  document.querySelectorAll(".section-title").forEach((title) => {
    let i = 0;
    const wrap = (node) => {
      const s = document.createElement("span");
      s.className = "tw"; s.style.setProperty("--i", i++);
      return s;
    };
    [...title.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const s = wrap(); s.textContent = part; frag.appendChild(s);
        });
        title.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const s = wrap(); title.replaceChild(s, node); s.appendChild(node);
      }
    });
  });

  /* ---------- Kickers: decode from scrambled characters ---------- */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_#·";
  const decode = (el) => {
    const final = el.dataset.text;
    const start = performance.now(), dur = 650;
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const shown = Math.floor(p * final.length);
      el.textContent = final.split("").map((ch, i) =>
        i < shown || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join("");
      if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
    };
    requestAnimationFrame(tick);
  };
  if (!reduced && "IntersectionObserver" in window) {
    const kio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { decode(e.target); kio.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    document.querySelectorAll("main .kicker").forEach((k) => {
      k.dataset.text = k.textContent.trim();
      k.setAttribute("aria-label", k.dataset.text);
      kio.observe(k);
    });
  }

  /* ---------- Numbers: count up when they come into view ---------- */
  const counters = document.querySelectorAll("[data-count]");
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const fmt = (v) => v.toFixed(decimals) + suffix;
    if (reduced) { el.textContent = fmt(target); return; }
    const start = performance.now(), dur = 1400;
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => { if (!reduced) c.textContent = (0).toFixed(parseInt(c.dataset.decimals || "0", 10)) + (c.dataset.suffix || ""); cio.observe(c); });
  }

  /* ---------- Magnetic primary buttons ---------- */
  if (finePointer && !reduced) {
    document.querySelectorAll(".btn-primary").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--mgx", `${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px`);
        btn.style.setProperty("--mgy", `${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`);
      });
      btn.addEventListener("pointerleave", () => { btn.style.setProperty("--mgx", "0px"); btn.style.setProperty("--mgy", "0px"); });
    });
  }
})();
