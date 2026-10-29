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

  // Reset button: send every poster back to its spot (staggered), restore the original stacking
  const resetBtn = document.querySelector(".reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      posters.forEach((p, i) => {
        p.style.transitionDelay = i * 30 + "ms";
        setPos(p, 0, 0);
      });
      resetBtn.classList.remove("is-spinning");
      void resetBtn.offsetWidth; // restart the spin
      resetBtn.classList.add("is-spinning");
      setTimeout(() => {
        posters.forEach((p) => {
          p.style.transitionDelay = "";
          p.style.zIndex = "";
        });
        resetBtn.classList.remove("is-spinning");
      }, 900);
    });
  }

  if (!fine) return;

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

// ---------- Mobile social menu ----------
// Below 600px the four social icons collapse into a chip that opens a panel above the bar.
(() => {
  const wrap = document.querySelector(".social-wrap");
  const toggle = wrap && wrap.querySelector(".social-toggle");
  const list = document.getElementById("social-list");
  if (!wrap || !toggle || !list) return;

  const isOpen = () => wrap.classList.contains("is-open");
  const setOpen = (open) => {
    wrap.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => setOpen(!isOpen()));
  document.addEventListener("click", (e) => {
    if (isOpen() && !wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });
  list.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
  matchMedia("(max-width: 599px)").addEventListener("change", (e) => {
    if (!e.matches) setOpen(false);
  });
})();

// ---------- Info tags ----------
// One shared tag, shown on hover (mouse/pen) or keyboard focus for any element with data-tip.
// Tags for the floating bar sit above it; others (data-tip-pos="bottom") sit below their element.
(() => {
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.setAttribute("aria-hidden", "true"); // the same words are already each element's aria-label
  document.body.appendChild(tip);

  const GAP = 8;
  const phone = matchMedia("(max-width: 599px)");
  let timer = 0;
  let visible = false;
  let lastHide = 0;

  const place = (el) => {
    const r = el.getBoundingClientRect();
    const bar = el.closest(".menu");
    const below = (el.dataset.tipPos || (bar ? "top" : "bottom")) === "bottom";
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, document.documentElement.clientWidth - w - 8));
    const top = below ? r.bottom + GAP : (bar ? bar.getBoundingClientRect().top : r.top) - GAP - h;
    tip.style.left = Math.round(left) + "px";
    tip.style.top = Math.round(top) + "px";
    tip.style.setProperty("--tip-shift", below ? "-4px" : "4px");
    tip.style.setProperty("--tip-origin", below ? "50% 0" : "50% 100%");
  };

  const show = (el) => {
    if (el.closest(".socials") && phone.matches) return; // icons in the phone social panel
    tip.textContent = el.dataset.tip;
    place(el);
    tip.classList.add("is-visible");
    visible = true;
  };

  const hide = () => {
    clearTimeout(timer);
    if (visible) lastHide = performance.now();
    visible = false;
    tip.classList.remove("is-visible");
  };

  const target = (e) => (e.target.closest ? e.target.closest("[data-tip]") : null);

  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const el = target(e);
    if (!el) return;
    clearTimeout(timer);
    // quick when sweeping from one icon to the next, a short pause otherwise
    timer = setTimeout(() => show(el), performance.now() - lastHide < 300 ? 0 : 120);
  });
  document.addEventListener("pointerout", (e) => {
    const el = target(e);
    if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) hide();
  });
  document.addEventListener("focusin", (e) => {
    const el = target(e);
    if (el && el.matches(":focus-visible")) show(el);
  });
  document.addEventListener("focusout", hide);
  document.addEventListener("pointerdown", hide);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  window.addEventListener("scroll", hide, { passive: true });
  window.addEventListener("resize", hide);
})();

// ---------- Other works: FIFA video + Into the Portal slider ----------
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Video plays only while it's on screen (muted loop). With reduced motion it waits for the visitor.
  const video = document.getElementById("fifa-video");
  if (video) {
    if (reduce) {
      video.controls = true;
    } else if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) video.play().catch(() => {});
          else video.pause();
        });
      }, { threshold: 0.35 }).observe(video);
    } else {
      video.autoplay = true;
    }
  }

  // Slider: the two renders cross-fade in place every ~2s, pauses on hover/focus/hidden tab; swipe or arrow keys also work.
  const slider = document.getElementById("portal-slider");
  if (!slider) return;
  const track = slider.querySelector(".slider__track");
  const slides = [...slider.querySelectorAll(".slide")];
  const n = slides.length;
  let i = 0;
  let timer = 0;
  let inView = true;
  let held = false;

  const go = (k) => {
    i = (k + n) % n;
    slides.forEach((s, idx) => {
      s.classList.toggle("is-active", idx === i);
      s.setAttribute("aria-hidden", String(idx !== i));
    });
  };
  const stop = () => { clearInterval(timer); timer = 0; };
  const start = () => {
    stop();
    if (reduce || held || !inView || document.hidden) return;
    timer = setInterval(() => go(i + 1), 2000);
  };


  slider.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { held = true; stop(); } });
  slider.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { held = false; start(); } });
  slider.addEventListener("focusin", () => { held = true; stop(); });
  slider.addEventListener("focusout", () => { held = false; start(); });
  slider.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { go(i - 1); start(); }
    if (e.key === "ArrowRight") { go(i + 1); start(); }
  });
  document.addEventListener("visibilitychange", start);

  // swipe
  let sx = null;
  slider.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; sx = e.clientX; });
  let swiped = false;
  slider.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 40) { swiped = true; setTimeout(() => { swiped = false; }, 0); go(i + (dx < 0 ? 1 : -1)); start(); }
  });
  // a swipe shouldn't also open the project link
  slider.addEventListener("click", (e) => { if (swiped) { e.preventDefault(); swiped = false; } }, true);
  slider.addEventListener("pointercancel", () => { sx = null; });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; start(); }, { threshold: 0.3 }).observe(slider);
  }
  start();
})();

// ---------- Floating bar: active page icon ----------
// About is active near the top; My works takes over once Highlighted Works is reached (or when clicked).
(() => {
  const about = document.querySelector('[data-nav="about"]');
  const works = document.querySelector('[data-nav="works"]');
  const target = document.getElementById("highlighted");
  if (!about || !works || !target) return;

  const set = (name) => {
    [[about, "about"], [works, "works"]].forEach(([el, key]) => {
      const on = key === name;
      el.classList.toggle("is-active", on);
      if (on) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
    });
  };
  const update = () => {
    const reached = target.getBoundingClientRect().top < window.innerHeight * 0.6;
    set(reached ? "works" : "about");
  };

  let lock = 0; // while the click's smooth scroll runs, keep the clicked icon active
  works.addEventListener("click", () => { set("works"); lock = performance.now() + 900; });
  about.addEventListener("click", () => { set("about"); lock = performance.now() + 900; });
  window.addEventListener("scroll", () => { if (performance.now() > lock) update(); }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

// ---------- About / closing: clouds part, "Oh Really" bubble ----------
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = document.querySelector(".story__stage");
  const title = document.getElementById("closing-title");
  const by = document.getElementById("credits-by");
  const bubble = document.getElementById("bubble");
  if (!stage || !("IntersectionObserver" in window)) { if (stage) stage.classList.add("is-revealed"); return; }

  // The clouds drift apart the first time the closing line comes into view.
  if (title) {
    if (reduce) stage.classList.add("is-revealed");
    else {
      const io = new IntersectionObserver((es) => {
        if (es[0].isIntersecting) { setTimeout(() => stage.classList.add("is-revealed"), 350); io.disconnect(); }
      }, { threshold: 0.6 });
      io.observe(title);
    }
  }

  // The thought bubble pops up when the footer is reached, then fades away; it replays on the next visit.
  if (by && bubble) {
    let t = 0;
    new IntersectionObserver((es) => {
      if (es[0].isIntersecting) {
        clearTimeout(t);
        bubble.classList.add("is-shown");
        t = setTimeout(() => bubble.classList.remove("is-shown"), 4500);
      } else {
        clearTimeout(t);
        bubble.classList.remove("is-shown");
      }
    }, { threshold: 1 }).observe(by);
  }
})();


// ---------- Loading screen: counter to 99, posters trail the cursor ----------
(() => {
  const root = document.documentElement;
  const loader = document.getElementById("loader");
  const trail = document.getElementById("loader-trail");
  const count = document.getElementById("loader-count");
  if (!loader || !trail || !count) { root.classList.remove("is-loading"); return; }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Posters stay hidden until the pointer moves, then follow it as a trail.
  const sizes = [99, 88, 99, 220, 95, 89, 95, 99, 88, 75, 89]; // widths from the Figma loading frame
  let next = 0, lastX = -999, lastY = -999, alive = [];
  const spawn = (x, y) => {
    const n = (next % 11) + 1; next++;
    const img = new Image();
    img.className = "loader__po";
    img.alt = ""; img.draggable = false;
    img.src = "assets/posters/poster-" + String(n).padStart(2, "0") + ".png";
    img.style.width = sizes[n - 1] * (innerWidth < 700 ? 0.8 : 1.15) + "px";
    img.style.left = x + "px"; img.style.top = y + "px";
    img.style.setProperty("--rot", (Math.random() * 10 - 5).toFixed(1) + "deg");
    trail.appendChild(img);
    requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add("is-in")));
    alive.push(img);
    const kill = () => { img.classList.add("is-out"); setTimeout(() => img.remove(), 520); alive = alive.filter((i) => i !== img); };
    setTimeout(kill, 950);
    if (alive.length > 7) { const old = alive.shift(); old.classList.add("is-out"); setTimeout(() => old.remove(), 520); }
  };
  const onMove = (e) => {
    if (loader.classList.contains("is-done")) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (dx * dx + dy * dy < 70 * 70) return;
    lastX = e.clientX; lastY = e.clientY;
    spawn(lastX, lastY);
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  // Counter: eases up to 99 while the page loads, then the screen lifts away at 99.
  const loaded = new Promise((res) => {
    const ready = () => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(res, res);
    document.readyState === "complete" ? ready() : window.addEventListener("load", ready, { once: true });
  });
  let isLoaded = false; loaded.then(() => { isLoaded = true; });
  const MIN = reduce ? 500 : 2600;
  const t0 = performance.now();
  let shown = -1, finished = false;
  const tiles = () => [...count.children];
  const render = (v) => {
    const s = String(v).padStart(2, "0");
    let ts = tiles();
    while (ts.length < s.length) { const t = document.createElement("span"); t.className = "loader__tile"; t.innerHTML = "<b></b>"; count.appendChild(t); ts = tiles(); }
    ts.forEach((t, i) => {
      const b = t.firstChild, d = s[i];
      if (b.textContent !== d) {
        b.textContent = d;
        if (!reduce && i < s.length - 1 || v === 99) { t.classList.remove("is-tick"); void t.offsetWidth; t.classList.add("is-tick"); }
      }
    });
    loader.setAttribute("aria-valuenow", v);
  };
  const finish = () => {
    if (finished) return; finished = true;
    window.removeEventListener("pointermove", onMove);
    setTimeout(() => {
      loader.classList.add("is-done");
      root.classList.remove("is-loading");
      setTimeout(() => loader.remove(), 1100);
    }, 450);
  };
  const frame = (now) => {
    const t = Math.min(1, (now - t0) / MIN);
    const eased = 1 - Math.pow(1 - t, 2.2);
    let v = Math.floor(eased * 100);
    if (!isLoaded) v = Math.min(v, 94);
    v = Math.min(v, 99);
    if (isLoaded && t >= 1) v = 99;
    if (v >= 99) v = 99;
    if (v !== shown) { shown = v; render(v); }
    if (!(isLoaded && t >= 1)) requestAnimationFrame(frame); else finish();
  };
  render(0);
  requestAnimationFrame(frame);
})();
