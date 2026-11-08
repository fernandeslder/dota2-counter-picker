#!/bin/sh
# Scrape Dotabuff from this machine (GitHub's IPs get 403 from Cloudflare), commit and push if changed.
set -eu
cd "$(dirname "$0")/.."
python3 -m pip install -q --user --break-system-packages -r scraper/requirements.txt 2>/dev/null || true
git pull -q --rebase origin main
python3 scraper/scrape.py
git add web/public
if ! git diff --cached --quiet; then
  git -c user.name="Leander Fernandes" -c user.email="43265952+fernandeslder@users.noreply.github.com" \
    commit -q -m "chore: refresh matchup data"
  git push -q origin main
fi
