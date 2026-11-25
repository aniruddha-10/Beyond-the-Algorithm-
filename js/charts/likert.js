// Diverging stacked bars · RQ2 · "Does matching our interests make an ad feel relevant?"
// Owner: TBD
// Contract: see the header of treemap.js.
import { renderPlaceholder } from "./placeholder.js";

const SPEC = {
  title: "Diverging bars: interest match vs relevance",
  owner: "TBD",
  file: "js/charts/likert.js",
  todo: [
    "Two bars (interestMatch true / false), each split into relevance 1–5, centred on rating 3",
    "Toggle: all people pooled vs one pair of bars per participant",
    "Show n for each bar; use the relevance ramp (relevanceColor in theme.js)",
    "Tooltip: rating, count and % of that bar",
  ],
};

export function createLikert(container) {
  return {
    update({ rows, ads, state }) {
      renderPlaceholder(container, SPEC, { rows });
    },
  };
}
