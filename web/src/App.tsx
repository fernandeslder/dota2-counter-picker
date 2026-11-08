import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MODE, OTHER_URL, SITE, VIEWS } from "./config";
import {
  LIMITS, ROLE_LABELS, decodeHash, emptyFilters, emptySelection, encodeHash, missingRoles,
  sortTeamRows, teamRows, winChance, type TeamSortKey,
} from "./logic";
import { FilterPanel, HeroGrid, SelectionBar, Tier, img, sign } from "./parts";
import type { Filters, Hero, MatchupData, Role, Selection, View } from "./types";

const VIEW_ROLES: Record<View, Role[]> = {
  team: MODE === "normal" ? ["mine", "ally", "enemy", "ban"] : ["mine", "ally"],
  win: ["mine", "ally", "enemy"],
};
const HINTS: Record<View, string> = {
  team: MODE === "normal"
    ? "Add allies (and your pick) to find heroes that fit the team. Add enemies to also rank by counters. All optional."
    : "Add your teammates' heroes (and yours, if you've already chosen) to see what to pick next.",
  win: "Fill in both teams (your pick + allies vs. enemies) to see the estimated win chance.",
};
const MODE_LABEL = MODE === "turbo" ? "Turbo" : "Classic";

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
  const [view, setView] = useState<View>(VIEWS[0].id);
  const [role, setRole] = useState<Role>(VIEW_ROLES[VIEWS[0].id][0]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = SITE.title;
    document.documentElement.style.setProperty("--accent", SITE.accent);
    fetch("/data/matchups.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: MatchupData) => {
        setData(d);
        const { sel: s, view: v } = decodeHash(location.hash, new Set(d.heroes.map((h) => h.id)));
        setSel(s);
        const start = VIEWS.find((x) => x.id === v)?.id ?? VIEWS[0].id;
        setView(start);
        setRole(VIEW_ROLES[start][0]);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (data) history.replaceState(null, "", `#${encodeHash(sel, view)}`);
  }, [sel, view, data]);

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

  const roles = VIEW_ROLES[view];
  const byId = useMemo(() => new Map(data?.heroes.map((h) => [h.id, h])), [data]);

  /** selection restricted to what the current view uses (team builder ignores enemies etc.) */
  const viewSel = useMemo<Selection>(() => {
    const s = emptySelection();
    roles.forEach((r) => (s[r] = sel[r]));
    return s;
  }, [sel, roles]);
  const taken = useMemo(() => {
    const m = new Map<string, Role>();
    roles.forEach((r) => sel[r].forEach((id) => m.set(id, r)));
    return m;
  }, [sel, roles]);

  const switchView = (v: View) => {
    setView(v);
    if (!VIEW_ROLES[v].includes(role)) setRole(VIEW_ROLES[v][0]);
  };

  const pick = useCallback(
    (id: string) =>
      setSel((s) => {
        const cur = roles.find((r) => s[r].includes(id));
        const next: Selection = { enemy: [...s.enemy], ally: [...s.ally], mine: [...s.mine], ban: [...s.ban] };
        if (cur) {
          next[cur] = next[cur].filter((x) => x !== id);
          if (cur === role) return next;
        }
        if (next[role].length >= LIMITS[role]) {
          // my pick is a single slot: replace it
          if (role === "mine") next.mine = [id];
          else return s;
        } else next[role].push(id);
        return next;
      }),
    [role, roles]
  );
  const clear = () =>
    setSel((s) => {
      const n = { ...s };
      roles.forEach((r) => (n[r] = []));
      return n;
    });

  const heroes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.heroes ?? []).filter((h) => !q || h.name.toLowerCase().includes(q));
  }, [data, query]);

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
            Dotabuff data · updated {ago(data.updated)}
            {OTHER_URL && (
              <>
                {" · "}
                <a href={OTHER_URL}>Switch to {SITE.other}</a>
              </>
            )}
          </p>
        </div>
        <button className="ghost" onClick={() => navigator.clipboard?.writeText(location.href)}>Copy link</button>
      </header>

      <nav className="views" role="tablist" aria-label="Mode">
        {VIEWS.map((v) => (
          <button key={v.id} role="tab" aria-selected={view === v.id} className={view === v.id ? "on" : ""} onClick={() => switchView(v.id)}>
            {v.label}
          </button>
        ))}
      </nav>

      <main>
        <section className="panel">
          <SelectionBar
            roles={roles} role={role} setRole={setRole} sel={sel} byId={byId}
            onRemove={(id) => setSel((s) => {
              const n = { ...s };
              roles.forEach((r) => (n[r] = s[r].filter((x) => x !== id)));
              return n;
            })}
            onClear={clear} hint={HINTS[view]}
          />
          <div className="search">
            <input
              ref={search}
              value={query}
              placeholder="Search heroes  ( / )"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && heroes[0]) { pick(heroes[0].id); setQuery(""); }
                if (e.key === "Escape") { setQuery(""); search.current?.blur(); }
              }}
            />
          </div>
          <HeroGrid heroes={heroes} taken={taken} onPick={pick} query={query} />
        </section>

        {view === "team" && <TeamView data={data} sel={viewSel} byId={byId} filters={filters} setFilters={setFilters} />}
        {view === "win" && <WinView data={data} sel={viewSel} byId={byId} />}
      </main>

      <footer>
        Hero stats ({MODE === "turbo" ? "Turbo, last 7 days" : "last 7 days"}), roles and lanes are scraped from <a href={data.source}>Dotabuff</a>.
        Hero-vs-hero matchups are all game modes combined, since Dotabuff doesn't publish them per mode.
        Win chance is a rough estimate, not a prediction. Not affiliated with Valve or Dotabuff.
      </footer>
    </>
  );
}

type ViewProps = { data: MatchupData; sel: Selection; byId: Map<string, Hero> };

function TeamView({ data, sel, byId, filters, setFilters }: ViewProps & { filters: Filters; setFilters: (f: Filters) => void }) {
  const [sort, setSort] = useState<{ key: TeamSortKey; dir: "asc" | "desc" }>({ key: "fit", dir: "desc" });
  const rows = useMemo(() => teamRows(data, MODE, sel, filters), [data, sel, filters]);
  const sorted = useMemo(() => sortTeamRows(rows, sort.key, sort.dir), [rows, sort]);
  const team = [...sel.mine, ...sel.ally].map((id) => byId.get(id)).filter((h): h is Hero => !!h);
  const missing = missingRoles(team);
  const mine = byId.get(sel.mine[0]);
  const setKey = (key: TeamSortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: key === "name" ? "asc" : "desc" }));
  const arrow = (key: TeamSortKey) => (sort.key === key ? (sort.dir === "desc" ? " ▼" : " ▲") : "");

  return (
    <section className="panel">
      <FilterPanel f={filters} setF={setFilters} />
      <p className="hint teamnote">
        {mine && <><b>Suggestions for your teammates, given you're playing {mine.name}.</b>{" "}</>}
        {team.length
          ? missing.length
            ? <>Your team still lacks: {missing.map((r) => ROLE_LABELS[r]).join(", ")}.</>
            : "Your team covers every key role."
          : "No teammates yet: showing the strongest heroes right now."}
        {" "}Fit = {MODE_LABEL} win-rate edge{sel.enemy.length ? " + average advantage vs the enemies" : ""} + 0.5 per missing role,
        open lane, or lane partnership (support for your core) the hero fills (synergy). Dotabuff has no hero-with-hero data, so synergy is role and lane coverage.
      </p>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th onClick={() => setKey("name")}>Hero{arrow("name")}</th>
              {sel.enemy.map((id) => <th key={id}><img src={img(id)} alt="" /> {byId.get(id)?.name}</th>)}
              {sel.enemy.length > 0 && <th onClick={() => setKey("vsEnemies")}>vs avg{arrow("vsEnemies")}</th>}
              <th onClick={() => setKey("wr")}>{MODE_LABEL} WR{arrow("wr")}</th>
              <th onClick={() => setKey("pick")}>Pick rate{arrow("pick")}</th>
              <th>Fills</th>
              <th onClick={() => setKey("fit")}>Fit{arrow("fit")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 60).map((r) => (
              <tr key={r.hero.id}>
                <td className="name">
                  <img src={img(r.hero.id)} alt="" /> {r.hero.name}<Tier t={r.tier} />
                  <small className="dim roles-list">{r.hero.roles.map((x) => ROLE_LABELS[x] ?? x).join(" · ")}</small>
                </td>
                {r.perEnemy.map((v, i) => <td key={i} style={{ background: heat(v) }}>{sign(v)}</td>)}
                {r.vsEnemies != null && <td className="strong" style={{ background: heat(r.vsEnemies) }}>{sign(r.vsEnemies)}</td>}
                <td className={r.wr >= 50 ? "pos" : "neg"}>{r.wr.toFixed(2)}%</td>
                <td className="dim">{r.pick.toFixed(1)}%</td>
                <td className="fills">
                  {r.fills.map((x) => <span key={x} className="tag">{ROLE_LABELS[x]}</span>)}
                  {r.partner && <span className="tag">Lane partner</span>}
                  {r.fillsLane && <span className="tag">{r.fillsLane}</span>}
                </td>
                <td className="strong" style={{ background: heat(r.fit * 2) }}>{sign(r.fit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sorted.length && <p className="center hint">No heroes match these filters.</p>}
        {sorted.length > 60 && <p className="hint">Showing the top 60 of {sorted.length}. Use filters to narrow down.</p>}
      </div>
    </section>
  );
}

function WinView({ data, sel, byId }: ViewProps) {
  const mine = [...sel.mine, ...sel.ally];
  const w = useMemo(() => winChance(data, MODE, mine, sel.enemy), [data, mine.join(), sel.enemy.join()]); // eslint-disable-line
  if (!w) return <p className="center hint">Pick your hero and/or allies to estimate the win chance.</p>;
  const full = mine.length === 5 && sel.enemy.length === 5;
  const line = (ids: string[]) => ids.map((id) => byId.get(id)?.name).join(", ") || "none";
  return (
    <section className="panel win">
      <div className="gauge" style={{ ["--p" as string]: `${w.p}%` }} aria-label={`Win chance ${w.p.toFixed(0)} percent`}>
        <div className="num">{w.p.toFixed(1)}%</div>
        <div className="bar"><div /></div>
        <small className="hint">{full ? "estimated win chance" : "estimated win chance (teams not full yet)"}</small>
      </div>
      <ul className="breakdown">
        <li><span>Hero strength ({MODE_LABEL})</span><b className={w.heroEdge >= 0 ? "pos" : "neg"}>{sign(w.heroEdge)}</b>
          <small>your avg WR {w.mineWr.toFixed(1)}%{w.enemyWr != null ? ` vs enemy ${w.enemyWr.toFixed(1)}%` : " vs an average team"}</small></li>
        <li><span>Matchups</span><b className={w.matchupEdge >= 0 ? "pos" : "neg"}>{sign(w.matchupEdge)}</b>
          <small>{sel.enemy.length ? "how your heroes fare against theirs (all modes)" : "add enemies to include this"}</small></li>
      </ul>
      <p className="hint">Your team: {line(mine)}<br />Enemies: {line(sel.enemy)}</p>
      <p className="hint">Averages of Dotabuff hero win rates plus pairwise advantage. It ignores players, items and teamwork, so treat it as a rough guide.</p>
    </section>
  );
}
