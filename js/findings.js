// Findings page: four small, directly labelled charts computed from ads.json,
// so they always agree with the dashboard. Bars grow in when scrolled into view.
import * as d3 from "./d3.js";
import { platformColor, relevanceColor } from "./theme.js";

const ads = await d3.json("data/ads.json");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pct = d3.format(".0%");
const RATINGS = [1, 2, 3, 4, 5];

const charts = [
  mount("chart-relevance-split", drawRelevanceSplit),
  mount("chart-no-connection", drawWaffle),
  mount("chart-reasons", drawReasons),
  mount("chart-platforms", drawPlatforms),
];
window.addEventListener("themechange", () => charts.forEach((c) => c.redraw()));
window.addEventListener("resize", debounce(() => charts.forEach((c) => c.redraw()), 150));

/** Draw once off-screen-safe, then animate the first time the chart is seen. */
function mount(id, draw) {
  const el = document.getElementById(id);
  let seen = false;
  const render = (animate) => {
    el.innerHTML = "";
    draw(d3.select(el), el.clientWidth, animate && !reduceMotion, seen || reduceMotion);
  };
  render(false);
  new IntersectionObserver((entries, io) => {
    if (!entries[0].isIntersecting) return;
    seen = true;
    render(true);
    io.disconnect();
  }, { threshold: 0.3 }).observe(el);
  return { redraw: () => render(false) };
}

// Grow helper: bars start at zero until the chart has been seen.
function grow(sel, animate, delay = 0) {
  return animate ? sel.transition().duration(900).delay((d, i) => delay + i * 70).ease(d3.easeCubicOut) : sel;
}

// ---- 01: felt too personal / clicked, by relevance rating ----
function drawRelevanceSplit(root, width, animate, shown) {
  const rows = [
    { key: "intrusive", title: "Felt too personal" },
    { key: "clicked", title: "Clicked" },
  ];
  const byRating = RATINGS.map((r) => {
    const group = ads.filter((d) => d.relevance === r);
    return { r, n: group.length, intrusive: group.filter((d) => d.intrusive).length, clicked: group.filter((d) => d.clicked).length };
  });
  const panelH = 150, barArea = 92, top = 46, gap = 18;
  const height = rows.length * panelH + gap + 24;
  const x = d3.scaleBand().domain(RATINGS).range([0, width]).paddingInner(0.28).paddingOuter(0.1);
  const y = d3.scaleLinear().domain([0, 1]).range([0, barArea]);
  const svg = root.append("svg").attr("width", width).attr("height", height)
    .attr("role", "img").attr("aria-label", "Share of ads that felt too personal and that were clicked, at each relevance rating");

  rows.forEach((row, ri) => {
    const g = svg.append("g").attr("transform", `translate(0,${ri * (panelH + gap)})`);
    g.append("text").attr("class", "chart-title").attr("y", 14).text(row.title);
    const base = top + barArea;
    g.append("line").attr("x1", 0).attr("x2", width).attr("y1", base).attr("y2", base).style("stroke", "var(--border)");
    const cell = g.selectAll("g.cell").data(byRating).join("g").attr("transform", (d) => `translate(${x(d.r)},0)`);
    const bar = cell.append("path").style("fill", (d) => relevanceColor(d.r))
      .attr("d", (d) => topRounded(0, base, x.bandwidth(), shown && !animate ? y(d[row.key] / d.n) : 0));
    grow(bar, animate, ri * 250).attr("d", (d) => topRounded(0, base, x.bandwidth(), y(d[row.key] / d.n)));
    const label = cell.append("g").style("opacity", shown && !animate ? 1 : 0)
      .attr("transform", (d) => `translate(${x.bandwidth() / 2},${base - y(d[row.key] / d.n) - 8})`)
      .attr("text-anchor", "middle");
    label.append("text").attr("class", "value").attr("y", -12).text((d) => pct(d[row.key] / d.n));
    label.append("text").attr("y", 0).style("font-size", "10.5px").style("fill", "var(--text-muted)")
      .text((d) => `${d[row.key]}/${d.n}`);
    grow(label, animate, ri * 250 + 500).style("opacity", 1);
  });
  const axis = svg.append("g").attr("transform", `translate(0,${height - 6})`).attr("text-anchor", "middle");
  axis.selectAll("text").data(RATINGS).join("text")
    .attr("x", (r) => x(r) + x.bandwidth() / 2)
    .text((r) => (r === 1 ? "1 · not relevant" : r === 5 ? "5 · specific need" : r));
}

// ---- 02: waffle of all ads, "no obvious connection" first ----
function drawWaffle(root, width, animate, shown) {
  const cols = 24;
  const s = width / cols;
  const sorted = [...ads].sort((a, b) => (b.reason === "No obvious connection") - (a.reason === "No obvious connection") || a.id - b.id);
  const none = sorted.filter((d) => d.reason === "No obvious connection").length;
  const rowsN = Math.ceil(sorted.length / cols);
  const legendH = 34;
  const svg = root.append("svg").attr("width", width).attr("height", rowsN * s + legendH)
    .attr("role", "img").attr("aria-label", `${none} of ${ads.length} ads had no obvious connection to the person who saw them`);
  const legend = svg.append("g").attr("transform", "translate(0,12)");
  [[`${none} no obvious connection`, "var(--text-primary)"], [`${ads.length - none} had a reason we could name`, "var(--neutral)"]]
    .forEach(([text, fill], i) => {
      const g = legend.append("g").attr("transform", `translate(${i * Math.min(230, width / 2)},0)`);
      g.append("rect").attr("width", 11).attr("height", 11).attr("y", -9).attr("rx", 2).style("fill", fill);
      g.append("text").attr("x", 17).text(text).style("fill", "var(--text-primary)").style("font-size", "12.5px");
    });
  const cells = svg.append("g").attr("transform", `translate(0,${legendH})`)
    .selectAll("rect").data(sorted).join("rect")
    .attr("x", (d, i) => (i % cols) * s + 1).attr("y", (d, i) => Math.floor(i / cols) * s + 1)
    .attr("width", Math.max(1, s - 2)).attr("height", Math.max(1, s - 2)).attr("rx", Math.min(3, s / 5))
    .style("fill", (d) => (d.reason === "No obvious connection" ? "var(--text-primary)" : "var(--neutral)"))
    .style("opacity", shown && !animate ? 1 : 0);
  if (animate) cells.transition().duration(400).delay((d, i) => i * 3).style("opacity", 1);
}

// ---- 03: felt too personal, by reason given ----
function drawReasons(root, width, animate, shown) {
  const SHORT = {
    "Right after I talked or messaged about it": "After talking or messaging about it",
    "Right after I liked or followed similar content": "After liking or following similar posts",
    "Shopping or previous purchase": "Shopping or a past purchase",
    "Recent search or interest": "A recent search or interest",
    "Product already used": "A product we already use",
    "No obvious connection": "No obvious connection",
    "Demographic connection": "Our age, gender or background",
    "Location": "Where we were",
  };
  const data = d3.rollups(ads, (v) => ({ n: v.length, hits: v.filter((d) => d.intrusive).length }), (d) => d.reason)
    .map(([reason, v]) => ({ reason, label: SHORT[reason] ?? reason, ...v, share: v.hits / v.n }))
    .filter((d) => d.n >= 7)
    .sort((a, b) => b.share - a.share || b.n - a.n);
  // Wide: label column on the left. Narrow (phones): label above each bar.
  const stacked = width < 480;
  const rowH = stacked ? 46 : 34;
  const labelW = stacked ? 0 : Math.min(250, width * 0.5);
  const valueW = 64;
  const barH = 12;
  const barY = stacked ? 24 : rowH / 2 - barH / 2 + 2;
  const x = d3.scaleLinear().domain([0, 1]).range([0, Math.max(40, width - labelW - valueW)]);
  const svg = root.append("svg").attr("width", width).attr("height", data.length * rowH)
    .attr("role", "img").attr("aria-label", "Share of ads that felt too personal, by the reason given");
  const row = svg.selectAll("g").data(data).join("g").attr("transform", (d, i) => `translate(0,${i * rowH})`);
  const label = row.append("text").attr("y", stacked ? 14 : rowH / 2 - 1).style("fill", "var(--text-primary)").style("font-size", "12.5px");
  label.append("tspan").text((d) => d.label);
  if (stacked) {
    label.append("tspan").attr("dx", 8).style("font-size", "10.5px").style("fill", "var(--text-muted)").text((d) => `${d.hits} of ${d.n} ads`);
  } else {
    row.append("text").attr("y", rowH / 2 + 12).style("font-size", "10.5px").style("fill", "var(--text-muted)")
      .text((d) => `${d.hits} of ${d.n} ads`);
  }
  const bar = row.append("path")
    .style("fill", "var(--text-primary)")
    .style("opacity", (d) => (d.n < 15 ? 0.4 : 0.9))
    .attr("d", (d) => rightRounded(labelW, barY, shown && !animate ? x(d.share) : 0, barH));
  grow(bar, animate).attr("d", (d) => rightRounded(labelW, barY, x(d.share), barH));
  const value = row.append("text").attr("class", "value").attr("y", barY + barH - 2)
    .attr("x", (d) => labelW + x(d.share) + 8).text((d) => pct(d.share))
    .style("opacity", shown && !animate ? 1 : 0);
  grow(value, animate, 450).style("opacity", 1);
}

// ---- 04: interest match vs click rate, by platform ----
function drawPlatforms(root, width, animate, shown) {
  const metrics = [
    { title: "Matched one of our interests", test: (d) => d.interestMatch },
    { title: "Clicked", test: (d) => d.clicked },
  ];
  const platforms = ["Instagram", "YouTube"];
  const data = metrics.flatMap((m, mi) => platforms.map((p, pi) => {
    const rows = ads.filter((d) => d.platform === p);
    const hits = rows.filter(m.test).length;
    return { ...m, mi, pi, platform: p, n: rows.length, hits, share: hits / rows.length };
  }));
  const labelW = 86, valueW = 92, barH = 22, groupH = 98;
  const x = d3.scaleLinear().domain([0, 0.6]).range([0, Math.max(40, width - labelW - valueW)]);
  const svg = root.append("svg").attr("width", width).attr("height", metrics.length * groupH + 30)
    .attr("role", "img").attr("aria-label", "Interest match and click rate on Instagram and YouTube");
  const legend = svg.append("g").attr("transform", "translate(0,10)");
  platforms.forEach((p, i) => {
    const g = legend.append("g").attr("transform", `translate(${i * 110},0)`);
    g.append("rect").attr("width", 11).attr("height", 11).attr("y", -9).attr("rx", 3).style("fill", platformColor(p));
    g.append("text").attr("x", 17).text(p).style("fill", "var(--text-primary)").style("font-size", "12.5px");
  });
  metrics.forEach((m, mi) => {
    svg.append("text").attr("class", "chart-title").attr("y", 46 + mi * groupH).text(m.title);
  });
  const row = svg.selectAll("g.bar").data(data).join("g").attr("class", "bar")
    .attr("transform", (d) => `translate(0,${58 + d.mi * groupH + d.pi * (barH + 6)})`);
  row.append("text").attr("y", barH / 2 + 4).style("font-size", "12px").text((d) => d.platform);
  const bar = row.append("path").style("fill", (d) => platformColor(d.platform))
    .attr("d", (d) => rightRounded(labelW, 0, shown && !animate ? x(d.share) : 0, barH));
  grow(bar, animate).attr("d", (d) => rightRounded(labelW, 0, x(d.share), barH));
  const value = row.append("text").attr("class", "value").attr("y", barH / 2 + 4)
    .attr("x", (d) => labelW + x(d.share) + 8)
    .text((d) => `${d3.format(".1%")(d.share)}  (${d.hits}/${d.n})`)
    .style("opacity", shown && !animate ? 1 : 0);
  grow(value, animate, 450).style("opacity", 1);
}

// ---- shapes: 4px rounded data end, square at the baseline ----
function topRounded(x, base, w, h) {
  h = Math.max(h, 0.01); // same path shape at zero, so the grow transition interpolates cleanly
  const r = Math.min(4, w / 2, h);
  return `M${x},${base}V${base - h + r}A${r},${r} 0 0 1 ${x + r},${base - h}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${base - h + r}V${base}Z`;
}
function rightRounded(x, y, w, h) {
  w = Math.max(w, 0.01);
  const r = Math.min(4, w, h / 2);
  return `M${x},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x}Z`;
}

function debounce(fn, ms) {
  let t;
  return () => { clearTimeout(t); t = setTimeout(fn, ms); };
}
