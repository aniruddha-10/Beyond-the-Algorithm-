// Metric definitions shared by the cards and every chart, so "click rate"
// means the same thing everywhere and pooled/balanced is computed one way.
import * as d3 from "./d3.js";
import { PARTICIPANTS } from "./state.js";

const share = (test) => (rows) => rows.length ? rows.filter(test).length / rows.length : NaN;
const pct = (v) => Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : "–";

export const METRICS = {
  avgRelevance: {
    label: "Average relevance",
    of: (rows) => rows.length ? d3.mean(rows, (d) => d.relevance) : NaN,
    format: (v) => Number.isFinite(v) ? v.toFixed(2) : "–",
    domain: [1, 5],
  },
  highRelevanceShare: { label: "High relevance (4–5)", of: share((d) => d.highRelevance), format: pct, domain: [0, 1] },
  clickRate:          { label: "Click rate",            of: share((d) => d.clicked),       format: pct, domain: [0, 1] },
  intrusiveRate:      { label: "Felt intrusive",        of: share((d) => d.intrusive),     format: pct, domain: [0, 1] },
  interestMatchRate:  { label: "Matched an interest",   of: share((d) => d.interestMatch), format: pct, domain: [0, 1] },
  seenBeforeRate:     { label: "Seen before",           of: share((d) => d.seenBefore === "Yes"), format: pct, domain: [0, 1] },
};

/**
 * Compute a metric over rows.
 *  pooled:   every ad counts once (P1's 115 ads weigh more).
 *  balanced: compute per participant, then average the participants that have ads.
 * Returns { value, n, people, byParticipant: [{ participant, value, n }] }.
 */
export function computeMetric(key, rows, weighting = "pooled") {
  const metric = METRICS[key];
  const groups = d3.group(rows, (d) => d.participant);
  const byParticipant = PARTICIPANTS
    .filter((p) => groups.has(p))
    .map((p) => ({ participant: p, value: metric.of(groups.get(p)), n: groups.get(p).length }));
  const value = weighting === "balanced"
    ? (byParticipant.length ? d3.mean(byParticipant, (d) => d.value) : NaN)
    : metric.of(rows);
  return { value, n: rows.length, people: byParticipant.length, byParticipant };
}
