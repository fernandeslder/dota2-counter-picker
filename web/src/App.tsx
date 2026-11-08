import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MODE, OTHER_URL, SITE } from "./config";
import { LIMITS, computeRows, decodeHash, emptySelection, encodeHash, sortRows, type SortKey } from "./logic";
import type { Hero, MatchupData, Role, Row, Selection } from "./types";

const ROLE_LABEL: Record<Role, string> = { enemy: "Enemy", ally: "Ally", ban: "Banned" };
const img = (id: string) => `/heroes/${id}.jpg`;
const sign = (v: number) => (v > 0 ? "+" : "") + v.toFixed(2);

function ago(iso: string) {
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 36e5));
  return h < 1 ? "just now" : h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function heat(v: number) {
  const a = Math.min(Math.abs(v) / 8, 1) * 0.55;
  return v === 0 ? undefined : `rgba(${v > 0 ? "60,200,110" : "230,80,80"},${a.toFixed(2)})`;
}

export default function App() {
  const [data, setData] = useState<MatchupData | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState<Selection>(emptySelection);
  const [role, setRole] = useState<Role>("enemy");
  const [query, setQuery] = useState("");
  const [minMatches, setMinMatches] = useState(100);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "cumAdv", dir: "desc" });
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = SITE.title;
    document.documentElement.style.setProperty("--accent", SITE.accent);
    fetch("/data/matchups.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: MatchupData) => {
        setData(d);
        setSel(decodeHash(location.hash, new Set(d.heroes.map((h) => h.id))));
      })
      .catch(() => setFailed(true));
  }, []);

  // keep URL in sync so a draft can be shared
  useEffect(() => {
    if (data) history.replaceState(null, "", encodeHash(sel) ? `#${encodeHash(sel)}` : location.pathname);
  }, [sel, data]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const byId = useMemo(() => new Map(data?.heroes.map((h) => [h.id, h])), [data]);
  const taken = useMemo(() => {
    const m = new Map<string, Role>();
    (Object.keys(sel) as Role[]).forEach((r) => sel[r].forEach((id) => m.set(id, r)));
    return m;
  }, [sel]);

  const toggle = useCallback(
    (id: string) =>
      setSel((s) => {
        const cur = [...(Object.keys(s) as Role[])].find((r) => s[r].includes(id));
        const next: Selection = { enemy: [...s.enemy], ally: [...s.ally], ban: [...s.ban] };
        if (cur) {
          next[cur] = next[cur].filter((x) => x !== id);
          if (cur === role) return next;
        }
        if (next[role].length >= LIMITS[role]) return s;
        next[role].push(id);
        return next;
      }),
    [role]
  );

  const rows = useMemo(() => (data ? computeRows(data, sel, minMatches) : []), [data, sel, minMatches]);
  const sorted = useMemo(() => sortRows(rows, sort.key, sort.dir), [rows, sort]);
  const top = useMemo(() => sortRows(rows, "cumAdv", "desc").slice(0, 5), [rows]);

  const heroes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.heroes ?? []).filter((h) => !q || h.name.toLowerCase().includes(q));
  }, [data, query]);

  const setSortKey = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: key === "name" ? "asc" : "desc" }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === "desc" ? " ▼" : " ▲") : "");
  const clear = () => setSel(emptySelection());

  if (failed) return <main className="center">Could not load matchup data. Please refresh.</main>;
  if (!data) return <main className="center">Loading matchup data…</main>;

  return (
    <>
      <header className="top">
        <div>
          <h1>
            {SITE.title} <span className="badge">{SITE.tag}</span>
          </h1>
          <p className="sub">
            Matchup data from Dotabuff · updated {ago(data.updated)}
            {OTHER_URL && (
              <>
                {" · "}
                <a href={OTHER_URL}>Switch to {SITE.other}</a>
              </>
            )}
          </p>
        </div>
        <button className="ghost" onClick={() => navigator.clipboard?.writeText(location.href)} disabled={!taken.size}>
          Copy link
        </button>
      </header>

      <main>
        <section className="panel">
          <div className="roles" role="tablist" aria-label="Selecting as">
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <button key={r} role="tab" aria-selected={role === r} className={`role ${r} ${role === r ? "on" : ""}`} onClick={() => setRole(r)}>
                {ROLE_LABEL[r]} <small>{sel[r].length}/{LIMITS[r]}</small>
              </button>
            ))}
            <button className="ghost" onClick={clear} disabled={!taken.size}>Clear all</button>
          </div>

          <div className="chips">
            {(Object.keys(ROLE_LABEL) as Role[]).flatMap((r) =>
              sel[r].map((id) => (
                <button key={id} className={`chip ${r}`} onClick={() => toggle(id)} title="Remove">
                  <img src={img(id)} alt="" /> {byId.get(id)?.name} <span aria-hidden>×</span>
                </button>
              ))
            )}
            {!taken.size && <span className="hint">Pick the enemy heroes below. Use Ally / Banned to hide heroes you can't or won't pick.</span>}
          </div>

          <div className="search">
            <input
              ref={search}
              value={query}
              placeholder="Search heroes  ( / )"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && heroes[0]) { toggle(heroes[0].id); setQuery(""); }
                if (e.key === "Escape") { setQuery(""); search.current?.blur(); }
              }}
            />
          </div>

          <div className="grid">
            {heroes.map((h) => (
              <HeroTile key={h.id} hero={h} state={taken.get(h.id)} onClick={() => toggle(h.id)} />
            ))}
            {!heroes.length && <span className="hint">No heroes match "{query}".</span>}
          </div>
        </section>

        {sel.enemy.length === 0 ? (
          <p className="center hint">Select at least one enemy hero to see counters.</p>
        ) : (
          <>
            <section className="top5">
              {top.map((r, i) => (
                <article key={r.hero.id} className="card">
                  <span className="rank">#{i + 1}</span>
                  <img src={img(r.hero.id)} alt="" />
                  <b>{r.hero.name}</b>
                  <span className="pos">{sign(r.cumAdv)}% adv</span>
                  <small>{r.avgWr.toFixed(1)}% avg WR</small>
                </article>
              ))}
            </section>

            <section className="panel">
              <div className="toolbar">
                <label>
                  Min matches per matchup{" "}
                  <select value={minMatches} onChange={(e) => setMinMatches(Number(e.target.value))}>
                    {[0, 100, 500, 1000, 5000].map((v) => <option key={v} value={v}>{v === 0 ? "any" : `${v}+`}</option>)}
                  </select>
                </label>
                <span className="hint">{sorted.length} heroes</span>
              </div>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => setSortKey("name")}>Hero{arrow("name")}</th>
                      {sel.enemy.map((id, i) => (
                        <th key={id} onClick={() => setSortKey(`enemy:${i}`)} title={`Advantage vs ${byId.get(id)?.name}`}>
                          <img src={img(id)} alt="" /> {byId.get(id)?.name}{arrow(`enemy:${i}`)}
                        </th>
                      ))}
                      <th onClick={() => setSortKey("cumAdv")}>Cumulative adv.{arrow("cumAdv")}</th>
                      <th onClick={() => setSortKey("avgWr")}>Avg WR{arrow("avgWr")}</th>
                      <th onClick={() => setSortKey("minMatches")}>Min matches{arrow("minMatches")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => <ResultRow key={r.hero.id} row={r} onPick={() => toggle(r.hero.id)} />)}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      <footer>
        Data scraped from <a href={data.source}>Dotabuff</a>. Dotabuff publishes matchups across all game modes
        {MODE === "turbo" ? ", so Turbo numbers are the overall figures; no Turbo-only matchup data is available" : ""}.
        Not affiliated with Valve or Dotabuff.
      </footer>
    </>
  );
}

function HeroTile({ hero, state, onClick }: { hero: Hero; state?: Role; onClick: () => void }) {
  return (
    <button className={`tile ${state ?? ""}`} onClick={onClick} title={`${hero.name} · tier ${hero.tier}`}>
      <img src={img(hero.id)} alt="" loading="lazy" />
      <span>{hero.name}</span>
    </button>
  );
}

function ResultRow({ row, onPick }: { row: Row; onPick: () => void }) {
  return (
    <tr>
      <td className="name">
        <button className="link" onClick={onPick} title="Add to current selection">
          <img src={img(row.hero.id)} alt="" /> {row.hero.name}
        </button>
        <small className={`tier t${row.hero.tier}`}>{row.hero.tier}</small>
      </td>
      {row.perEnemy.map((v, i) => <td key={i} style={{ background: heat(v) }}>{sign(v)}</td>)}
      <td className="strong" style={{ background: heat(row.cumAdv / Math.max(1, row.perEnemy.length)) }}>{sign(row.cumAdv)}</td>
      <td className={row.avgWr >= 50 ? "pos" : "neg"}>{row.avgWr.toFixed(2)}%</td>
      <td className="dim">{row.minMatches.toLocaleString()}</td>
    </tr>
  );
}
