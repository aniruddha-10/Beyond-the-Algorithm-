// Dumbbell chart · RQ4 · "Does Instagram beat YouTube for each of us?"
// Owner: TBD
// Contract: see the header of treemap.js.
import { renderPlaceholder } from "./placeholder.js";

const SPEC = {
  title: "Dumbbell chart: each person, Instagram vs YouTube",
  owner: "TBD",
  file: "js/charts/dumbbell.js",
  todo: [
    "One row per participant (P1–P5); circle = Instagram, square = YouTube (shape + colour, not colour alone)",
    "Metric dropdown: avgRelevance, clickRate, intrusiveRate, highRelevanceShare (metrics.js)",
    "Filter rows by platform yourself: this chart always compares both, so use filterAds(ads, state, { ignore: [\"platforms\"] })",
    "Tooltip: exact value and number of ads",
    "Optional: sort rows by gap size",
  ],
};

export function createDumbbell(container) {
  return {
    update({ rows, ads, state }) {
      renderPlaceholder(container, SPEC, { rows });
    },
  };
}
