"""Hero-with-hero synergy from two independent sources, combined into one matrix.

  Stratz (GraphQL, needs a free token): ranked pub matches since the latest game version
    (e.g. 7.41f) started. Token: $STRATZ_TOKEN or ~/.config/d2counter/stratz_token.
  Dota2ProTracker /api/hero/<id>/synergies: pub-mode pair stats (its default dataset).

For every source and pair (a, b) we compute
    delta = pair win rate - expected,   expected = wr_a + wr_b - 50
where wr_x is x's own win rate in that source (wins/matches over all its partners), and pool the sources by sample size, shrunk toward 0 by K = SHRINK games (small samples count for little). Result, indexed by `heroes` order:
    syn[a][b]   percentage-point change in win rate when a and b are on the same team
    synN[a][b]  matches behind it (the larger source's count, since both see overlapping games)
"""
import json, os, re, sys, time
from pathlib import Path

SHRINK = 1500  # default prior weight (games); with two sources it is estimated from the data
NOISE_VAR_GAMES = 2500  # win-rate noise variance in pp^2 is about p(1-p)*10000/n = 2500/n
TOKEN_FILE = Path.home() / ".config/d2counter/stratz_token"
D2PT = "https://www.dota2protracker.com"


def norm(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _pairs_to_matrix(pairs, ids, N):
    """pairs: {(ia, ib): (matches, wins)} -> (delta matrix, n matrix) using marginal win rates."""
    tot_m, tot_w = [0] * N, [0] * N
    for (a, b), (m, w) in pairs.items():
        tot_m[a] += m
        tot_w[a] += w
    wr = [(100 * tot_w[i] / tot_m[i]) if tot_m[i] else 50.0 for i in range(N)]
    delta = [[0.0] * N for _ in range(N)]
    n = [[0] * N for _ in range(N)]
    for (a, b), (m, w) in pairs.items():
        if m <= 0:
            continue
        d = 100 * w / m - (wr[a] + wr[b] - 50)
        delta[a][b] = d
        n[a][b] = m
    return delta, n


def stratz(get_json_post, names):
    token = os.environ.get("STRATZ_TOKEN") or (TOKEN_FILE.read_text().strip() if TOKEN_FILE.exists() else "")
    if not token:
        print("synergy: no Stratz token, skipping Stratz", file=sys.stderr)
        return None
    hdr = {"Authorization": f"Bearer {token}", "User-Agent": "STRATZ_API", "Content-Type": "application/json"}

    def gql(q):
        return get_json_post("https://api.stratz.com/graphql", {"query": q}, hdr)

    consts = gql("{ constants { heroes { id displayName } gameVersions { name asOfDateTime } } }")["data"]["constants"]
    version = max(consts["gameVersions"], key=lambda v: v["asOfDateTime"])
    sid_to_idx = {}
    for h in consts["heroes"]:
        i = names.get(norm(h["displayName"]))
        if i is not None:
            sid_to_idx[h["id"]] = i
    print(f"synergy: Stratz since {version['name']} ({len(sid_to_idx)} heroes mapped)", flush=True)

    pairs = {}
    for sid, a in sid_to_idx.items():
        q = f"{{ heroStats {{ matchUp(heroId:{sid}, week:{version['asOfDateTime']}, take:200) {{ with {{ heroId2 matchCount winCount }} }} }} }}"
        rows = (gql(q)["data"]["heroStats"]["matchUp"] or [{"with": []}])[0]["with"]
        for r in rows:
            b = sid_to_idx.get(r["heroId2"])
            if b is not None and b != a:
                pairs[(a, b)] = (r["matchCount"], r["winCount"])
        time.sleep(0.2)
    return pairs, version["name"]


def d2pt(session, hero_names, names):
    """hero_names: Dotabuff display names; D2PT ids are the Dota hero ids (same as Stratz)."""
    session.get(f"{D2PT}/hero/Axe?mode=pub", timeout=60)  # session cookie; the API 403s without it
    hdr = {"Referer": f"{D2PT}/hero/Axe", "Accept": "application/json", "Sec-Fetch-Site": "same-origin",
           "Sec-Fetch-Mode": "cors", "X-Requested-With": "XMLHttpRequest"}
    lst = session.get(f"{D2PT}/api/heroes/list", timeout=60, headers=hdr).json()
    lst = lst if isinstance(lst, list) else lst.get("heroes") or lst.get("data") or []
    did_to_idx = {}
    for h in lst:
        nm = h.get("displayName") or h.get("name") or h.get("hero_name")
        i = names.get(norm(nm or ""))
        if i is not None:
            did_to_idx[h.get("hero_id") or h.get("id")] = i
    print(f"synergy: D2PT ({len(did_to_idx)} heroes mapped)", flush=True)
    pairs = {}
    for did, a in did_to_idx.items():
        r = session.get(f"{D2PT}/api/hero/{did}/synergies?minified=true&min_matches=0", timeout=60, headers=hdr)
        if r.status_code != 200:
            print(f"  d2pt {r.status_code} for hero {did}", file=sys.stderr)
            continue
        for pos, oid, opos, m, w in r.json()["data"]:
            if pos == "all" and opos == "all" and oid in did_to_idx and did_to_idx[oid] != a:
                pairs[(a, did_to_idx[oid])] = (m, w)
        time.sleep(0.2)
    return pairs


def combine(sources, N, shrink=SHRINK):
    """sources: list of (raw delta, n). Per source the two directions are averaged (same games),
    then pooled: syn = sum(n_i * delta_i) / (sum(n_i) + shrink), i.e. shrunk toward 0 by `shrink` games."""
    syn = [[0.0] * N for _ in range(N)]
    nn = [[0] * N for _ in range(N)]
    for a in range(N):
        for b in range(a + 1, N):
            num = tot = 0.0
            big = 0
            for delta, n in sources:
                m = (n[a][b] + n[b][a]) / 2
                if m:
                    num += m * (delta[a][b] + delta[b][a]) / 2
                    tot += m
                    big = max(big, m)
            if tot:
                syn[a][b] = syn[b][a] = num / (tot + shrink)
                nn[a][b] = nn[b][a] = int(big)
    return syn, nn


def build(session, hero_display_names):
    """-> (syn, synN, meta) or None if no source worked."""
    N = len(hero_display_names)
    names = {norm(n): i for i, n in enumerate(hero_display_names)}

    def post(url, body, hdr):
        r = session.post(url, json=body, headers=hdr, timeout=90)
        r.raise_for_status()
        return r.json()

    sources, meta = [], {}
    try:
        got = stratz(post, names)
        if got:
            sources.append(_pairs_to_matrix(got[0], None, N))
            meta["stratz"] = got[1]
    except Exception as e:
        print(f"synergy: Stratz failed: {e}", file=sys.stderr)
    try:
        p = d2pt(session, hero_display_names, names)
        if p:
            sources.append(_pairs_to_matrix(p, None, N))
            meta["d2pt"] = "pub"
    except Exception as e:
        print(f"synergy: D2PT failed: {e}", file=sys.stderr)
    if not sources:
        return None
    shrink = SHRINK
    if len(sources) == 2:  # sanity check: do the two independent sources agree?
        (d1, n1), (d2, n2) = sources
        xs, ys = [], []
        for a in range(N):
            for b in range(a + 1, N):
                if min(n1[a][b] + n1[b][a], n2[a][b] + n2[b][a]) >= 1000:
                    xs.append((d1[a][b] + d1[b][a]) / 2)
                    ys.append((d2[a][b] + d2[b][a]) / 2)
        if len(xs) > 30:
            mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
            cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
            vx, vy = sum((x - mx) ** 2 for x in xs), sum((y - my) ** 2 for y in ys)
            meta["agreement"] = round(cov / (vx * vy) ** 0.5, 3)
            # empirical Bayes: the sources' covariance estimates the true pair-effect variance (pp^2),
            # so the optimal prior weight is noise-per-game / signal variance
            signal = max(cov / len(xs), 0.3)
            shrink = min(4000, max(300, NOISE_VAR_GAMES / signal))
            meta["shrink"] = round(shrink)
            print(f"synergy: Stratz vs D2PT correlation {meta['agreement']} over {len(xs)} pairs", flush=True)
    syn, nn = combine(sources, N, shrink)
    meta.setdefault("shrink", shrink)
    return [[round(v, 2) for v in r] for r in syn], nn, meta
