// Entry point: load data, build the filter bar, cards and charts, and
// re-render everything whenever the filters, theme or window size change.
import * as d3 from "./d3.js";
import { getState, onChange, filterAds } from "./state.js";
import { isDark } from "./theme.js";
import { createFilters } from "./filters.js";
import { createCards } from "./cards.js";
import { createTreemap } from "./charts/treemap.js";
import { createButterfly } from "./charts/butterfly.js";
import { createDumbbell } from "./charts/dumbbell.js";
import { createLikert } from "./charts/likert.js";
import { createReasonMatrix } from "./charts/reasonMatrix.js";

const ads = await d3.json("data/ads.json");
const brands = await d3.json("data/brands.json");

createFilters(document.getElementById("filters"), ads);

const views = [
  createCards(document.getElementById("cards"), ads),
  createTreemap(document.getElementById("chart-treemap"), { brands }),
  createButterfly(document.getElementById("chart-butterfly")),
  createDumbbell(document.getElementById("chart-dumbbell")),
  createLikert(document.getElementById("chart-likert")),
  createReasonMatrix(document.getElementById("chart-reason")),
];

function render() {
  const state = getState();
  const rows = filterAds(ads, state);
  for (const view of views) view.update({ rows, ads, state });
}

onChange(render);
window.addEventListener("resize", debounce(render, 150));
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
setupThemeToggle(render);
render();

function debounce(fn, ms) {
  let t;
  return () => { clearTimeout(t); t = setTimeout(fn, ms); };
}

function setupThemeToggle(onToggle) {
  const button = document.getElementById("theme-toggle");
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  } catch { /* storage unavailable: follow the OS setting */ }

  const label = () => { button.textContent = isDark() ? "Light mode" : "Dark mode"; };
  label();

  button.addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch { /* ignore */ }
    label();
    onToggle();
  });
}
