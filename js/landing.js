// Intro page: the scrolling "phone feed" of real ads from our log.
// Privacy: no participant or brand is shown; only platform, placement,
// category, the reason given, the rating and the response.
import * as d3 from "./d3.js";
import { platformColor } from "./theme.js";

const ads = await d3.json("data/ads.json");
renderFeed(document.getElementById("feed"), ads);

// A fixed spread of real ads, shown as feed cards. The list is drawn twice so the
// CSS scroll animation can loop seamlessly.
function renderFeed(el, ads) {
  const sample = d3.range(3, ads.length, 27).map((i) => ads[i]).slice(0, 12);
  const card = (d) => `<article class="ad-card" style="--plat:${platformColor(d.platform)}">
      <div class="ad-top"><span class="ad-avatar"></span><span><strong>${d.platform}</strong> · ${d.placement}</span><span class="ad-sponsored">Sponsored</span></div>
      <div class="ad-media">${d.category}</div>
      <div class="ad-why"><b>Why we think we saw it:</b> ${d.reason}</div>
      <div class="ad-foot">
        <span class="ad-rating">Rated ${d.relevance} of 5</span>
        ${d.intrusive ? '<span class="ad-flag">felt too personal</span>' : d.clicked ? '<span class="ad-flag">clicked</span>' : ""}
      </div>
    </article>`;
  const half = sample.map(card).join("");
  el.innerHTML = `<div class="feed-half">${half}</div><div class="feed-half" aria-hidden="true">${half}</div>`;
}
