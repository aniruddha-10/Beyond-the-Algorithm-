// Dumbbell chart · RQ4 · "Does Instagram beat YouTube for each of us?"
// Owner: TBD
// Contract: see the header of treemap.js.
//
// One row per participant: circle = Instagram, square = YouTube, joined by a
// line. A last "All" row follows the pooled / each-person-equally toggle.
// The chart always compares both platforms, so it ignores the platform filter.
import * as d3 from "../d3.js";
import { filterAds, PARTICIPANTS } from "../state.js";
import { computeMetric, METRICS } from "../metrics.js";
import { platformColor } from "../theme.js";
import { showTooltip, hideTooltip } from "../tooltip.js";

const METRIC_KEYS = ["avgRelevance", "highRelevanceShare", "clickRate", "intrusiveRate"];
const SHORT = { Instagram: "IG", YouTube: "YT" };
const FEW_ADS = 5;  // fewer ads than this → hollow marker
const TOP = 18;     // room for the "Gap" column header
const BOTTOM = 22;
const FADED = 0.3;

export function createDumbbell(container) {
  const root = d3.select(container);
  let metricKey = "avgRelevance";
  let order = "participant";
  let last = null;

  const controls = root.append("div").attr("class", "chart-controls");
  controls.append("select").attr("aria-label", "Measure")
    .on("change", function () { metricKey = this.value; if (last) draw(last); })
    .selectAll("option").data(METRIC_KEYS).join("option")
    .attr("value", (d) => d).text((d) => METRICS[d].label);
  controls.append("select").attr("aria-label", "Row order")
    .on("change", function () { order = this.value; if (last) draw(last); })
    .selectAll("option").data([["participant", "P1 to P5"], ["gap", "Biggest gap first"]]).join("option")
    .attr("value", (d) => d[0]).text((d) => d[1]);

  const legend = controls.append("div").attr("class", "legend");
  const plot = root.append("div").attr("class", "chart-plot");
  const svg = plot.append("svg").attr("role", "group");

  function draw({ ads, state }) {
    const metric = METRICS[metricKey];
    const base = filterAds(ads, state, { ignore: ["platforms"] });
    const faded = (p) => !state.platforms.includes(p);

    // Legend first (it shares the panel with the plot), then measure the plot.
    const fadedNote = (p) => (faded(p) ? " (filtered out)" : "");
    legend.html(`
      <span class="legend-item${faded("Instagram") ? " is-faded" : ""}"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" style="fill: var(--instagram)"/></svg>Instagram${fadedNote("Instagram")}</span>
      <span class="legend-item${faded("YouTube") ? " is-faded" : ""}"><svg width="12" height="12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="1.5" style="fill: var(--youtube)"/></svg>YouTube${fadedNote("YouTube")}</span>
      <span class="legend-item"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" style="fill: none; stroke: var(--text-muted); stroke-width: 1.5"/></svg>Hollow: under ${FEW_ADS} ads</span>
    `);
    const width = plot.node().clientWidth;
    const left = 104;
    const right = Math.min(120, Math.max(84, width * 0.2));

    // Per person: metric for each platform. Plus one "All" row.
    const people = PARTICIPANTS
      .map((participant) => ({ participant, rows: base.filter((d) => d.participant === participant) }))
      .filter((d) => d.rows.length);
    const rowsFor = (rows) => ({
      Instagram: computeMetric(metricKey, rows.filter((d) => d.platform === "Instagram"), state.weighting),
      YouTube: computeMetric(metricKey, rows.filter((d) => d.platform === "YouTube"), state.weighting),
    });
    let data = people.map((p) => ({ id: p.participant, label: p.participant, ...rowsFor(p.rows) }));
    for (const d of data) d.gap = d.Instagram.value - d.YouTube.value;
    if (order === "gap") {
      data.sort((a, b) => (Number.isFinite(b.gap) - Number.isFinite(a.gap)) || Math.abs(b.gap) - Math.abs(a.gap));
    }
    if (people.length > 1) {
      const all = { id: "all", label: "All", isAll: true, ...rowsFor(base) };
      all.gap = all.Instagram.value - all.YouTube.value;
      data = [...data, all];
    }

    // Rows share whatever height the panel gives the plot.
    const ROW_H = Math.max(14, Math.min(48, (plot.node().clientHeight - TOP - BOTTOM) / Math.max(1, data.length)));
    const roomy = ROW_H >= 32; // room for the "70 IG · 45 YT" line under each name
    const r = ROW_H < 20 ? 4.5 : ROW_H < 26 ? 5.5 : 7;
    const height = TOP + Math.max(1, data.length) * ROW_H + BOTTOM;
    svg.attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height])
      .attr("aria-label", `${metric.label} on Instagram and YouTube for each participant`);
    svg.selectAll("*").remove();

    if (!data.length) {
      svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle")
        .text("No ads match the current filters.");
      return;
    }

    // Scale: relevance on its fixed 1–5 range; rates from 0 to a rounded-up max.
    const isRate = metric.domain[1] === 1;
    const maxValue = d3.max(data, (d) => Math.max(d.Instagram.value || 0, d.YouTube.value || 0));
    const domain = isRate ? [0, Math.min(1, Math.max(0.1, Math.ceil(maxValue * 10) / 10))] : metric.domain;
    const x = d3.scaleLinear().domain(domain).range([roomy ? left : 52, width - right]);
    const y = (i) => TOP + i * ROW_H + ROW_H / 2;

    // Grid + axis labels.
    const ticks = isRate ? x.ticks(5) : [1, 2, 3, 4, 5];
    svg.append("g").selectAll("line").data(ticks).join("line")
      .attr("x1", (v) => x(v)).attr("x2", (v) => x(v))
      .attr("y1", TOP).attr("y2", height - BOTTOM + 4)
      .style("stroke", "var(--grid)");
    svg.append("g").selectAll("text").data(ticks).join("text")
      .attr("x", (v) => x(v)).attr("y", height - 6).attr("text-anchor", "middle")
      .style("font-size", "11px").style("fill", "var(--text-muted)")
      .text((v) => (isRate ? d3.format(".0%")(v) : v));

    svg.append("text")
      .attr("x", width - right + 14).attr("y", 11)
      .style("font-size", "11px").style("fill", "var(--text-muted)")
      .text(isRate ? "Gap (pts)" : "Gap");

    const row = svg.append("g").selectAll("g").data(data).join("g")
      .attr("transform", (d, i) => `translate(0,${y(i)})`);

    // Divider above "All".
    row.filter((d) => d.isAll).append("line")
      .attr("x1", 0).attr("x2", width).attr("y1", -ROW_H / 2).attr("y2", -ROW_H / 2)
      .style("stroke", "var(--border)");

    // Row labels.
    row.append("text").attr("y", roomy ? -2 : 4)
      .style("fill", "var(--text-primary)").style("font-weight", 600).style("font-size", "13px")
      .text((d) => d.label);
    row.append("text").attr("y", 13)
      .style("fill", "var(--text-muted)").style("font-size", "11px")
      .text((d) => (!roomy ? "" : d.isAll
        ? (state.weighting === "balanced" ? "each person equally" : "every ad once")
        : `${d.Instagram.n} IG · ${d.YouTube.n} YT`));

    // Connector.
    row.filter((d) => Number.isFinite(d.gap)).append("line")
      .attr("x1", (d) => x(d.Instagram.value)).attr("x2", (d) => x(d.YouTube.value))
      .style("stroke", "var(--neutral)").style("stroke-width", 2);

    // Markers: YouTube square first so the Instagram circle sits on top when they overlap.
    const marker = (sel, platform, draw) => sel
      .filter((d) => Number.isFinite(d[platform].value))
      .append(draw)
      .style("opacity", faded(platform) ? FADED : 1)
      .style("fill", (d) => (isFew(d, platform) ? "var(--surface-1)" : platformColor(platform)))
      .style("stroke", (d) => (isFew(d, platform) ? platformColor(platform) : "var(--surface-1)"))
      .style("stroke-width", 2);
    const isFew = (d, p) => !d.isAll && d[p].n < FEW_ADS;
    marker(row, "YouTube", "rect")
      .attr("x", (d) => x(d.YouTube.value) - (r - 1)).attr("y", -(r - 1)).attr("width", 2 * (r - 1)).attr("height", 2 * (r - 1)).attr("rx", 2);
    marker(row, "Instagram", "circle")
      .attr("cx", (d) => x(d.Instagram.value)).attr("r", r);

    // Gap label on the right, in text colour (the marker beside it carries identity).
    row.append("text")
      .attr("x", width - right + 14).attr("y", 4)
      .style("font-variant-numeric", "tabular-nums")
      .style("fill", "var(--text-secondary)")
      .text((d) => gapText(d, isRate));

    // Hover target: the whole row.
    row.append("rect")
      .attr("x", 0).attr("y", -ROW_H / 2).attr("width", width).attr("height", ROW_H)
      .style("fill", "transparent")
      .on("mousemove", (event, d) => showTooltip(event, tooltipFor(d, metric, state)))
      .on("mouseleave", hideTooltip);
  }

  return {
    update(args) {
      last = args;
      draw(args);
    },
  };
}

function gapText(d, isRate) {
  if (!Number.isFinite(d.Instagram.value)) return "only YT ads";
  if (!Number.isFinite(d.YouTube.value)) return "only IG ads";
  const diff = isRate ? d.gap * 100 : d.gap;
  const shown = isRate ? diff.toFixed(1) : diff.toFixed(2);
  if (Number(shown) === 0) return "tie";
  return `${diff > 0 ? SHORT.Instagram : SHORT.YouTube} +${Math.abs(Number(shown)).toFixed(isRate ? 1 : 2)}${isRate ? " pts" : ""}`;
}

function tooltipFor(d, metric, state) {
  const line = (p) => {
    const m = d[p];
    if (!m.n) return `${p}: no ads`;
    const few = !d.isAll && m.n < FEW_ADS ? ` <span class="muted">(few ads)</span>` : "";
    const people = d.isAll && state.weighting === "balanced" ? `, average of ${m.people} people` : "";
    return `${p}: ${metric.format(m.value)} <span class="muted">(${m.n} ads${people})</span>${few}`;
  };
  const title = d.isAll ? `All selected people · ${state.weighting === "balanced" ? "each person equally" : "every ad once"}` : d.label;
  return `<strong>${title}</strong> · ${metric.label}<br>${line("Instagram")}<br>${line("YouTube")}`;
}
