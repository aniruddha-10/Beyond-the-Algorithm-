"""Turn the logging app's spreadsheet export into the JSON the dashboard loads.

Usage (from the repo root):
    python3 scripts/prepare_data.py data/raw/ad_personalization_20261103.xlsx

Writes:
    data/ads.json     one record per ad, only the fields the charts use
    data/brands.json  brand counts by category and platform, never by participant

Brands are kept out of ads.json on purpose: the proposal promises brands are
shown only in aggregate, never beside an individual participant.
"""

import csv
import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
ALIASES_CSV = ROOT / "scripts" / "brand_aliases.csv"
OUT_DIR = ROOT / "data"


def brand_key(name: str) -> str:
    return re.sub(r"\s+", " ", str(name)).strip().lower()


def load_aliases() -> dict[str, str]:
    with ALIASES_CSV.open(newline="", encoding="utf-8") as f:
        return {brand_key(row["alias"]): row["canonical"] for row in csv.DictReader(f)}


def standardize_brands(brands: pd.Series) -> pd.Series:
    """Explicit aliases first; otherwise merge case/spacing variants into the
    most common spelling. 'Unknown' is kept as-is (never invent a brand)."""
    aliases = load_aliases()
    cleaned = brands.map(lambda b: re.sub(r"\s+", " ", str(b)).strip())
    keys = cleaned.map(brand_key)
    most_common = (
        pd.DataFrame({"key": keys, "brand": cleaned})
        .groupby("key")["brand"]
        .agg(lambda s: s.value_counts().index[0])
    )
    return keys.map(lambda k: aliases.get(k, most_common[k]))


def main(xlsx_path: str) -> None:
    ads = pd.read_excel(xlsx_path, sheet_name="Ads")
    analysis = pd.read_excel(xlsx_path, sheet_name="Ads_Analysis")[
        ["Ad_ID", "Interest_Match", "Minutes_Into_Session"]
    ]
    df = ads.merge(analysis, on="Ad_ID", how="left", validate="one_to_one")
    if df["Interest_Match"].isna().any():
        sys.exit("Some ads are missing from Ads_Analysis; re-export the spreadsheet.")

    # Local date/time (not the UTC ISO timestamp) for time-of-day analysis.
    local = pd.to_datetime(df["Date"]).dt.normalize() + pd.to_timedelta(df["Time"].astype(str))
    df = df.assign(local=local).sort_values("local").reset_index(drop=True)
    df["Brand"] = standardize_brands(df["Brand"])

    records = [
        {
            "id": i + 1,
            "participant": r.Participant_ID,
            "platform": r.Platform,
            "placement": r.Placement,
            "category": r.Category,
            "relevance": int(r.Relevance),
            "highRelevance": int(r.Relevance) >= 4,
            "reason": r.Reason,
            "response": r.Response,
            "clicked": r.Response == "Clicked",
            "seenBefore": r.Seen_Before,
            "intrusive": r.Felt_Intrusive == "Yes",
            "interestMatch": r.Interest_Match == "Yes",
            "date": r.local.strftime("%Y-%m-%d"),
            "hour": r.local.hour,
            "weekday": r.local.strftime("%a"),
            "minutesIntoSession": round(float(r.Minutes_Into_Session), 1),
        }
        for i, r in enumerate(df.itertuples())
    ]

    brands = (
        df.groupby(["Brand", "Category", "Platform"]).size().reset_index(name="count")
        .rename(columns={"Brand": "brand", "Category": "category", "Platform": "platform"})
        .sort_values(["count", "brand"], ascending=[False, True])
    )

    OUT_DIR.mkdir(exist_ok=True)
    (OUT_DIR / "ads.json").write_text(json.dumps(records, indent=1) + "\n", encoding="utf-8")
    (OUT_DIR / "brands.json").write_text(
        json.dumps(brands.to_dict(orient="records"), indent=1) + "\n", encoding="utf-8"
    )

    # Sanity numbers to compare with the proposal (356 ads, average relevance 2.53).
    print(f"ads: {len(records)}  (Instagram {sum(r['platform'] == 'Instagram' for r in records)}, "
          f"YouTube {sum(r['platform'] == 'YouTube' for r in records)})")
    print(f"average relevance: {df['Relevance'].mean():.2f}")
    print(f"brands: {ads['Brand'].nunique()} raw spellings -> {df['Brand'].nunique()} standardized")
    print(f"dates: {records[0]['date']} to {records[-1]['date']}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
