// Butterfly chart · RQ1 · "Which platform targets us better?"
// Owner: TBD
// Contract: see the header of treemap.js.
//
// Instagram grows left, YouTube grows right, on one shared 0–100% scale.
// The chart always compares both platforms, so it ignores the platform filter
// and fades the side that is filtered out elsewhere on the dashboard.
import * as d3 from "../d3.js";
import { filterAds, PLATFORMS } from "../state.js";
import { computeMetric, METRICS } from "../metrics.js";
import { platformColor } from "../theme.js";
import { showTooltip, hideTooltip } from "../tooltip.js";

const ROWS = [
  { key: "highRelevanceShare", hint: "higher is better" },
  { key: "interestMatchRate", hint: "higher is better" },
  { key: "clickRate", hint: "higher is better" },
  { key: "seenBeforeRate", hint: "repeat exposure" },
  { key: "intrusiveRate", hint: "lower is better" },
];

const ROW_H = 46;
const BAR_H = 16;
const TOP = 34;     // room for the platform headers
const BOTTOM = 26;  // room for the axis labels
const VALUE_W = 44; // room for the value label past the end of a bar
const FADED = 0.3;

export function createButterfly(container) {
  const root = d3.select(container);
  const svg = root.append("svg").attr("role", "group").attr("aria-label", "Instagram versus YouTube on five measures");
  const note = root.append("p").attr("class", "chart-note");

  return {
    update({ ads, state }) {
      const base = filterAds(ads, state, { ignore: ["platforms"] });
      const width = container.clientWidth;
      const narrow = width < 440;
      const labelW = Math.round(Math.min(170, Math.max(narrow ? 128 : 140, width * 0.32)));
      const side = Math.max(40, (width - labelW) / 2 - VALUE_W);
      const height = TOP + ROWS.length * ROW_H + BOTTOM;

      // x positions: left bars end at leftEdge, right bars start at rightEdge.
      const leftEdge = VALUE_W + side;
      const rightEdge = leftEdge + labelW;
      const x = d3.scaleLinear().domain([0, 1]).range([0, side]);

      const byPlatform = new Map(PLATFORMS.map((p) => [p, base.filter((d) => d.platform === p)]));
      const data = ROWS.flatMap((row, i) =>
        PLATFORMS.map((platform) => {
          const rows = byPlatform.get(platform);
          const m = computeMetric(row.key, rows, state.weighting);
          return { ...row, i, platform, ...m, hits: Math.round(m.value * m.n) };
        })
      );
      const faded = (p) => !state.platforms.includes(p);

      svg.attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]);
      svg.selectAll("*").remove();

      // Platform headers with n.
      const header = svg.append("g").attr("class", "butterfly-header");
      PLATFORMS.forEach((p) => {
        const isLeft = p === "Instagram";
        const g = header.append("g").style("opacity", faded(p) ? FADED : 1);
        const cx = isLeft ? leftEdge - 6 : rightEdge + 6;
        g.append("rect")
          .attr("x", isLeft ? cx - 10 : cx).attr("y", 6).attr("width", 10).attr("height", 10).attr("rx", 3)
          .style("fill", platformColor(p));
        g.append("text")
          .attr("x", isLeft ? cx - 16 : cx + 16).attr("y", 15)
          .attr("text-anchor", isLeft ? "end" : "start")
          .style("fill", "var(--text-primary)").style("font-weight", 600)
          .text(p);
        g.append("text")
          .attr("x", isLeft ? cx - 16 : cx + 16).attr("y", 29)
          .attr("text-anchor", isLeft ? "end" : "start")
          .style("font-size", "11px").style("fill", "var(--text-muted)")
          .text(`${byPlatform.get(p).length} ads`);
      });

      // Grid at 0 / 50 / 100% on both sides.
      const ticks = side < 110 ? [0, 1] : [0, 0.5, 1];
      const grid = svg.append("g").attr("class", "butterfly-grid");
      const gridX = (v, isLeft) => (isLeft ? leftEdge - x(v) : rightEdge + x(v));
      for (const isLeft of [true, false]) {
        grid.selectAll(null).data(ticks).join("line")
          .attr("x1", (v) => gridX(v, isLeft)).attr("x2", (v) => gridX(v, isLeft))
          .attr("y1", TOP).attr("y2", height - BOTTOM + 4)
          .style("stroke", "var(--grid)");
        grid.selectAll(null).data(ticks).join("text")
          .attr("x", (v) => gridX(v, isLeft)).attr("y", height - 6)
          .attr("text-anchor", "middle")
          .style("font-size", "11px").style("fill", "var(--text-muted)")
          .text((v) => d3.format(".0%")(v));
      }

      // Row labels in the middle column.
      const label = svg.append("g").selectAll("g").data(ROWS).join("g")
        .attr("transform", (d, i) => `translate(${leftEdge + labelW / 2},${TOP + i * ROW_H + ROW_H / 2})`)
        .attr("text-anchor", "middle");
      label.append("text").attr("y", -2).style("fill", "var(--text-primary)").style("font-size", narrow ? "12px" : "13px")
        .text((d) => METRICS[d.key].label);
      label.append("text").attr("y", 13).style("fill", "var(--text-muted)").style("font-size", "11px")
        .text((d) => d.hint);

      // Bars, value labels and a full-width hover target per side.
      const cell = svg.append("g").selectAll("g").data(data).join("g")
        .attr("class", "butterfly-cell")
        .attr("transform", (d) => `translate(0,${TOP + d.i * ROW_H})`)
        .style("opacity", (d) => (faded(d.platform) ? FADED : 1));

      const barY = (ROW_H - BAR_H) / 2;
      cell.append("path")
        .attr("d", (d) => {
          if (!Number.isFinite(d.value) || d.value === 0) return null;
          const w = x(d.value);
          return d.platform === "Instagram"
            ? bar(leftEdge - w, barY, w, BAR_H, "left")
            : bar(rightEdge, barY, w, BAR_H, "right");
        })
        .style("fill", (d) => platformColor(d.platform));

      cell.append("text")
        .attr("x", (d) => {
          const w = Number.isFinite(d.value) ? x(d.value) : 0;
          return d.platform === "Instagram" ? leftEdge - w - 6 : rightEdge + w + 6;
        })
        .attr("y", ROW_H / 2 + 4)
        .attr("text-anchor", (d) => (d.platform === "Instagram" ? "end" : "start"))
        .style("font-variant-numeric", "tabular-nums")
        .style("fill", "var(--text-secondary)")
        .text((d) => (Number.isFinite(d.value) ? METRICS[d.key].format(d.value) : "no ads"));

      cell.append("rect")
        .attr("x", (d) => (d.platform === "Instagram" ? 0 : rightEdge))
        .attr("width", (d) => (d.platform === "Instagram" ? leftEdge : Math.max(0, width - rightEdge)))
        .attr("height", ROW_H)
        .style("fill", "transparent")
        .on("mousemove", (event, d) => showTooltip(event, tooltipFor(d, state)))
        .on("mouseleave", hideTooltip);

      const fadedNames = PLATFORMS.filter(faded);
      note.text(
        `Both sides use the same 0–100% scale.` +
        (fadedNames.length ? ` ${fadedNames.join(" and ")} is filtered out elsewhere, so it is faded here for comparison.` : "")
      );
    },
  };
}

function tooltipFor(d, state) {
  const title = `<strong>${d.platform} · ${METRICS[d.key].label}</strong>`;
  if (!Number.isFinite(d.value)) return `${title}<br>No ${d.platform} ads match the filters.`;
  const value = METRICS[d.key].format(d.value);
  if (state.weighting === "pooled") return `${title}<br>${value} (${d.hits} of ${d.n} ads)`;
  const people = d.byParticipant.map((p) => `${p.participant} ${METRICS[d.key].format(p.value)} (${p.n})`).join(" · ");
  return `${title}<br>${value}: average of ${d.people} ${d.people === 1 ? "person" : "people"}, ${d.n} ads
    <br><span class="muted">${people}</span>`;
}

/** Horizontal bar with 4px rounded corners on the outer end only. */
function bar(x, y, w, h, roundSide) {
  const r = Math.min(4, w / 2, h / 2);
  if (roundSide === "right") {
    return `M${x},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x}Z`;
  }
  return `M${x + w},${y}H${x + r}A${r},${r} 0 0 0 ${x},${y + r}V${y + h - r}A${r},${r} 0 0 0 ${x + r},${y + h}H${x + w}Z`;
}
