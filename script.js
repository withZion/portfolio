/* Zion O'Juwonlo — site interactions. No dependencies. */
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  };

  root.classList.add("js");

  /* ---------- Theme ---------- */
  const toggle = document.querySelector(".theme-toggle");
  const syncToggle = () => {
    const dark = root.classList.contains("dark");
    toggle?.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  };
  syncToggle();
  toggle?.addEventListener("click", () => {
    const dark = root.classList.toggle("dark");
    store.set("theme", dark ? "dark" : "light");
    syncToggle();
  });

  /* ---------- Live clock (Lagos) ---------- */
  const clocks = document.querySelectorAll("[data-clock]");
  if (clocks.length) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    const tick = () => { const t = fmt.format(new Date()); clocks.forEach((c) => (c.textContent = t)); };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Hero entrance ---------- */
  const name = document.querySelector("[data-split]");
  if (name) {
    const text = name.textContent.trim();
    name.setAttribute("aria-label", text);
    name.textContent = "";
    // Letters are grouped by word so a name never breaks mid-word.
    let i = 0;
    text.split(" ").forEach((word, w) => {
      if (w > 0) { name.appendChild(document.createTextNode(" ")); i++; }
      const group = document.createElement("span");
      group.className = "word-group";
      group.setAttribute("aria-hidden", "true");
      [...word].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "letter";
        s.textContent = ch;
        s.style.animationDelay = `${150 + i * 35}ms`;
        group.appendChild(s);
        i++;
      });
      name.appendChild(group);
    });
    const base = 150 + text.length * 35 + 120;
    document.querySelectorAll(".hero .hero-item").forEach((el, i) => {
      if (!el.closest(".hero-name")) el.style.animationDelay = `${i === 0 ? 0 : base + (i - 1) * 110}ms`;
    });
  }
  requestAnimationFrame(() => {
    root.classList.remove("hero-pending");
    root.classList.add("hero-ready");
  });

  /* ---------- Scroll reveal, tiles, scrawls ---------- */
  const reveal = (el) => el.classList.add("in");
  const io = "IntersectionObserver" in window && !reduced
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          if (el.classList.contains("scrawl")) el.classList.add("drawn");
          else reveal(el);
          if (el.classList.contains("pop")) {
            const d = parseFloat(el.style.getPropertyValue("--d")) || 0;
            setTimeout(() => el.classList.add("settled"), (d + 0.8) * 1000);
          }
          io.unobserve(el);
        });
      }, { rootMargin: "0px 0px -8% 0px" })
    : null;

  document.querySelectorAll(".tiles").forEach((group) => {
    group.querySelectorAll(".tile").forEach((t, i) => {
      t.classList.add("pop");
      t.style.setProperty("--d", `${(i * 0.045).toFixed(3)}s`);
    });
  });

  document.querySelectorAll(".reveal, .tile.pop, .scrawl").forEach((el) => {
    if (io) io.observe(el);
    else { reveal(el); el.classList.add("drawn", "settled"); }
  });

  /* ---------- Card spotlight ---------- */
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------- Grid / list view ---------- */
  const projects = document.querySelector(".projects");
  const viewBtns = document.querySelectorAll("[data-view]");
  const setView = (v) => {
    projects?.classList.toggle("list-view", v === "list");
    viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
    store.set("project-view", v);
  };
  viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  if (store.get("project-view") === "list") setView("list");

  /* ---------- Project dialog ---------- */
  const dialog = document.getElementById("project-dialog");
  const dTitle = dialog?.querySelector(".dialog-title");
  const dNote = dialog?.querySelector(".dialog-note");
  const dBody = dialog?.querySelector(".dialog-content");
  let lastTrigger = null;

  const openProject = (btn) => {
    const card = btn.closest(".card");
    const tpl = document.getElementById(`tpl-${card.dataset.project}`);
    if (!dialog || !tpl) return;
    lastTrigger = btn;
    dTitle.textContent = btn.textContent.trim();
    const note = card.querySelector(".card-note");
    dNote.textContent = note ? note.textContent.trim() : "";
    dNote.hidden = !note;
    dBody.replaceChildren(tpl.content.cloneNode(true));
    // Role and Outcome rows come from the card, so they are written once.
    const rows = card.querySelector(".card-rows");
    const slot = dBody.querySelector(".dialog-rows");
    if (rows && slot) slot.prepend(...[...rows.children].map((r) => r.cloneNode(true)));
    dialog.showModal();
    dialog.scrollTop = 0;
  };

  document.querySelectorAll("button.card-open").forEach((b) => b.addEventListener("click", () => openProject(b)));
  // The whole card is clickable: a click anywhere acts like clicking its title.
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return;           // the title itself already handles it
      if (window.getSelection && String(window.getSelection()).length) return;   // let people select text
      const open = card.querySelector(".card-open");
      if (!open) return;
      if (open.tagName === "A") window.open(open.href, "_blank", "noopener");
      else openProject(open);
    });
  });
  dialog?.querySelector(".dialog-close")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  dialog?.addEventListener("close", () => lastTrigger?.focus());

  /* ---------- Services accordion ---------- */
  document.querySelectorAll(".service-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".service");
      const open = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Rotating word ---------- */
  const rot = document.querySelector("[data-rotate]");
  if (rot) {
    const words = rot.dataset.rotate.split(",");
    if (reduced) {
      rot.textContent = words.join(" / ");
    } else {
      let i = 0;
      // Size the slot from the real word on screen (offsetWidth ignores transforms),
      // and re-measure once web fonts load or the window resizes.
      const fit = () => {
        const w = rot.querySelector(".word:not(.out)");
        if (w) rot.style.width = `${w.offsetWidth + 2}px`;
      };
      fit();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      window.addEventListener("resize", fit);
      setInterval(() => {
        if (document.hidden) return;
        const current = rot.querySelector(".word:not(.out)");
        i = (i + 1) % words.length;
        const next = document.createElement("span");
        next.className = "word in-word";
        next.textContent = words[i];
        current.classList.remove("in-word");
        current.classList.add("out");
        current.addEventListener("animationend", () => current.remove(), { once: true });
        rot.appendChild(next);
        fit();
      }, 2400);
    }
  }

  /* ---------- Copy email ---------- */
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const label = btn.querySelector(".copy-label");
    const original = label.textContent;
    let timer;
    const setLabel = (t) => {
      label.textContent = t;
      label.classList.remove("swap");
      void label.offsetWidth;
      label.classList.add("swap");
    };
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setLabel("Copied ✓");
      clearTimeout(timer);
      timer = setTimeout(() => setLabel(original), 2000);
    });
  });

  /* ---------- Mobile menu: close after choosing a link ---------- */
  const menu = document.querySelector(".mobile-menu");
  menu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menu.removeAttribute("open")));
  document.addEventListener("click", (e) => { if (menu?.open && !menu.contains(e.target)) menu.removeAttribute("open"); });
})();
