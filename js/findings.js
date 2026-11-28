// Findings page: one answer to the proposal's question, "How personalized are
// the ads we actually see?", drawn live from ads.json.
//  - The personalization spectrum: every ad falls in exactly one band, using the
//    proposal's relevance anchors and the felt-intrusive flag.
//  - The proposal's four dimensions (targeting, relevance, engagement, privacy),
//    Instagram vs YouTube.
// Both follow the "every ad once / each person equally" switch.
import * as d3 from "./d3.js";
import { PARTICIPANTS, PLATFORMS } from "./state.js";
import { computeMetric, METRICS } from "./metrics.js";
import { platformColor, relevanceColor } from "./theme.js";
import { showTooltip, hideTooltip } from "./tooltip.js";

const ads = await d3.json("data/ads.json");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Each ad lands in one band. "Too personal" wins over the rating (only 7 intrusive
// ads were rated 3 or lower).
const BANDS = [
  { key: "missed", label: "Missed us", sub: "rated 1–2", test: (d) => !d.intrusive && d.relevance <= 2, fill: () => relevanceColor(1.3) },
  { key: "general", label: "General interest", sub: "rated 3", test: (d) => !d.intrusive && d.relevance === 3, fill: () => relevanceColor(3) },
  { key: "useful", label: "Useful", sub: "rated 4–5", test: (d) => !d.intrusive && d.relevance >= 4, fill: () => relevanceColor(4.7) },
  { key: "personal", label: "Too personal", sub: "felt intrusive", test: (d) => d.intrusive, fill: () => "var(--text-primary)" },
];

const DIMENSIONS = [
  { key: "interestMatchRate", name: "Targeting", measure: "matched one of our listed interests" },
  { key: "avgRelevance", name: "Relevance", measure: "average rating, 1–5" },
  { key: "clickRate", name: "Engagement", measure: "ads we clicked" },
  { key: "intrusiveRate", name: "Privacy", measure: "felt too personal" },
];

let weighting = "pooled";
const spectrum = createSpectrum(document.getElementById("spectrum"), document.getElementById("spectrum-legend"));
const dimensions = createDimensions(document.getElementById("dimensions"), document.getElementById("dims-summary"));

const buttons = d3.selectAll("#weighting button").on("click", function () {
  weighting = this.dataset.weighting;
  buttons.attr("aria-pressed", function () { return String(this.dataset.weighting === weighting); });
  spectrum.draw(true);
  dimensions.draw();
});
window.addEventListener("themechange", () => { spectrum.draw(false); dimensions.draw(); });
window.addEventListener("resize", debounce(() => spectrum.draw(false), 150));

// ---------------------------------------------------------------------------
/** Share of rows in each band. Balanced: average each person's shares. */
function bandShares(rows, mode) {
  const pooled = (r) => BANDS.map((b) => {
    const hits = r.filter(b.test).length;
    return { ...b, hits, share: r.length ? hits / r.length : 0 };
  });
  if (mode !== "balanced") return { bands: pooled(rows), n: rows.length, people: null };
  const per = PARTICIPANTS.map((p) => rows.filter((d) => d.participant === p)).filter((r) => r.length).map(pooled);
  const bands = BANDS.map((b, i) => ({
    ...b,
    hits: d3.sum(per, (bs) => bs[i].hits),
    share: d3.mean(per, (bs) => bs[i].share),
  }));
  return { bands, n: rows.length, people: per.length };
}

function createSpectrum(el, legendEl) {
  const svg = d3.select(el).append("svg").attr("role", "img")
    .attr("aria-label", "Share of ads in each personalization band, overall, by app and by person");
  const previous = new Map(); // "row|band" → { x, w } so bars glide from where they were
  let seen = false;

  const rowsData = () => [
    { id: "all", label: "All ads", main: true, ...bandShares(ads, weighting) },
    ...PLATFORMS.map((p) => ({ id: p, label: p, main: true, ...bandShares(ads.filter((d) => d.platform === p), weighting) })),
    ...PARTICIPANTS.map((p) => ({ id: p, label: p, main: false, ...bandShares(ads.filter((d) => d.participant === p), "pooled") })),
  ];

  function drawLegend() {
    legendEl.innerHTML = BANDS.map((b) =>
      `<span><i style="background:${b.fill()}"></i>${b.label} <small>${b.sub}</small></span>`).join("");
  }

  function draw(animate) {
    drawLegend();
    const width = el.clientWidth;
    const height = Math.max(240, el.clientHeight);
    const labelW = width < 480 ? 78 : 112;
    const groupGap = 30; // room for the "By person" label
    const rows = rowsData();
    const unit = Math.max(20, Math.min(46, (height - groupGap) / (3 * 1.3 + 5)));
    let y = 0;
    rows.forEach((r, i) => {
      if (i === 3) y += groupGap;
      r.h = r.main ? unit * 1.3 : unit;
      r.y = y;
      y += r.h;
    });
    svg.attr("width", width).attr("height", y).attr("viewBox", [0, 0, width, y]);
    svg.selectAll("*").remove();
    const x = d3.scaleLinear().domain([0, 1]).range([labelW, width - 4]);
    const go = animate && !reduceMotion;
    const t = svg.transition().duration(go ? 750 : 0).ease(d3.easeCubicInOut);

    svg.append("text").attr("x", 0).attr("y", rows[3].y - 10)
      .style("font-family", "var(--font-mono)").style("font-size", "10.5px").style("letter-spacing", ".07em")
      .style("fill", "var(--text-muted)").text("BY PERSON · BOTH APPS");

    rows.forEach((r, ri) => {
      const g = svg.append("g").attr("transform", `translate(0,${r.y})`);
      const barH = Math.round(r.h * (r.main ? 0.64 : 0.56));
      const barY = (r.h - barH) / 2;
      g.append("text").attr("y", r.h / 2 + (r.main ? -1 : 4))
        .style("fill", "var(--text-primary)").style("font-weight", r.main ? 600 : 500).style("font-size", r.main ? "13.5px" : "12.5px")
        .text(r.label);
      if (r.main) {
        g.append("text").attr("y", r.h / 2 + 13).style("font-size", "10.5px").style("fill", "var(--text-muted)")
          .text(weighting === "balanced" && r.people ? `${r.n} ads · ${r.people} people` : `${r.n} ads`);
      }
      const clipId = `spectrum-clip-${ri}`;
      g.append("clipPath").attr("id", clipId).append("rect")
        .attr("x", labelW).attr("y", barY).attr("width", x(1) - labelW).attr("height", barH).attr("rx", 5);
      const bars = g.append("g").attr("clip-path", `url(#${clipId})`);

      let acc = 0;
      const segs = r.bands.map((b) => {
        const seg = { ...b, x0: x(acc), w: Math.max(0, x(acc + b.share) - x(acc) - 2) };
        acc += b.share;
        return seg;
      });
      const key = (b) => `${r.id}|${b.key}`;
      // Not yet seen: everything starts collapsed at the left edge, ready to grow in.
      const from = (b) => {
        if (!seen) return { x: labelW, w: 0 };
        if (go) return previous.get(key(b)) ?? { x: labelW, w: 0 };
        return { x: b.x0, w: b.w };
      };

      const seg = bars.selectAll("g").data(segs).join("g")
        .on("mousemove", (event, b) => showTooltip(event, tooltipFor(r, b)))
        .on("mouseleave", hideTooltip);
      const rect = seg.append("rect").attr("y", barY).attr("height", barH)
        .attr("x", (b) => from(b).x).attr("width", (b) => from(b).w)
        .style("fill", (b) => b.fill());
      const label = seg.append("text")
        .attr("y", barY + barH / 2 + 4)
        .attr("x", (b) => b.x0 + 7)
        .style("font-family", "var(--font-mono)").style("font-size", r.main ? "11.5px" : "10.5px")
        .style("fill", (b) => inkOn(b))
        .style("opacity", seen && !go ? 1 : 0)
        .text((b) => (b.w > (r.main ? 38 : 32) ? `${Math.round(b.share * 100)}%` : ""));
      if (seen && go) {
        rect.transition(t).attr("x", (b) => b.x0).attr("width", (b) => b.w);
        label.transition(t).delay(250).style("opacity", 1);
      }
      if (seen) segs.forEach((b) => previous.set(key(b), { x: b.x0, w: b.w }));
    });
  }

  // Bars grow in the first time the chart is seen.
  if (reduceMotion) seen = true;
  draw(false);
  if (!reduceMotion) {
    new IntersectionObserver((entries, io) => {
      if (!entries[0].isIntersecting) return;
      seen = true;
      draw(true);
      io.disconnect();
    }, { threshold: 0.25 }).observe(el);
  }

  return { draw: (animate) => { if (seen) draw(animate); } };
}

function inkOn(b) {
  if (b.key === "personal") return "var(--surface-0)";
  return d3.lab(b.fill()).l > 62 ? "#0b0b0b" : "#ffffff";
}

function tooltipFor(r, b) {
  const pct = d3.format(".1%")(b.share);
  const basis = !r.main || weighting === "pooled"
    ? `${b.hits} of ${r.n} ads`
    : `average of ${r.people} people; ${b.hits} of ${r.n} ads`;
  return `<strong>${r.label} · ${b.label}</strong><br>${pct} <span class="muted">(${basis})</span><br><span class="muted">${b.sub}</span>`;
}

// ---------------------------------------------------------------------------
function createDimensions(el, summaryEl) {
  function draw() {
    const rows = DIMENSIONS.map((dim) => {
      const values = PLATFORMS.map((p) => ({ platform: p, ...computeMetric(dim.key, ads.filter((d) => d.platform === p), weighting) }));
      return { ...dim, metric: METRICS[dim.key], values, verdict: verdictFor(dim.key, values) };
    });

    const leads = d3.rollups(rows.filter((r) => r.verdict.leader), (v) => v.length, (r) => r.verdict.leader)
      .sort((a, b) => b[1] - a[1]);
    const targetingEven = !rows.find((r) => r.key === "interestMatchRate").verdict.leader;
    summaryEl.textContent = leads.length
      ? `${leads[0][0]} was more personalized on ${leads[0][1]} of ${rows.length} dimensions` +
        (targetingEven ? ", even though both apps matched our listed interests about equally often." : ".")
      : "The two apps came out even.";

    d3.select(el).selectAll(".dim").data(rows, (d) => d.key).join((enter) => {
      const row = enter.append("div").attr("class", "dim");
      const name = row.append("div").attr("class", "dim-name");
      name.append("strong");
      name.append("span");
      const bars = row.append("div").attr("class", "dim-bars");
      PLATFORMS.forEach((p) => {
        const bar = bars.append("div").attr("class", "dim-bar").attr("data-platform", p).attr("tabindex", 0);
        bar.append("span").attr("class", "dim-fill");
        bar.append("span").attr("class", "dim-val");
      });
      row.append("div").attr("class", "dim-verdict");
      return row;
    })
      .each(function (d) {
        const row = d3.select(this);
        row.select("strong").text(d.name);
        row.select(".dim-name span").text(d.measure);
        // Each row has its own scale: 1–5 for relevance, 0 to a rounded-up max for rates.
        const isScore = d.key === "avgRelevance";
        const max = isScore ? 5 : Math.max(0.2, Math.ceil(d3.max(d.values, (v) => v.value) * 1.25 * 10) / 10);
        row.selectAll(".dim-bar").each(function () {
          const v = d.values.find((x) => x.platform === this.dataset.platform);
          const share = isScore ? (v.value - 1) / (max - 1) : v.value / max;
          const bar = d3.select(this);
          bar.select(".dim-fill").style("width", `${Math.max(0, share) * 100}%`).style("background", platformColor(v.platform));
          bar.select(".dim-val").text(`${v.platform === "Instagram" ? "IG" : "YT"} ${d.metric.format(v.value)}`);
          bar.attr("aria-label", `${v.platform}, ${d.name}: ${d.metric.format(v.value)}`)
            .on("mousemove", (event) => showTooltip(event,
              `<strong>${v.platform} · ${d.name}</strong><br>${d.metric.format(v.value)} ` +
              `<span class="muted">(${weighting === "balanced" ? `average of ${v.people} people; ` : ""}${v.n} ads)</span>` +
              `<br><span class="muted">${d.measure}</span>`))
            .on("mouseleave", hideTooltip);
        });
        row.select(".dim-verdict").html(d.verdict.leader
          ? `<i style="background:${platformColor(d.verdict.leader)}"></i>${d.verdict.text}`
          : d.verdict.text);
      });
  }

  // Bars sit at zero (CSS .is-waiting) until the card is seen, then grow via the CSS width transition.
  draw();
  if (!reduceMotion) {
    el.classList.add("is-waiting");
    new IntersectionObserver((entries, io) => {
      if (!entries[0].isIntersecting) return;
      requestAnimationFrame(() => el.classList.remove("is-waiting"));
      io.disconnect();
    }, { threshold: 0.25 }).observe(el);
  }
  return { draw };
}

/** "Even" within 3 points (or 0.15 on the 1–5 scale); otherwise the leader, with "3×" for big rate gaps. */
function verdictFor(key, values) {
  const [ig, yt] = values.map((v) => v.value);
  const isScore = key === "avgRelevance";
  const diff = ig - yt;
  if (Math.abs(diff) < (isScore ? 0.15 : 0.03)) return { leader: null, text: "Even" };
  const leader = diff > 0 ? "Instagram" : "YouTube";
  const hi = Math.max(ig, yt);
  const lo = Math.min(ig, yt);
  const text = !isScore && lo > 0 && hi / lo >= 2 ? `${leader}, ${Math.round(hi / lo)}×` : leader;
  return { leader, text };
}

function debounce(fn, ms) {
  let t;
  return () => { clearTimeout(t); t = setTimeout(fn, ms); };
}
