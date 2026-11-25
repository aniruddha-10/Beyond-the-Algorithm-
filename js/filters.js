// Filter bar: participants, platform, category, date range, weighting, reset.
// Controls write to the shared state and re-sync whenever a chart changes it.
import * as d3 from "./d3.js";
import { PARTICIPANTS, PLATFORMS, getState, setState, resetState, onChange } from "./state.js";
import { platformColor } from "./theme.js";

export function createFilters(container, ads) {
  const root = d3.select(container);
  const dates = d3.extent(ads, (d) => d.date);
  const categories = d3.groupSort(ads, (v) => -v.length, (d) => d.category);

  // Toggle chips for a list-valued state key; at least one must stay selected.
  function chipGroup(label, key, values, swatch) {
    const group = root.append("div").attr("class", "filter-group").attr("role", "group").attr("aria-label", label);
    group.append("span").attr("class", "filter-label").text(label);
    const chips = group.selectAll("label").data(values).join("label").attr("class", "chip");
    chips.append("input").attr("type", "checkbox").attr("value", (d) => d)
      .on("change", (event, value) => {
        const selected = new Set(getState()[key]);
        event.target.checked ? selected.add(value) : selected.delete(value);
        if (selected.size === 0) { event.target.checked = true; return; }
        setState({ [key]: values.filter((v) => selected.has(v)) });
      });
    if (swatch) chips.append("span").attr("class", "swatch").style("background", swatch);
    chips.append("span").text((d) => d);
    return () => chips.select("input").property("checked", (d) => getState()[key].includes(d));
  }

  const syncPeople = chipGroup("People", "participants", PARTICIPANTS);
  const syncPlatforms = chipGroup("Platform", "platforms", PLATFORMS, platformColor);

  const catGroup = root.append("div").attr("class", "filter-group");
  catGroup.append("label").attr("class", "filter-label").attr("for", "filter-category").text("Category");
  const catSelect = catGroup.append("select").attr("id", "filter-category")
    .on("change", (event) => setState({ category: event.target.value || null }));
  catSelect.append("option").attr("value", "").text("All categories");
  catSelect.selectAll("option.cat").data(categories).join("option").attr("class", "cat")
    .attr("value", (d) => d).text((d) => d);

  const dateGroup = root.append("div").attr("class", "filter-group");
  dateGroup.append("label").attr("class", "filter-label").attr("for", "filter-from").text("From");
  const from = dateGroup.append("input").attr("type", "date").attr("id", "filter-from")
    .attr("min", dates[0]).attr("max", dates[1])
    .on("change", (event) => setState({ dateFrom: event.target.value || null }));
  dateGroup.append("label").attr("class", "filter-label").attr("for", "filter-to").text("to");
  const to = dateGroup.append("input").attr("type", "date").attr("id", "filter-to")
    .attr("min", dates[0]).attr("max", dates[1])
    .on("change", (event) => setState({ dateTo: event.target.value || null }));

  const weightGroup = root.append("div").attr("class", "filter-group").attr("role", "radiogroup").attr("aria-label", "Count");
  weightGroup.append("span").attr("class", "filter-label").text("Count");
  const weights = weightGroup.selectAll("label")
    .data([["pooled", "Every ad once"], ["balanced", "Each person equally"]])
    .join("label").attr("class", "chip")
    .attr("title", (d) => d[0] === "balanced"
      ? "Average each person's result, so P1's 115 ads don't outweigh P4's 52"
      : "Pool all ads together");
  weights.append("input").attr("type", "radio").attr("name", "weighting").attr("value", (d) => d[0])
    .on("change", (event) => setState({ weighting: event.target.value }));
  weights.append("span").text((d) => d[1]);

  root.append("button").attr("class", "btn").attr("type", "button").text("Reset").on("click", resetState);

  function sync() {
    const s = getState();
    syncPeople();
    syncPlatforms();
    catSelect.property("value", s.category ?? "");
    from.property("value", s.dateFrom ?? "").attr("max", s.dateTo ?? dates[1]);
    to.property("value", s.dateTo ?? "").attr("min", s.dateFrom ?? dates[0]);
    weights.select("input").property("checked", (d) => d[0] === s.weighting);
  }
  sync();
  onChange(sync);
}
