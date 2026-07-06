#!/usr/bin/env python3
"""Bootstrap the server-owned pantry store from the skill's pantry.md.

This is the ONE-TIME migration the PANTRY-MODEL.md doc argues for: the markdown
file is a human seed, not the steady-state editor. We parse it into structured
pantry.json (the runtime store the server reads/writes), then apply a small demo
overlay so the prototype is actually cookable — because the real pantry.md ships
all `out`. In production this overlay is replaced by conversational onboarding.

Run:
  python3 stage2/bootstrap_pantry.py           # faithful: mirror pantry.md as-is (real bootstrap)
  python3 stage2/bootstrap_pantry.py --demo     # + demo overlay so a fresh clone is cookable
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # repo root
# pantry.md is personal, gitignored state — a fresh clone only has the
# committed template, so fall back to it (they start out identical anyway).
PANTRY_MD = ROOT / "pantry.md"
PANTRY_TEMPLATE = ROOT / "pantry.example.md"
OUT = Path(__file__).resolve().parent / "data" / "pantry.json"

VALID = {"plenty", "low", "out"}


def slug(label: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")


def parse_pantry_md(text: str):
    """Yield {key,label,category,status,notes} from the markdown tables."""
    items, category = [], "Uncategorized"
    for line in text.splitlines():
        line = line.rstrip()
        if line.startswith("## "):
            category = line[3:].strip()
            continue
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 2:
            continue
        head = cells[0].lower()
        if head in ("item", "") or set(cells[0]) <= set("-: "):
            continue  # header row or separator
        label = cells[0]
        status = cells[1].lower()
        notes = cells[2] if len(cells) > 2 else ""
        if status not in VALID:
            status = "out"
        items.append({"key": slug(label), "label": label,
                      "category": category, "status": status, "notes": notes})
    return items


# --- demo overlay: a plausible Guadalajara mid-week pantry -------------------
# keyed by slug. Replaced by conversational onboarding in the real product.
DEMO_PLENTY = [
    "white-onion", "garlic", "vegetable-oil", "olive-oil-regular-cooking",
    "salt-kosher-table", "chicken-broth-stock", "rice-jasmine",
    "rice-white-long-grain", "eggs", "chicken-thighs-bone-in-skin-on",
    "chicken-thighs-boneless", "chicken-breast-boneless", "limes", "media-crema",
    "queso-fresco", "poblano-peppers", "corn-on-the-cob-elote", "honey",
    "soy-sauce", "sesame-oil", "gochujang", "ginger-fresh", "cumin-ground",
    "oregano-mexican", "tomatoes-jitomate", "cilantro", "spring-onions-cebollita",
    "sesame-seeds", "chipotle-in-adobo-canned", "black-pepper-ground",
]
DEMO_LOW = [
    "crema-mexican-sour-cream", "chile-pasilla", "epazote", "limes",
]
# items the real pantry.md doesn't list but the demo needs (SKILL.md: add items)
DEMO_ADD = [
    {"key": "tostadas", "label": "Tostadas", "category": "Starches & Grains",
     "status": "low", "notes": "add — tinga night"},
]


def main():
    demo = "--demo" in sys.argv
    src = PANTRY_MD if PANTRY_MD.exists() else PANTRY_TEMPLATE
    if not src.exists():
        sys.exit(f"no pantry source: neither {PANTRY_MD} nor {PANTRY_TEMPLATE} exists")
    items = parse_pantry_md(src.read_text())
    by_key = {it["key"]: it for it in items}

    applied = 0
    if demo:
        for it in DEMO_ADD:
            if it["key"] not in by_key:
                items.append(it)
                by_key[it["key"]] = it
        for k in DEMO_PLENTY:
            if k in by_key:
                by_key[k]["status"] = "plenty"; applied += 1
        for k in DEMO_LOW:
            if k in by_key:
                by_key[k]["status"] = "low"; applied += 1

    counts = {s: sum(1 for it in items if it["status"] == s) for s in ("plenty", "low", "out")}
    doc = {
        "updated": date.today().isoformat(),
        "source": (f"{src.name} + demo overlay (see PANTRY-MODEL.md)" if demo
                   else f"faithful mirror of {src.name}"),
        "counts": counts,
        "items": items,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {OUT} ({'demo overlay' if demo else 'faithful'}) — "
          f"{len(items)} items, counts={counts}")
    if demo:
        missing = [k for k in DEMO_PLENTY + DEMO_LOW if k not in by_key]
        if missing:
            print("WARNING: overlay keys not found in pantry.md:", missing)


if __name__ == "__main__":
    main()
