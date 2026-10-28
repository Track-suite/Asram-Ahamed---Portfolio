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
