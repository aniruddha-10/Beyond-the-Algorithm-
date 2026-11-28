// Entry point: load data, build the filter bar, cards and charts, and
// re-render everything whenever the filters, theme or window size change.
import * as d3 from "./d3.js";
import { getState, onChange, filterAds } from "./state.js";
import { createFilters } from "./filters.js";
import { createCards } from "./cards.js";
import { setupPanels } from "./panels.js";
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

// animate = true only when the data changed (a filter), so charts glide to their
// new values. Resizes, theme changes and the first draw are instant.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function render(animate = false) {
  const state = getState();
  const rows = filterAds(ads, state);
  for (const view of views) view.update({ rows, ads, state, animate: animate && !reduceMotion });
}

setupPanels(() => render(false));
onChange(() => render(true));
window.addEventListener("resize", debounce(() => render(false), 150));
window.addEventListener("themechange", () => render(false)); // fired by site.js (toggle or OS change)
render(false);

function debounce(fn, ms) {
  let t;
  return () => { clearTimeout(t); t = setTimeout(fn, ms); };
}

