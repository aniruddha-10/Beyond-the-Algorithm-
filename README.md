# Beyond the Algorithm

CPSC 482 Group 10 final dashboard: how personalized are the Instagram and YouTube ads we actually see?
356 ads logged by five participants (P1–P5), October 10 – November 2, 2026.

**Live site:** <https://aniruddha-10.github.io/Beyond-the-Algorithm-/>
**Due:** December 1, noon (live link + PDF report)

## Run it locally

No build step. Plain HTML + ES modules + [D3 v7](https://d3js.org/) from a CDN.
From the repo root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Opening `index.html` directly won't work, because browsers block module and JSON loading from `file://`.)

## Project layout

```
index.html              page structure: header, filter bar, cards, five panels
css/style.css           shared colours (light + dark), layout, tooltip
data/ads.json           cleaned ads, one record per ad (generated, committed)
data/brands.json        brand counts by category + platform, never by person (generated, committed)
data/raw/               original spreadsheet, NOT committed (gitignored)
scripts/prepare_data.py spreadsheet → JSON
scripts/brand_aliases.csv  brand spelling fixes, edit and re-run the script
js/main.js              loads data, wires filters/cards/charts, theme toggle
js/state.js             shared filter state + filterAds()
js/metrics.js           metric definitions + pooled/balanced computation
js/theme.js             platform colours, relevance colour ramp, fixed category orders
js/tooltip.js           shared tooltip
js/filters.js, cards.js filter bar and summary cards
js/charts/*.js          one file per chart, one owner per file
```

## Who builds what

| Chart | File | RQ | Owner |
|---|---|---|---|
| Treemap: ad categories | `js/charts/treemap.js` | RQ1 | TBD |
| Butterfly: Instagram vs YouTube | `js/charts/butterfly.js` | RQ1 | TBD |
| Dumbbell: each person, both platforms | `js/charts/dumbbell.js` | RQ4 | TBD |
| Diverging bars: interest match vs relevance | `js/charts/likert.js` | RQ2 | TBD |
| Matrix: reason × relevance × intrusive | `js/charts/reasonMatrix.js` | RQ3 | TBD |
| Shell: filters, cards, state, styling | `js/*.js`, `css/` | n/a | TBD |

The treemap, butterfly and dumbbell charts are built. The two unbuilt chart files start with a to-do list from the proposal, and the placeholder in the browser shows the same list.

## The chart contract

Every chart exports one function that `main.js` calls once:

```js
export function createMyChart(container) {
  // one-time setup: append the svg, controls (dropdowns, sliders) etc.
  return {
    update({ rows, ads, state }) {
      // runs on every filter change, theme toggle and window resize
      // rows  = ads after all filters
      // ads   = all 356 ads (use filterAds(ads, state, { ignore: [...] }) for a different view)
      // state = { participants, platforms, category, dateFrom, dateTo, weighting }
    },
  };
}
```

- **Import D3 from `../d3.js`**, not from the CDN, so the version stays pinned in one place.
- **Size:** read `container.clientWidth` inside `update`, not once in setup.
- **Colours:** `platformColor(p)` and `relevanceColor(v)` from `theme.js`. Set them with `.style("fill", ...)`, not `.attr`, so the CSS variables (and dark mode) work. Don't introduce new colours without checking with the team.
- **Metrics:** use `computeMetric(key, rows, state.weighting)` from `metrics.js` so "click rate" means the same thing everywhere and the "Each person equally" toggle works.
- **Filtering the dashboard from your chart:** `setState({ category: "Finance" })` from `state.js`. Everything else re-renders automatically.
- **Tooltips:** `showTooltip(event, html)` / `hideTooltip()` from `tooltip.js`. Always include the number of ads behind a value.

## Data

Regenerate the JSON after editing `scripts/brand_aliases.csv` or getting a new export:

```bash
python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/prepare_data.py data/raw/ad_personalization_20261103.xlsx
```

It prints totals to check against the proposal: 356 ads (208 Instagram, 148 YouTube), average relevance 2.53.

Each record in `ads.json`:

| field | example | notes |
|---|---|---|
| `participant` | `"P1"` | P1–P5 only; no names on the public site |
| `platform`, `placement`, `category` | `"Instagram"`, `"Reels"`, `"Finance"` | |
| `relevance`, `highRelevance` | `4`, `true` | 1–5; high = 4 or 5 |
| `reason`, `response`, `clicked` | | self-reported reason; response is one of four labels |
| `seenBefore` | `"Yes"` / `"No"` / `"Unsure"` | |
| `intrusive`, `interestMatch` | `true` | interest match = category is in that person's locked interest list |
| `date`, `hour`, `weekday` | `"2026-10-10"`, `18`, `"Sat"` | participant's local time |
| `minutesIntoSession` | `1.3` | |

**Pooled vs balanced.** P1 logged 115 ads, about twice anyone else. We don't trim them. Instead, the "Count: Each person equally" toggle averages each person's result. Pooled vs balanced barely differs (relevance 2.53 vs 2.47, click rate 7.9% vs 9.0%, intrusive 11.2% vs 11.4%), and showing both is one of our design decisions.

**Privacy rules for the public site:** P1–P5 only, never names; brands only in aggregate (that's why `brands.json` has no participant field); no network or place data.

## Git workflow

1. `git pull` on `main`, then `git switch -c your-name/chart-name`.
2. Only edit your chart file (plus `css/style.css` for chart-specific classes, prefixed with your chart name).
3. Push and open a pull request; someone else checks it in the browser before merging.
4. Changes to shared files (`state.js`, `metrics.js`, `theme.js`, `main.js`) are announced in the group chat first.

## Deploy (GitHub Pages)

Already enabled: Pages serves `main` / `/ (root)`. The site updates a minute or two after each merge to `main`.

## Schedule

| Date | Goal |
|---|---|
| Wed Nov 25 | Repo, data, shell, contract (this commit) |
| Thu 26 – Fri 27 | Build charts on branches; draft your report section; screenshot before/after for each design decision |
| Sat 28 | Integrate: linked filters, consistent style, responsive. Deploy |
| Sun 29 | Outside tester; check totals against the spreadsheet |
| Mon 30 | Assemble report: intro, integration, contributions, GenAI statement |
| Tue Dec 1 | Code freeze 9 am, submit link + PDF by noon |

## GenAI note for the report

The repo scaffold (data-prep script, filter bar, summary cards, shared state/metrics/theme modules, chart placeholders and this README) was generated with Claude Code. The treemap, butterfly and dumbbell charts were also generated with Claude Code. The remaining charts are built by their owners. List any other GenAI use in the Contributions section.
