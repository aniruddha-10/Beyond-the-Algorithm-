// Shared filter state. Every control and chart reads and writes it through
// these functions, so one click anywhere updates the whole dashboard.
import * as d3 from "./d3.js";

export const PARTICIPANTS = ["P1", "P2", "P3", "P4", "P5"];
export const PLATFORMS = ["Instagram", "YouTube"];

const initialState = () => ({
  participants: [...PARTICIPANTS], // which people are included
  platforms: [...PLATFORMS],       // which platforms are included
  category: null,                  // one category, or null for all
  dateFrom: null,                  // "YYYY-MM-DD" (inclusive) or null
  dateTo: null,                    // "YYYY-MM-DD" (inclusive) or null
  weighting: "pooled",             // "pooled" (every ad counts once) | "balanced" (every person counts equally)
});

let current = initialState();
const bus = d3.dispatch("change");
let listenerCount = 0;

export const getState = () => current;

/** Merge a partial update, e.g. setState({ category: "Finance" }). */
export function setState(patch) {
  current = { ...current, ...patch };
  bus.call("change", null, current);
}

export function resetState() {
  current = initialState();
  bus.call("change", null, current);
}

/** Register a callback(state) that runs after every state change. */
export function onChange(callback) {
  bus.on(`change.l${listenerCount++}`, callback);
}

/**
 * Apply the filters to the full ad list.
 * Pass ignore: ["category"] (etc.) when a chart should keep showing the
 * context it filters by, e.g. the treemap still drawing every category.
 */
export function filterAds(ads, state = current, { ignore = [] } = {}) {
  const skip = new Set(ignore);
  return ads.filter((d) =>
    (skip.has("participants") || state.participants.includes(d.participant)) &&
    (skip.has("platforms") || state.platforms.includes(d.platform)) &&
    (skip.has("category") || state.category === null || d.category === state.category) &&
    (skip.has("date") || ((!state.dateFrom || d.date >= state.dateFrom) &&
                          (!state.dateTo || d.date <= state.dateTo)))
  );
}
