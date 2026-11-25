// Butterfly chart · RQ1 · "Which platform targets us better?"
// Owner: TBD
// Contract: see the header of treemap.js.
import { renderPlaceholder } from "./placeholder.js";

const SPEC = {
  title: "Butterfly chart: Instagram vs YouTube",
  owner: "TBD",
  file: "js/charts/butterfly.js",
  todo: [
    "Instagram bars to the left, YouTube to the right, same 0–100% scale on both sides",
    "One row per metric: highRelevanceShare, clickRate, intrusiveRate, interestMatchRate, seenBeforeRate (metrics.js)",
    "Respect state.weighting via computeMetric(key, rows, state.weighting)",
    "Label which direction is good (more clicks) vs bad (more intrusive)",
    "Tooltip: exact % and number of ads behind it",
  ],
};

export function createButterfly(container) {
  return {
    update({ rows, ads, state }) {
      renderPlaceholder(container, SPEC, { rows });
    },
  };
}
