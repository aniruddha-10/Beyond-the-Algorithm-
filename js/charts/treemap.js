// Treemap · RQ1 · "What kinds of ads do we actually see?"
// Owner: TBD
//
// Contract (same for every chart):
//   createTreemap(container, { brands }) is called once and returns { update }.
//   update({ rows, ads, state }) runs after every filter/theme/resize change:
//     rows  = ads after all filters      ads = all 356 ads      state = see js/state.js
//   Redraw from scratch or with d3 joins; read container.clientWidth for size.
//   To filter the dashboard: setState({ category: "Finance" }) from ../state.js.
import { renderPlaceholder } from "./placeholder.js";

const SPEC = {
  title: "Treemap: ad categories",
  owner: "TBD",
  file: "js/charts/treemap.js",
  todo: [
    "Tile area = number of ads; tile colour = average relevance (relevanceColor in theme.js)",
    "Top-N slider; categories past N fold into \"Everything else\"",
    "Click a tile → setState({ category }); click again to clear",
    "Keep all tiles visible while a category is selected: filterAds(ads, state, { ignore: [\"category\"] })",
    "Tooltip: ads, average relevance, top brands for that category (brands.json, aggregate only)",
  ],
};

export function createTreemap(container, { brands }) {
  return {
    update({ rows, ads, state }) {
      renderPlaceholder(container, SPEC, { rows });
    },
  };
}
