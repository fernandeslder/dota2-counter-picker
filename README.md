# Dota 2 Counter Picker

Three tools (Turbo has no counter-pick, since every Turbo pick is blind):

- **Team builder**: add your pick and your allies; heroes are ranked by the mode's win rate plus a bonus for the roles your team still lacks. Filter by position (core/support), multiple roles at once (any/all), lane and attribute.
- **Win chance**: fill both teams for a rough win-probability estimate from hero win rates and pairwise matchups.
- **Counter-pick** (Classic only): pick enemies, rank counters by cumulative advantage and average win rate.

Drafts are shareable via the URL.

Two sites are built from this repo:

| Site | URL | `VITE_MODE` |
|---|---|---|
| Classic | https://d2counter.lder.fyi | `normal` |
| Turbo | https://turbo.d2counter.lder.fyi | `turbo` |

> Dotabuff publishes **Turbo hero stats** (`/heroes?...&mode=turbo&date=7d`), which the Turbo site uses. Its hero-vs-hero matchup pages ignore the `mode` filter, so matchups are all-modes on both sites. Roles are Dotabuff's (Valve's) roles: "Durable" is the tank role and "Disabler" covers stunners.

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
