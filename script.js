// Logo carousel: duplicate the set once so the -50% loop is seamless.
(() => {
  const track = document.querySelector(".logos__track");
  if (!track) return;
  [...track.children].forEach((el) => {
    const clone = el.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.querySelector("img")?.setAttribute("alt", "");
    track.appendChild(clone);
  });
})();

// Floating menu: highlight the button for the section currently in view.
(() => {
  const buttons = document.querySelectorAll(".menu .ib[data-section]");
  const sections = [...buttons]
    .map((b) => document.getElementById(b.dataset.section))
    .filter(Boolean);
  if (!sections.length || !("IntersectionObserver" in window)) return;

  const setActive = (id) =>
    buttons.forEach((b) => b.classList.toggle("is-active", b.dataset.section === id));

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    },
    { threshold: [0.25, 0.5, 0.75] }
  );
  sections.forEach((s) => io.observe(s));
})();

// ---------- Motion ----------
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;

  // Vinyl: click to spin
  const songs = document.querySelector(".songs");
  const vinylBtn = document.querySelector(".songs__btn");
  const audio = document.getElementById("song");
  const hint = document.querySelector(".songs__hint");
  let hovering = false;
  let pinned = false;
  let fade = 0;

  const fadeTo = (target, ms, done) => {
    cancelAnimationFrame(fade);
    const from = audio.volume;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min((t - t0) / ms, 1);
      audio.volume = from + (target - from) * k;
      if (k < 1) fade = requestAnimationFrame(step);
      else if (done) done();
    };
    fade = requestAnimationFrame(step);
  };

  const syncAudio = () => {
    if (!audio) return;
    if (hovering || pinned) {
      if (audio.paused) audio.volume = 0;
      audio.play().then(() => {
        if (hint) hint.hidden = true;
        // The visitor may have moved away while play() was starting.
        if (hovering || pinned) fadeTo(0.7, 600);
        else fadeTo(0, 350, () => { if (!hovering && !pinned) audio.pause(); });
      }).catch((err) => {
        // Browsers block sound until the visitor has clicked something on the page.
        if (err && err.name === "NotAllowedError" && hint) hint.hidden = false;
      });
    } else {
      fadeTo(0, 350, () => { if (!hovering && !pinned) audio.pause(); });
    }
  };

  if (songs && vinylBtn) {
    vinylBtn.addEventListener("click", () => {
      pinned = songs.classList.toggle("is-spinning");
      vinylBtn.setAttribute("aria-pressed", String(pinned));
      syncAudio();
    });
    songs.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      hovering = true;
      syncAudio();
    });
    songs.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      hovering = false;
      if (hint) hint.hidden = true;
      syncAudio();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && audio) audio.pause();
      else if (!document.hidden) syncAudio();
    });
  }

  if (reduce) return;

  // Draggable posters (double-click puts one back)
  const stage = document.querySelector(".hero__stage");
  const posters = [...document.querySelectorAll(".po")];
  let z = 10;
  const setPos = (p, x, y) => {
    p.dataset.dx = x;
    p.dataset.dy = y;
    p.style.setProperty("--dx", x + "px");
    p.style.setProperty("--dy", y + "px");
  };
  posters.forEach((p) => {
    p.draggable = false;
    let sx, sy, bx, by, base, id;
    p.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      id = e.pointerId;
      p.setPointerCapture(id);
      sx = e.clientX; sy = e.clientY;
      bx = parseFloat(p.dataset.dx || 0);
      by = parseFloat(p.dataset.dy || 0);
      base = p.getBoundingClientRect();
      p.classList.add("is-dragging");
      p.style.zIndex = ++z;
      e.preventDefault();
    });
    p.addEventListener("pointermove", (e) => {
      if (!p.classList.contains("is-dragging") || e.pointerId !== id) return;
      const r = stage.getBoundingClientRect();
      const dx = Math.min(Math.max(e.clientX - sx, r.left - base.left), r.right - base.right);
      const dy = Math.min(Math.max(e.clientY - sy, r.top - base.top), r.bottom - base.bottom);
      setPos(p, bx + dx, by + dy);
    });
    const end = (e) => {
      p.classList.remove("is-dragging");
      try { p.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    p.addEventListener("pointerup", end);
    p.addEventListener("pointercancel", end);
    p.addEventListener("dblclick", () => setPos(p, 0, 0));
  });

  if (!fine) return;

  // Pink "Azrem" cursor follows the mouse over the wall, then drifts home
  const box = document.querySelector(".wall__box");
  const cur = box && box.querySelector(".cursor");
  if (box && cur) {
    let tx = 0, ty = 0, x = 0, y = 0, raf = null;
    const tick = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      box.style.setProperty("--fx", x.toFixed(2) + "px");
      box.style.setProperty("--fy", y.toFixed(2) + "px");
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.1 ? requestAnimationFrame(tick) : null;
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    box.addEventListener("pointermove", (e) => {
      const r = box.getBoundingClientRect();
      const homeX = r.left + r.width * 0.12857 + cur.offsetWidth / 2;
      const homeY = r.top + r.height * 0.71333 + cur.offsetHeight / 2;
      tx = e.clientX - homeX;
      ty = e.clientY - homeY;
      go();
    });
    box.addEventListener("pointerleave", () => { tx = 0; ty = 0; go(); });
  }

  // Headphones react to the mouse (parallax + tilt)
  const hero = document.querySelector(".hero");
  const hp = document.getElementById("headphones");
  if (hero && hp) {
    let tx = 0, ty = 0, tr = 0, x = 0, y = 0, r = 0, raf = null;
    const tick = () => {
      x += (tx - x) * 0.1; y += (ty - y) * 0.1; r += (tr - r) * 0.1;
      hp.style.setProperty("--px", x.toFixed(2) + "px");
      hp.style.setProperty("--py", y.toFixed(2) + "px");
      hp.style.setProperty("--pr", r.toFixed(2) + "deg");
      raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(tr - r) > 0.05 ? requestAnimationFrame(tick) : null;
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    hero.addEventListener("pointermove", (e) => {
      const b = hero.getBoundingClientRect();
      const nx = (e.clientX - b.left) / b.width - 0.5;
      const ny = (e.clientY - b.top) / b.height - 0.5;
      tx = -nx * 40; ty = -ny * 28; tr = nx * 9;
      go();
    });
    hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; tr = 0; go(); });
  }
})();
