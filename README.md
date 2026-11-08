# Dota 2 Counter Picker

Pick the enemy heroes, get the best counters ranked by cumulative advantage and average win rate. Optional ally/ban lists hide heroes you can't pick; the draft is shareable via the URL.

Two sites are built from this repo:

| Site | URL | `VITE_MODE` |
|---|---|---|
| Classic | https://d2counter.lder.fyi | `normal` |
| Turbo | https://turbo.d2counter.lder.fyi | `turbo` |

> Dotabuff's counters pages ignore the `game_mode` filter for anonymous users (verified: identical numbers for turbo vs all-pick; the `date` filter does work and defaults to the last month), so both sites use the same matchup data; the Turbo site says so in its footer.

## How it works
- `scraper/scrape.py` scrapes Dotabuff (via `curl_cffi` to pass Cloudflare) into `web/public/data/matchups.json` + hero images in `web/public/heroes/`.
- Dotabuff's Cloudflare returns 403 to datacenter IPs (GitHub Actions included), so the scrape runs on a home machine: `scraper/refresh.sh` scrapes, commits and pushes; a systemd user timer (`scraper/systemd/`) runs it every 12h. Render redeploys both static sites on push. No backend, no cold starts.
- `web/` is a Vite + React + TypeScript app; all ranking is computed client-side from the JSON.

## Develop
```sh
pip install -r scraper/requirements.txt && python scraper/scrape.py   # refresh data (~3 min)
cd web && npm install && VITE_MODE=turbo npm run dev
npm test
```

## Scheduled refresh (systemd user timer)
```sh
mkdir -p ~/.config/systemd/user && cp scraper/systemd/* ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now d2counter-refresh.timer
```
Revert: `systemctl --user disable --now d2counter-refresh.timer`.

## Deploy
`render.yaml` defines both static sites. Custom domains: add `d2counter.lder.fyi` / `turbo.d2counter.lder.fyi` in each Render service and point DNS-only CNAMEs (Cloudflare grey cloud) to the `*.onrender.com` hostnames.

Data from [Dotabuff](https://www.dotabuff.com). Not affiliated with Valve or Dotabuff.
