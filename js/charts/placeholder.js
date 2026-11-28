// Temporary stand-in each chart uses until its owner builds it: one quiet
// "coming soon" line, so unbuilt panels don't crowd the dashboard.
// The full to-do list stays in the SPEC at the top of each chart file.
// Delete the import from your chart file once you start drawing.
import * as d3 from "../d3.js";

export function renderPlaceholder(container, spec, { rows }) {
  const root = d3.select(container);
  let box = root.select(".placeholder");
  if (box.empty()) {
    box = root.append("div").attr("class", "placeholder");
    box.append("p").attr("class", "placeholder-kicker").text("Coming soon");
    box.append("p").attr("class", "placeholder-title").text(spec.title);
  }
  // Developers: the live count proves the filters reach this chart.
  box.attr("title", `${spec.file} · receiving ${rows.length} ads`);
}
