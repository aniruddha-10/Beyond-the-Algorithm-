// Treemap · RQ1 · "What kinds of ads do we actually see?"
// Owner: TBD
//
// Contract (same for every chart):
//   createTreemap(container, { brands }) is called once and returns { update }.
//   update({ rows, ads, state }) runs after every filter/theme/resize change:
//     rows  = ads after all filters      ads = all 356 ads      state = see js/state.js
//   Redraw from scratch or with d3 joins; read container.clientWidth for size.
//   To filter the dashboard: setState({ category: "Finance" }) from ../state.js.
//
// Tile area = number of ads, tile colour = average relevance. Clicking a tile
// filters the whole dashboard to that category; the treemap itself ignores the
// category filter so every tile stays visible.
import * as d3 from "../d3.js";
import { filterAds, setState } from "../state.js";
import { computeMetric, METRICS } from "../metrics.js";
import { relevanceColor } from "../theme.js";
import { showTooltip, hideTooltip } from "../tooltip.js";

const DEFAULT_TOP_N = 10;
const MIN_TOP_N = 3;
const OTHER = "__other__";

export function createTreemap(container, { brands }) {
  const root = d3.select(container);
  let topN = DEFAULT_TOP_N;
  let last = null; // most recent update() args, so the slider can redraw

  // --- one-time setup: controls, svg, legend, note ---
  const controls = root.append("div").attr("class", "chart-controls");
  const sliderLabel = controls.append("label");
  sliderLabel.append("span").text("Categories shown ");
  const slider = sliderLabel.append("input")
    .attr("type", "range")
    .attr("min", MIN_TOP_N)
    .attr("step", 1)
    .attr("aria-label", "Number of categories shown before the rest are combined");
  const sliderValue = sliderLabel.append("output").attr("class", "treemap-n");
  slider.on("input", function () {
    topN = +this.value;
    if (last) draw(last);
  });

  const svg = root.append("svg").attr("role", "group").attr("aria-label", "Treemap of ad categories");
  const legend = root.append("div").attr("class", "legend");
  const note = root.append("p").attr("class", "chart-note");

  function draw({ ads, state }) {
    // Keep every category visible while one is selected.
    const base = filterAds(ads, state, { ignore: ["category"] });
    const width = container.clientWidth;
    const height = Math.round(Math.max(280, Math.min(400, width * 0.4)));

    const groups = d3.rollups(base, (v) => v, (d) => d.category)
      .map(([category, rows]) => ({
        category,
        rows,
        n: rows.length,
        relevance: computeMetric("avgRelevance", rows, state.weighting).value,
      }))
      .sort((a, b) => b.n - a.n || d3.ascending(a.category, b.category));

    const maxN = Math.max(MIN_TOP_N, groups.length);
    topN = Math.min(topN, maxN);
    slider.attr("max", maxN).property("value", topN).property("disabled", groups.length <= MIN_TOP_N);
    sliderValue.text(topN >= groups.length ? `all ${groups.length}` : `top ${topN} of ${groups.length}`);

    // Top N, plus the selected category even if it ranks lower.
    const shown = groups.filter((g, i) => i < topN || g.category === state.category);
    const folded = groups.filter((g) => !shown.includes(g));
    const items = [...shown];
    if (folded.length) {
      const rows = folded.flatMap((g) => g.rows);
      items.push({ category: OTHER, rows, n: rows.length, folded, relevance: NaN });
    }

    svg.attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]);

    if (!base.length) {
      svg.selectAll("*").remove();
      svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle")
        .text("No ads match the current filters.");
      legend.html("");
      note.text("");
      return;
    }
    svg.selectAll(":scope > text").remove();

    const hierarchy = d3.hierarchy({ children: items })
      .sum((d) => d.n ?? 0)
      // "Everything else" always goes last (bottom-right), the rest by size.
      .sort((a, b) => (a.data.category === OTHER) - (b.data.category === OTHER) || b.value - a.value);
    d3.treemap().size([width, height]).paddingInner(2).round(true).tile(d3.treemapSquarify.ratio(1.4))(hierarchy);

    const total = base.length;
    const fillOf = (d) => (d.category === OTHER ? "var(--neutral)" : relevanceColor(d.relevance));
    const inkOf = (d) => (d.category === OTHER ? "var(--text-primary)" : d3.lab(fillOf(d)).l > 62 ? "#0b0b0b" : "#ffffff");

    const tile = svg.selectAll("g.treemap-tile")
      .data(hierarchy.leaves(), (d) => d.data.category)
      .join((enter) => {
        const g = enter.append("g").attr("class", "treemap-tile").attr("tabindex", 0);
        g.append("rect").attr("rx", 4);
        g.append("text").attr("class", "treemap-name").attr("x", 8).attr("y", 18);
        g.append("text").attr("class", "treemap-count").attr("x", 8).attr("y", 34);
        return g;
      })
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .attr("role", "button")
      .attr("aria-pressed", (d) => String(d.data.category === state.category))
      .attr("aria-label", (d) => labelFor(d.data, total))
      .classed("is-other", (d) => d.data.category === OTHER)
      .style("opacity", (d) => (state.category && d.data.category !== state.category ? 0.35 : 1));

    tile.select("rect")
      .attr("width", (d) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .style("fill", (d) => fillOf(d.data))
      .style("stroke", (d) => (d.data.category === state.category ? "var(--text-primary)" : "none"))
      .style("stroke-width", 2);

    tile.select(".treemap-name")
      .style("fill", (d) => inkOf(d.data))
      .text((d) => {
        const w = d.x1 - d.x0, h = d.y1 - d.y0;
        if (w < 44 || h < 24) return "";
        const name = d.data.category === OTHER ? `Everything else (${d.data.folded.length})` : d.data.category;
        return fit(name, w - 14, 7.2);
      });

    tile.select(".treemap-count")
      .style("fill", (d) => inkOf(d.data))
      .text((d) => {
        const w = d.x1 - d.x0, h = d.y1 - d.y0;
        if (w < 44 || h < 42) return "";
        const count = `${d.data.n} ads`;
        const full = d.data.category === OTHER ? count : `${count} · ${METRICS.avgRelevance.format(d.data.relevance)}`;
        // Drop the relevance before truncating the count.
        return fit(full.length * 6.6 <= w - 14 ? full : count, w - 14, 6.6);
      });

    tile
      .on("mousemove", (event, d) => showTooltip(event, tooltipFor(d.data, total, state)))
      .on("mouseleave", hideTooltip)
      .on("click", (event, d) => activate(d.data, state, groups.length))
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate(d.data, state, groups.length);
        }
      });

    // Legend: colour ramp + what grey means.
    const stops = d3.range(1, 5.01, 0.5).map((v, i, a) => `${relevanceColor(v)} ${(i / (a.length - 1)) * 100}%`);
    legend.html(`
      <span>Area = number of ads</span>
      <span class="legend-item">Average relevance
        <span class="legend-ramp-wrap"><span class="legend-ramp" style="background: linear-gradient(to right, ${stops.join(", ")})"></span>
        <span class="legend-ramp-labels"><span>1 · not relevant</span><span>5 · specific need</span></span></span>
      </span>
      ${folded.length ? `<span class="legend-item"><span class="legend-swatch" style="background: var(--neutral)"></span>Smaller categories combined</span>` : ""}
    `);

    const shownAds = d3.sum(shown, (g) => g.n);
    note.text(
      state.category
        ? `Filtered to ${state.category}. Click it again (or Reset) to show all categories.`
        : `Click a category to filter the whole dashboard. ${folded.length ? `The ${shown.length} largest categories hold ${shownAds} of ${total} ads.` : ""}`
    );
  }

  function activate(d, state, categoryCount) {
    hideTooltip();
    if (d.category === OTHER) {
      topN = categoryCount; // expand instead of filtering to a mixed group
      if (last) draw(last);
      return;
    }
    setState({ category: state.category === d.category ? null : d.category });
  }

  function tooltipFor(d, total, state) {
    const share = d3.format(".0%")(d.n / total);
    if (d.category === OTHER) {
      const list = d.folded.slice(0, 6).map((g) => `${g.category} (${g.n})`).join(", ");
      const more = d.folded.length > 6 ? `, and ${d.folded.length - 6} more` : "";
      return `<strong>Everything else</strong><br>${d.n} ads (${share}) across ${d.folded.length} categories<br>
        <span class="muted">${list}${more}</span><br><span class="muted">Click to show every category.</span>`;
    }
    const rel = computeMetric("avgRelevance", d.rows, state.weighting);
    const relNote = state.weighting === "balanced" ? `average of ${rel.people} ${rel.people === 1 ? "person" : "people"}` : `${d.n} ads`;
    const top = topBrands(d.category, state.platforms);
    return `<strong>${d.category}</strong><br>${d.n} ads (${share} of shown)<br>
      Average relevance ${METRICS.avgRelevance.format(rel.value)} <span class="muted">(${relNote})</span>
      ${top.length ? `<br><span class="muted">Top brands, everyone, all dates: ${top.join(", ")}</span>` : ""}`;
  }

  // brands.json is aggregate only (no participant or date), so this follows the platform filter only.
  function topBrands(category, platforms) {
    return d3.rollups(
      brands.filter((b) => b.category === category && platforms.includes(b.platform)),
      (v) => d3.sum(v, (b) => b.count),
      (b) => b.brand
    )
      .sort((a, b) => b[1] - a[1] || d3.ascending(a[0], b[0]))
      .slice(0, 3)
      .map(([brand, n]) => `${brand} (${n})`);
  }

  return {
    update(args) {
      last = args;
      draw(args);
    },
  };
}

function labelFor(d, total) {
  if (d.category === OTHER) return `Everything else: ${d.n} ads in ${d.folded.length} smaller categories. Activate to show all.`;
  return `${d.category}: ${d.n} of ${total} ads, average relevance ${METRICS.avgRelevance.format(d.relevance)}`;
}

/** Truncate text to roughly fit a width, given an average character width. */
function fit(text, width, charWidth) {
  const max = Math.floor(width / charWidth);
  if (text.length <= max) return text;
  return max > 3 ? `${text.slice(0, max - 1)}…` : "";
}
