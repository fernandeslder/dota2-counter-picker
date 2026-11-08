#!/usr/bin/env python3
"""Scrape Dotabuff hero matchup data into web/public/data/matchups.json.

Dotabuff sits behind Cloudflare, so plain `requests` gets 403; curl_cffi
impersonates a real Chrome TLS fingerprint.

Hero-level stats (win/pick/ban rate, tier) are scraped per game mode: the heroes meta page
honours `mode=turbo`. Hero-vs-hero matchup pages ignore any mode filter, so the matrices are all-modes.
Per-hero roles/lanes/attributes come from each hero's overview page.

Matrix convention (all indexed [counter][enemy], hero indices follow `heroes`):
  adv[c][e]  advantage % of hero c when playing against enemy e
  wr[c][e]   win rate % of hero c against enemy e
  n[c][e]    matches played in that matchup
"""
import json, os, re, sys, time
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup
from curl_cffi import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web/public/data/matchups.json"
IMG = ROOT / "web/public/heroes"
BASE = "https://www.dotabuff.com"
DELAY = float(os.environ.get("SCRAPE_DELAY", "1.0"))
session = requests.Session(impersonate="chrome")


def get(url, binary=False, tries=5):
    for i in range(tries):
        try:
            r = session.get(url, timeout=45)
            if r.status_code == 200:
                return r.content if binary else r.text
            print(f"  {r.status_code} for {url}", file=sys.stderr)
        except Exception as e:  # network hiccup
            print(f"  error {e} for {url}", file=sys.stderr)
        time.sleep(3 * (i + 1))
    raise RuntimeError(f"giving up on {url}")


def pct(text):
    m = re.search(r"-?\d+(?:\.\d+)?", text or "")
    return float(m.group()) if m else None


META = BASE + "/heroes?show=heroes&view=meta&date=7d"


def scrape_stats(mode):
    """Hero list + win/pick/ban rate for one mode ('normal' or 'turbo')."""
    url = META + ("&mode=turbo" if mode == "turbo" else "")
    soup = BeautifulSoup(get(url), "html.parser")
    out = []
    for tr in soup.select("table tbody tr"):
        a = next((x for x in tr.select("a[href^='/heroes/']") if x.get_text(strip=True)), None)
        tds = tr.find_all("td")
        if not a or len(tds) < 7:
            continue
        img = tr.find("img")
        out.append({
            "id": a["href"].split("/")[2],
            "name": a.get_text(strip=True),
            "tier": tds[1].get_text(strip=True),
            "wr": pct(tds[2].get_text()),
            "pick": pct(tds[4].get_text()),
            "ban": pct(tds[6].get_text()),
            "_img": img["src"] if img else None,
        })
    return out


ATTRS = {"strength": "str", "agility": "agi", "intelligence": "int", "all": "uni", "universal": "uni"}


def scrape_profile(slug):
    """Roles, attack type, primary attribute and lane presence from the hero overview page."""
    soup = BeautifulSoup(get(f"{BASE}/heroes/{slug}"), "html.parser")
    # <title>Anti-Mage - Melee, Carry, Escape, Nuker - DOTABUFF - Dota 2 Stats</title>
    title = soup.title.get_text() if soup.title else ""
    parts = [p.strip() for p in (title.split(" - ")[1] if " - " in title else "").split(",")]
    attack = next((p for p in parts if p in ("Melee", "Ranged")), None)
    roles = [p for p in parts if p and p not in ("Melee", "Ranged")]
    attr = None
    tb = soup.select_one(".hero_attributes table.main tbody")
    if tb:
        for c in tb.get("class", []):
            if c.startswith("primary-"):
                attr = ATTRS.get(c[8:], c[8:])
    lanes = {}
    hdr = soup.find("header", string="Lane Presence")
    if hdr:
        for tr in hdr.find_next_sibling("article").select("tbody tr"):
            tds = tr.find_all("td")
            if len(tds) >= 2 and tds[1].get("data-value"):
                lanes[tds[0].get_text(strip=True)] = round(float(tds[1]["data-value"]), 1)
    return {"roles": roles, "attack": attack, "attr": attr, "lanes": lanes}


def scrape_counters(slug):
    soup = BeautifulSoup(get(f"{BASE}/heroes/{slug}/counters"), "html.parser")
    header = soup.find("header", string="Matchups")
    table = header.find_next_sibling("article").find("table")
    out = {}
    for row in table.select("tbody tr"):
        link = row.find("a", class_="link-type-hero")
        tds = row.find_all("td")
        if not link or len(tds) < 5:
            continue
        # page hero's disadvantage vs listed hero == listed hero's advantage vs page hero
        out[link["href"].split("/")[2]] = (
            float(tds[2]["data-value"]), float(tds[3]["data-value"]), int(tds[4]["data-value"]))
    return out


def main():
    normal = scrape_stats("normal")
    turbo = {h["id"]: h for h in scrape_stats("turbo")}
    if len(normal) < 100 or len(turbo) < 100:
        sys.exit(f"parsed {len(normal)} normal / {len(turbo)} turbo heroes, layout probably changed")
    ids = [h["id"] for h in normal]
    idx = {s: i for i, s in enumerate(ids)}
    N = len(ids)
    adv = [[0.0] * N for _ in range(N)]
    wr = [[50.0] * N for _ in range(N)]
    n = [[0] * N for _ in range(N)]
    profiles = {}

    for e, slug in enumerate(ids):
        for c_slug, (a, w, m) in scrape_counters(slug).items():
            if c_slug in idx:
                c = idx[c_slug]
                adv[c][e], wr[c][e], n[c][e] = a, 100 - w, m  # w is page hero's WR, so counter's is 100-w
        time.sleep(DELAY)
        profiles[slug] = scrape_profile(slug)
        print(f"[{e + 1}/{N}] {slug}", flush=True)
        time.sleep(DELAY)

    covered = sum(1 for r in n for v in r if v) / (N * (N - 1))
    if covered < 0.9:
        sys.exit(f"matrix only {covered:.0%} filled, refusing to overwrite data")

    IMG.mkdir(parents=True, exist_ok=True)
    heroes = []
    for h in normal:
        dest = IMG / f"{h['id']}.jpg"
        src = h.pop("_img") or f"/assets/heroes/{h['id']}.jpg"
        if not dest.exists():
            dest.write_bytes(get(src if src.startswith("http") else BASE + src, binary=True))
        t = turbo.get(h["id"], {})
        stat = lambda d: {k: d.get(k) for k in ("wr", "pick", "ban", "tier")}
        heroes.append({
            "id": h["id"], "name": h["name"], **profiles[h["id"]],
            "stats": {"normal": stat(h), "turbo": stat(t) if t else stat(h)},
        })

    data = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": f"{BASE}/heroes",
        "heroes": heroes,
        "adv": [[round(v, 2) for v in r] for r in adv],
        "wr": [[round(v, 2) for v in r] for r in wr],
        "n": n,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"wrote {OUT} ({N} heroes, {covered:.0%} coverage)")


if __name__ == "__main__":
    main()
