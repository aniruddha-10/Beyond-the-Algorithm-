// Summary cards: ads shown, average relevance, click rate, felt intrusive.
import * as d3 from "./d3.js";
import { METRICS, computeMetric } from "./metrics.js";

const CARD_METRICS = ["avgRelevance", "clickRate", "intrusiveRate"];

export function createCards(container, ads) {
  const root = d3.select(container);

  return {
    update({ rows, state }) {
      const peopleCount = new Set(rows.map((d) => d.participant)).size;
      const cards = [
        {
          label: "Ads shown",
          value: d3.format(",")(rows.length),
          note: `of ${ads.length} · ${peopleCount} ${peopleCount === 1 ? "person" : "people"}`,
        },
        ...CARD_METRICS.map((key) => {
          const shown = computeMetric(key, rows, state.weighting);
          const other = computeMetric(key, rows, state.weighting === "pooled" ? "balanced" : "pooled");
          return {
            label: METRICS[key].label,
            value: METRICS[key].format(shown.value),
            note: `${state.weighting === "pooled" ? "each person equally" : "every ad once"}: ${METRICS[key].format(other.value)}`,
          };
        }),
      ];

      const card = root.selectAll(".card").data(cards).join((enter) => {
        const c = enter.append("div").attr("class", "card");
        c.append("div").attr("class", "card-label");
        c.append("div").attr("class", "card-value");
        c.append("div").attr("class", "card-note");
        return c;
      });
      card.select(".card-label").text((d) => d.label);
      card.select(".card-value").text((d) => d.value);
      card.select(".card-note").text((d) => d.note);
    },
  };
}
