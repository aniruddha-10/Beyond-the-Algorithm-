// Shared colours and fixed category orders. Use these instead of picking
// colours per chart so the dashboard reads as one piece.
import * as d3 from "./d3.js";

/** Platform colour as a CSS variable; use with .style("fill", ...) so it follows dark mode. */
export const platformColor = (platform) =>
  platform === "Instagram" ? "var(--instagram)" : "var(--youtube)";

export function isDark() {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// One-hue blue ramp for relevance (1 = not relevant ... 5 = specific current need).
// Light mode: low recedes toward the light surface; dark mode: low recedes toward the dark surface.
const RELEVANCE_LIGHT = ["#b7d3f6", "#86b6ef", "#5598e7", "#256abf", "#104281"];
const RELEVANCE_DARK  = ["#184f95", "#256abf", "#3987e5", "#6da7ec", "#b7d3f6"];

/** Colour for a relevance value in [1, 5] (average or single rating). Call at render time. */
export function relevanceColor(value) {
  const steps = isDark() ? RELEVANCE_DARK : RELEVANCE_LIGHT;
  return d3.scaleLinear().domain([1, 2, 3, 4, 5]).range(steps).interpolate(d3.interpolateLab).clamp(true)(value);
}

// Fixed orders from the proposal's data dictionary.
export const PLACEMENTS = {
  Instagram: ["Feed", "Reels", "Stories"],
  YouTube: ["Feed", "Shorts", "Pre-roll", "Mid-roll"],
};
export const RESPONSES = ["Skipped", "Ignored", "Watched without clicking", "Clicked"];
export const REASONS = [
  "No obvious connection",
  "Recent search or interest",
  "Product already used",
  "Shopping or previous purchase",
  "Right after I liked or followed similar content",
  "Right after I searched for it",
  "Right after I talked or messaged about it",
  "Location",
  "Demographic connection",
  "School or work",
  "Hobby",
];
export const RELEVANCE_LABELS = {
  1: "1 · Not relevant",
  2: "2",
  3: "3 · General interest",
  4: "4",
  5: "5 · Specific current need",
};
