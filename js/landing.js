// Landing page: the scrolling "phone feed", the category marquee, and the
// "Every dot is one ad" view that rearranges all 356 ads.
// Privacy: nothing here shows a participant or a brand; only category,
// platform, placement, rating, reason and response.
import * as d3 from "./d3.js";
import { platformColor, relevanceColor } from "./theme.js";
import { showTooltip, hideTooltip } from "./tooltip.js";

const ads = await d3.json("data/ads.json");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

renderMarquee(document.getElementById("marquee"), ads);
const feed = renderFeed(document.getElementById("feed"), ads);
const dots = createDots(document.getElementById("dots"), ads);

window.addEventListener("themechange", () => { feed(); dots.recolor(); });
window.addEventListener("resize", debounce(() => dots.resize(), 150));

// ---------------------------------------------------------------------------
function renderMarquee(el, ads) {
  const top = d3.rollups(ads, (v) => v.length, (d) => d.category)
    .filter(([c]) => c !== "Other")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const items = top.map(([c, n]) => `<span>${c}<em>${n} ads</em></span>`).join("");
  el.innerHTML = items + items.replaceAll("<span>", '<span aria-hidden="true">');
}

// A fixed spread of real ads, shown as feed cards. Re-rendered on theme change
// because the relevance pips use the theme's colour ramp.
function renderFeed(el, ads) {
  const sample = d3.range(3, ads.length, 27).map((i) => ads[i]).slice(0, 12);
  const card = (d) => {
    const pips = d3.range(1, 6)
      .map((i) => `<span class="pip"${i <= d.relevance ? ` style="background:${relevanceColor(d.relevance)}"` : ""}></span>`)
      .join("");
    return `<article class="ad-card" style="--plat:${platformColor(d.platform)}">
      <div class="ad-top"><span class="ad-avatar"></span><span><strong>${d.platform}</strong> · ${d.placement}</span><span class="ad-sponsored">Sponsored</span></div>
      <div class="ad-media">${d.category}</div>
      <div class="ad-why"><b>Why we think we saw it:</b> ${d.reason}</div>
      <div class="ad-foot">
        <span class="pips" aria-label="Relevance ${d.relevance} of 5">relevance${pips}</span>
        ${d.intrusive ? '<span class="ad-flag">felt too personal</span>' : d.clicked ? '<span class="ad-flag">clicked</span>' : ""}
      </div>
    </article>`;
  };
  const half = sample.map(card).join("");
  const render = () => {
    el.innerHTML = `<div class="feed-half">${half}</div><div class="feed-half" aria-hidden="true">${half}</div>`;
  };
  render();
  return () => {
    // Rebuild cards with the new theme's ramp, keeping the scroll animation running.
    const fresh = sample.map(card).join("");
    el.querySelectorAll(".feed-half").forEach((h) => { h.innerHTML = fresh; });
  };
}

// ---------------------------------------------------------------------------
// "Every dot is one ad"
function createDots(container, ads) {
  const MODES = ["platform", "relevance", "intrusive", "clicked"];
  const buttons = d3.selectAll("#dot-modes button");
  const caption = d3.select("#dots-caption");
  const legend = d3.select("#dots-legend");
  const autoplayNote = d3.select("#dots-autoplay");
  const svg = d3.select(container).append("svg").attr("role", "img");
  const labelLayer = svg.append("g");
  const dotLayer = svg.append("g");

  const count = (f) => ads.filter(f).length;
  const high = (d) => d.relevance >= 4;
  const facts = {
    ig: count((d) => d.platform === "Instagram"),
    yt: count((d) => d.platform === "YouTube"),
    rel1: count((d) => d.relevance === 1),
    intr: count((d) => d.intrusive),
    intrHigh: count((d) => d.intrusive && high(d)),
    click: count((d) => d.clicked),
    clickHigh: count((d) => d.clicked && high(d)),
  };
  const COPY = {
    platform: {
      caption: `${facts.ig} ads on Instagram, ${facts.yt} on YouTube.`,
      legend: `<span><i style="background:var(--instagram)"></i>Instagram</span><span><i style="background:var(--youtube)"></i>YouTube</span>`,
    },
    relevance: {
      caption: `The most common rating was 1, “not relevant”: ${facts.rel1} ads.`,
      legend: () => `<span>1 · not relevant <i class="ramp" style="background:linear-gradient(90deg,${[1, 2, 3, 4, 5].map(relevanceColor).join(",")})"></i> 5 · a specific need</span>`,
    },
    intrusive: {
      caption: `${facts.intr} ads felt too personal, and ${facts.intrHigh} of them were ones we rated 4 or 5.`,
      legend: `<span><i style="background:var(--text-primary)"></i>Felt too personal</span><span><i style="background:var(--neutral)"></i>Didn't</span>`,
    },
    clicked: {
      caption: `We clicked just ${facts.click} of ${ads.length} ads. ${facts.clickHigh} of those were rated 4 or 5.`,
      legend: `<span><i style="background:var(--text-primary)"></i>Clicked</span><span><i style="background:var(--neutral)"></i>Didn't</span>`,
    },
  };

  const TALLEST = d3.max(d3.rollups(ads, (v) => v.length, (d) => d.relevance), (d) => d[1]);
  let mode = "platform";
  let timer = null;
  let playing = !reduceMotion;
  let visible = false;

  const circles = dotLayer.selectAll("circle").data(ads, (d) => d.id).join("circle")
    .on("mousemove", (event, d) => showTooltip(event,
      `<strong>${d.category}</strong><br>${d.platform} · ${d.placement}<br>Relevance ${d.relevance} of 5` +
      `${d.intrusive ? " · felt too personal" : ""}${d.clicked ? " · clicked" : ""}` +
      `<br><span class="muted">Why: ${d.reason}</span>`))
    .on("mouseleave", hideTooltip);

  function geometry() {
    const width = container.clientWidth;
    const s = Math.max(6, Math.min(15, width / 40)); // spacing between dot centres
    const plotH = Math.ceil(TALLEST / 6) * s;         // tallest relevance column
    return { width, s, r: s * 0.36, top: 30, plotH, height: 30 + plotH + 44 };
  }

  // Positions: unit "histograms" that all share one baseline.
  function layout(m, g) {
    const pos = new Map();
    const labels = [];
    const place = (rows, x0, cols) => rows.forEach((d, k) => {
      pos.set(d.id, {
        x: x0 + (k % cols) * g.s + g.s / 2,
        y: g.top + g.plotH - Math.floor(k / cols) * g.s - g.s / 2,
      });
    });
    if (m === "platform") {
      const cols = 12;
      const groupW = cols * g.s;
      const gap = 4 * g.s;
      const x0 = (g.width - (2 * groupW + gap)) / 2;
      ["Instagram", "YouTube"].forEach((p, i) => {
        const rows = ads.filter((d) => d.platform === p).sort((a, b) => b.relevance - a.relevance || a.id - b.id);
        const gx = x0 + i * (groupW + gap);
        place(rows, gx, cols);
        const rowsUsed = Math.ceil(rows.length / cols);
        labels.push({ key: `p-${p}`, x: gx + groupW / 2, y: g.top + g.plotH + 22, text: p });
        labels.push({ key: `pc-${p}`, x: gx + groupW / 2, y: g.top + g.plotH - rowsUsed * g.s - 8, text: rows.length, cls: "count" });
      });
    } else {
      const cols = 6;
      const colW = cols * g.s;
      const gap = 2.5 * g.s;
      const x0 = (g.width - (5 * colW + 4 * gap)) / 2;
      const flag = m === "intrusive" ? (d) => d.intrusive : m === "clicked" ? (d) => d.clicked : null;
      [1, 2, 3, 4, 5].forEach((rating, i) => {
        const rows = ads.filter((d) => d.relevance === rating)
          .sort((a, b) => (flag ? flag(b) - flag(a) : 0) || d3.ascending(a.platform, b.platform) || a.id - b.id);
        const cx = x0 + i * (colW + gap);
        place(rows, cx, cols);
        const shown = flag ? rows.filter(flag).length : rows.length;
        const rowsUsed = Math.ceil(rows.length / cols);
        labels.push({ key: `r-${rating}`, x: cx + colW / 2, y: g.top + g.plotH + 22, text: rating === 1 ? "1 · not relevant" : rating === 5 ? "5 · specific need" : rating });
        labels.push({
          key: `rc-${rating}`, x: cx + colW / 2, y: g.top + g.plotH - rowsUsed * g.s - 8, cls: "count",
          text: flag ? `${shown} of ${rows.length}` : rows.length,
        });
      });
    }
    return { pos, labels };
  }

  const fillFor = (m) => ({
    platform: (d) => platformColor(d.platform),
    relevance: (d) => relevanceColor(d.relevance),
    intrusive: (d) => (d.intrusive ? "var(--text-primary)" : "var(--neutral)"),
    clicked: (d) => (d.clicked ? "var(--text-primary)" : "var(--neutral)"),
  }[m]);

  function draw(animate) {
    const g = geometry();
    const { pos, labels } = layout(mode, g);
    svg.attr("width", g.width).attr("height", g.height).attr("viewBox", [0, 0, g.width, g.height])
      .attr("aria-label", COPY[mode].caption);

    const t = svg.transition().duration(animate && !reduceMotion ? 1100 : 0).ease(d3.easeCubicInOut);
    circles.attr("r", g.r)
      .transition(t)
      .delay((d, i) => (animate && !reduceMotion ? (i % 60) * 6 + Math.floor(i / 60) * 25 : 0))
      .attr("cx", (d) => pos.get(d.id).x)
      .attr("cy", (d) => pos.get(d.id).y)
      .style("fill", fillFor(mode));

    labelLayer.selectAll("text").data(labels, (d) => d.key).join(
      (enter) => enter.append("text").attr("text-anchor", "middle").style("opacity", 0)
        .attr("x", (d) => d.x).attr("y", (d) => d.y),
      (update) => update,
      (exit) => exit.transition(t).style("opacity", 0).remove()
    )
      .attr("class", (d) => d.cls ?? null)
      .text((d) => d.text)
      .transition(t)
      .attr("x", (d) => d.x).attr("y", (d) => d.y)
      .style("opacity", 1);

    caption.style("opacity", 0).text(COPY[mode].caption).transition().duration(reduceMotion ? 0 : 400).style("opacity", 1);
    const lg = COPY[mode].legend;
    legend.html(typeof lg === "function" ? lg() : lg);
    buttons.attr("aria-pressed", function () { return String(this.dataset.mode === mode); });
  }

  function setMode(next, animate = true) {
    mode = next;
    draw(animate);
  }

  function schedule() {
    clearInterval(timer);
    if (!playing || !visible) return;
    timer = setInterval(() => setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]), 4600);
  }

  buttons.on("click", function () {
    playing = false;
    clearInterval(timer);
    autoplayNote.text("Paused");
    setMode(this.dataset.mode);
  });
  if (!playing) autoplayNote.text("");

  // Scatter the dots first so the first arrangement animates in when the section appears.
  const g0 = geometry();
  circles.attr("r", g0.r)
    .attr("cx", () => Math.random() * g0.width)
    .attr("cy", () => Math.random() * g0.height)
    .style("fill", "var(--neutral)");
  svg.attr("width", g0.width).attr("height", g0.height);
  caption.text(COPY[mode].caption);

  let introduced = false;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible && !introduced) { introduced = true; setMode(mode); }
    schedule();
  }, { threshold: 0.35 }).observe(container);

  return {
    resize: () => { if (introduced) draw(false); },
    recolor: () => {
      circles.style("fill", introduced ? fillFor(mode) : "var(--neutral)");
      const lg = COPY[mode].legend;
      legend.html(typeof lg === "function" ? lg() : lg);
    },
  };
}

function debounce(fn, ms) {
  let t;
  return () => { clearTimeout(t); t = setTimeout(fn, ms); };
}
