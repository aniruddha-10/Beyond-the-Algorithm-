// Shared behaviour for every page: theme toggle, nav border on scroll,
// reveal-on-scroll and count-up numbers.
// Pages that draw charts listen for the "themechange" window event to recolour.
import { isDark } from "./theme.js";

const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- Theme toggle (the saved choice is applied early by an inline script in each page's <head>) ----
const SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>`;
const toggle = document.getElementById("theme-toggle");

function labelToggle() {
  if (!toggle) return;
  const dark = isDark();
  toggle.innerHTML = dark ? SUN : MOON;
  toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  toggle.title = toggle.getAttribute("aria-label");
}
const announceTheme = () => window.dispatchEvent(new Event("themechange"));

labelToggle();
toggle?.addEventListener("click", () => {
  root.dataset.theme = isDark() ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch { /* storage unavailable: theme lasts this visit */ }
  labelToggle();
  announceTheme();
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  labelToggle();
  announceTheme();
});

// ---- Nav gets a border once the page scrolls ----
const nav = document.querySelector(".site-nav");
const onScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 4);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---- Count-up numbers: <span data-count="356" data-decimals="0">356</span> ----
function countUp(el) {
  const target = Number(el.dataset.count);
  const decimals = Number(el.dataset.decimals ?? 0);
  const format = (v) => v.toFixed(decimals);
  if (reduceMotion || !Number.isFinite(target)) { el.textContent = format(target); return; }
  const duration = 1400;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = format(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---- Reveal on scroll ----
const reveals = document.querySelectorAll(".reveal");
const counters = document.querySelectorAll("[data-count]");
if (!reduceMotion) counters.forEach((el) => { el.textContent = (0).toFixed(Number(el.dataset.decimals ?? 0)); });

if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      entry.target.querySelectorAll("[data-count]").forEach(countUp);
      if (entry.target.matches("[data-count]")) countUp(entry.target);
      io.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  reveals.forEach((el) => io.observe(el));
  // Counters outside any .reveal still animate when seen.
  counters.forEach((el) => { if (!el.closest(".reveal")) io.observe(el); });
} else {
  reveals.forEach((el) => el.classList.add("is-in"));
  counters.forEach(countUp);
}
