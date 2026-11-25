// Temporary stand-in each chart uses until its owner builds it. It shows the
// spec from the proposal and a live row count, proving the filters reach it.
// Delete the import from your chart file once you start drawing.
import * as d3 from "../d3.js";

export function renderPlaceholder(container, spec, { rows }) {
  const root = d3.select(container);
  let box = root.select(".placeholder");
  if (box.empty()) {
    box = root.append("div").attr("class", "placeholder");
    box.append("p").html(`<strong>${spec.title}</strong> · owner: ${spec.owner} · <code>${spec.file}</code>`);
    box.append("ul").selectAll("li").data(spec.todo).join("li").text((d) => d);
    box.append("p").attr("class", "live");
  }
  box.select(".live").text(`Filters connected: receiving ${rows.length} ads.`);
}
