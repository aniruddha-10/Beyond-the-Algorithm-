// Summary stats in the header: ads shown, average relevance, click rate, felt intrusive.
// Shown as a borderless row of big numbers; the other weighting's value is in a hover tooltip.
import * as d3 from "./d3.js";
import { METRICS, computeMetric } from "./metrics.js";
import { showTooltip, hideTooltip } from "./tooltip.js";

const CARD_METRICS = ["avgRelevance", "clickRate", "intrusiveRate"];

export function createCards(container, ads) {
  const root = d3.select(container);
  const previous = new Map(); // label → last numeric value, so numbers count from old to new

  return {
    update({ rows, state, animate }) {
      const peopleCount = new Set(rows.map((d) => d.participant)).size;
      const cards = [
        {
          label: "Ads shown",
          value: rows.length,
          format: d3.format(","),
          note: `${rows.length} of ${ads.length} ads · ${peopleCount} ${peopleCount === 1 ? "person" : "people"}`,
        },
        ...CARD_METRICS.map((key) => {
          const shown = computeMetric(key, rows, state.weighting);
          const other = computeMetric(key, rows, state.weighting === "pooled" ? "balanced" : "pooled");
          return {
            label: METRICS[key].label,
            value: shown.value,
            format: METRICS[key].format,
            note: `${state.weighting === "pooled" ? "Counting each person equally" : "Counting every ad once"}: ${METRICS[key].format(other.value)}`,
          };
        }),
      ];

      const card = root.selectAll(".card").data(cards).join((enter) => {
        const c = enter.append("div").attr("class", "card").attr("tabindex", 0);
        c.append("div").attr("class", "card-value");
        c.append("div").attr("class", "card-label");
        return c;
      });
      card.select(".card-label").text((d) => d.label);
      card
        .attr("aria-label", (d) => `${d.label}: ${d.format(d.value)}. ${d.note}`)
        .on("mousemove", (event, d) => showTooltip(event, `<strong>${d.label}</strong><br>${d.note}`))
        .on("mouseleave", hideTooltip);

      const value = card.select(".card-value");
      if (animate) {
        value.transition().duration(700).ease(d3.easeCubicOut).textTween((d) => {
          const from = previous.get(d.label);
          if (!Number.isFinite(from) || !Number.isFinite(d.value)) return () => d.format(d.value);
          const i = d3.interpolateNumber(from, d.value);
          return (t) => d.format(i(t));
        });
      } else {
        value.interrupt().text((d) => d.format(d.value));
      }
      cards.forEach((d) => previous.set(d.label, d.value));
    },
  };
}
