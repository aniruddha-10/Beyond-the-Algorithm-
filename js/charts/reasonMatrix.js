// Reason × relevance matrix · RQ3 · "When does a relevant ad start to feel too personal?"
// Owner: TBD
// Contract: see the header of treemap.js.
import { renderPlaceholder } from "./placeholder.js";

const SPEC = {
  title: "Matrix: perceived reason × relevance, coloured by intrusiveness",
  owner: "TBD",
  file: "js/charts/reasonMatrix.js",
  todo: [
    "Rows = perceived reason (REASONS in theme.js; fold rare ones into \"Other reasons\"), columns = relevance 1–5",
    "Circle area = number of ads; colour = % felt intrusive (a second one-hue ramp, not blue)",
    "Treat reasons as self-reports, not proof of targeting (say so in a caption)",
    "Tooltip: reason, rating, ads, % intrusive",
  ],
};

export function createReasonMatrix(container) {
  return {
    update({ rows, ads, state }) {
      renderPlaceholder(container, SPEC, { rows });
    },
  };
}
