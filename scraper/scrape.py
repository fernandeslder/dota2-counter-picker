#!/usr/bin/env python3
"""Scrape Dotabuff hero matchup data into web/public/data/matchups.json.

Dotabuff sits behind Cloudflare, so plain `requests` gets 403; curl_cffi
impersonates a real Chrome TLS fingerprint.

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


def scrape_heroes():
    soup = BeautifulSoup(get(f"{BASE}/heroes"), "html.parser")
    heroes = []
    for tr in soup.select("table tbody tr"):
        a = next((x for x in tr.select("a[href^='/heroes/']") if x.get_text(strip=True)), None)
        tds = tr.find_all("td")
        if not a or len(tds) < 7:
            continue
        slug = a["href"].split("/")[2]
        img = tr.find("img")
        heroes.append({
            "id": slug,
            "name": a.get_text(strip=True),
            "tier": tds[1].get_text(strip=True),
            "wr": pct(tds[2].get_text()),
            "pick": pct(tds[4].get_text()),
            "ban": pct(tds[6].get_text()),
            "_img": img["src"] if img else f"/assets/heroes/{slug}.jpg",
        })
    return heroes


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
    heroes = scrape_heroes()
    if len(heroes) < 100:
        sys.exit(f"only {len(heroes)} heroes parsed, layout probably changed")
    ids = [h["id"] for h in heroes]
    idx = {s: i for i, s in enumerate(ids)}
    N = len(ids)
    adv = [[0.0] * N for _ in range(N)]
    wr = [[50.0] * N for _ in range(N)]
    n = [[0] * N for _ in range(N)]

    for e, slug in enumerate(ids):
        for c_slug, (a, w, m) in scrape_counters(slug).items():
            if c_slug in idx:
                c = idx[c_slug]
                adv[c][e], wr[c][e], n[c][e] = a, 100 - w, m  # w is page hero's WR, so counter's is 100-w
        print(f"[{e + 1}/{N}] {slug}", flush=True)
        time.sleep(DELAY)

    covered = sum(1 for r in n for v in r if v) / (N * (N - 1))
    if covered < 0.9:
        sys.exit(f"matrix only {covered:.0%} filled, refusing to overwrite data")

    IMG.mkdir(parents=True, exist_ok=True)
    for h in heroes:
        dest = IMG / f"{h['id']}.jpg"
        src = h.pop("_img")
        if not dest.exists():
            dest.write_bytes(get(src if src.startswith("http") else BASE + src, binary=True))

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
