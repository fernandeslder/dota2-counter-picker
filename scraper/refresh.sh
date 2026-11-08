#!/bin/sh
# Scrape Dotabuff (current patch only) from this machine (GitHub's IPs get 403 from Cloudflare),
# commit and push if changed, then tell Render to deploy both sites.
#   refresh.sh            scrape; push + deploy only if the data changed
#   refresh.sh --deploy   same, but always deploy (e.g. after a code-only push)
# Render deploy hooks live in ~/.config/d2counter/hooks (CLASSIC=<url> / TURBO=<url>, mode 600).
set -eu
cd "$(dirname "$0")/.."
python3 -m pip install -q --user --break-system-packages -r scraper/requirements.txt 2>/dev/null || true
git pull -q --rebase origin main
python3 scraper/scrape.py
git add web/public
changed=0
if ! git diff --cached --quiet; then
  git -c user.name="Leander Fernandes" -c user.email="43265952+fernandeslder@users.noreply.github.com" \
    commit -q -m "chore: refresh matchup data"
  git push -q origin main
  changed=1
fi
if [ "$changed" = 1 ] || [ "${1:-}" = "--deploy" ]; then
  HOOKS="$HOME/.config/d2counter/hooks"
  if [ -r "$HOOKS" ]; then
    . "$HOOKS"
    for url in "${CLASSIC:-}" "${TURBO:-}"; do
      [ -n "$url" ] && curl -fsS -m 30 "$url" >/dev/null && echo "deploy triggered"
    done
  else
    echo "no $HOOKS: push done, but Render was not told to deploy" >&2
  fi
fi
