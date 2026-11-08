import type { Mode } from "./config";
import type { Filters, Hero, MatchupData, Role, Selection, Stat, TeamRow, View } from "./types";

export const LIMITS: Record<Role, number> = { enemy: 5, ally: 4, mine: 1, ban: 12 };

export const ROLE_LABELS: Record<string, string> = {
  Carry: "Carry",
  Nuker: "Nuker",
  Disabler: "Disabler (stun)",
  Initiator: "Initiator",
  Durable: "Durable (tank)",
  Escape: "Escape",
  Pusher: "Pusher",
  Jungler: "Jungler",
  Support: "Support",
};
export const ROLE_ORDER = ["Carry", "Nuker", "Disabler", "Initiator", "Durable", "Escape", "Pusher"];
export const LANES = ["Safe Lane", "Mid Lane", "Off Lane", "Jungle", "Roaming"];
export const ATTRS: { id: string; label: string }[] = [
  { id: "str", label: "Strength" },
  { id: "agi", label: "Agility" },
  { id: "int", label: "Intelligence" },
  { id: "uni", label: "Universal" },
];

/** How many heroes with a role a balanced team wants. Used for the team-builder "fills" bonus. */
export const TEAM_NEEDS: Record<string, number> = { Carry: 1, Support: 2, Disabler: 2, Initiator: 1, Durable: 1 };
export const FILL_BONUS = 0.5; // fit-score points per missing role a hero fills
export const LANE_BONUS = 0.5; // fit-score points when a hero mainly plays a lane nobody on the team covers
export const CORE_LANES = ["Safe Lane", "Mid Lane", "Off Lane"];
export const MIN_MATCHUP_N = 100; // ignore matchups with fewer matches than this (too noisy)

export function emptySelection(): Selection {
  return { enemy: [], ally: [], mine: [], ban: [] };
}
export function emptyFilters(): Filters {
  return { position: [], roles: [], matchAllRoles: false, lanes: [], attrs: [] };
}

export const stat = (h: Hero, mode: Mode): Stat => h.stats[mode];
export const isSupport = (h: Hero) => h.roles.includes("Support");
export const isCore = (h: Hero) => h.roles.includes("Carry") || !isSupport(h);
export const mainLane = (h: Hero): string | null =>
  Object.entries(h.lanes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

export function heroMatches(h: Hero, f: Filters): boolean {
  if (f.position.length) {
    const ok = (f.position.includes("core") && isCore(h)) || (f.position.includes("support") && isSupport(h));
    if (!ok) return false;
  }
  if (f.roles.length) {
    const ok = f.matchAllRoles ? f.roles.every((r) => h.roles.includes(r)) : f.roles.some((r) => h.roles.includes(r));
    if (!ok) return false;
  }
  if (f.lanes.length) {
    // a hero counts for a lane if it is its main lane or a real secondary one (>=25% presence)
    const ok = f.lanes.some((l) => (h.lanes[l] ?? 0) >= 25 || mainLane(h) === l);
    if (!ok) return false;
  }
  if (f.attrs.length && !(h.attr && f.attrs.includes(h.attr))) return false;
  return true;
}

export const filtersActive = (f: Filters) => f.position.length + f.roles.length + f.lanes.length + f.attrs.length > 0;

export const takenIds = (sel: Selection) => new Set([...sel.enemy, ...sel.ally, ...sel.mine, ...sel.ban]);

// ---------- team builder: what should we pick? ----------

function idxMap(data: MatchupData) {
  return new Map(data.heroes.map((h, i) => [h.id, i]));
}

/** Roles from the team that are still short of TEAM_NEEDS. */
export function missingRoles(team: Hero[]): string[] {
  return Object.entries(TEAM_NEEDS)
    .filter(([role, need]) => team.filter((h) => h.roles.includes(role)).length < need)
    .map(([role]) => role);
}

export function teamRows(data: MatchupData, mode: Mode, sel: Selection, f: Filters): TeamRow[] {
  const byId = new Map(data.heroes.map((h) => [h.id, h]));
  const idx = idxMap(data);
  const team = [...sel.mine, ...sel.ally].map((id) => byId.get(id)).filter((h): h is Hero => !!h);
  const missing = missingRoles(team);
  const covered = new Set(team.map(mainLane));
  const openLanes = CORE_LANES.filter((l) => !covered.has(l));
  const enemies = sel.enemy.map((id) => idx.get(id)).filter((i): i is number => i !== undefined);
  const taken = takenIds(sel);

  const rows: TeamRow[] = [];
  data.heroes.forEach((hero, c) => {
    if (taken.has(hero.id) || !heroMatches(hero, f)) return;
    const s = stat(hero, mode);
    if (s.wr == null) return;
    const fills = missing.filter((r) => hero.roles.includes(r));
    const lane = mainLane(hero);
    const fillsLane = lane && openLanes.includes(lane) && team.length > 0 ? lane : null;
    const perEnemy = enemies.map((e) => (data.n[c][e] >= MIN_MATCHUP_N ? data.adv[c][e] : 0));
    const vs = perEnemy.length ? perEnemy.reduce((a, b) => a + b, 0) / perEnemy.length : null;
    rows.push({
      hero, index: c, wr: s.wr, pick: s.pick ?? 0, tier: s.tier ?? "-", fills, fillsLane, perEnemy, vsEnemies: vs,
      fit: s.wr - 50 + (vs ?? 0) + FILL_BONUS * fills.length + (fillsLane ? LANE_BONUS : 0),
    });
  });
  return rows;
}

export type TeamSortKey = "fit" | "wr" | "pick" | "vsEnemies" | "name";
export function sortTeamRows(rows: TeamRow[], key: TeamSortKey, dir: "asc" | "desc"): TeamRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) =>
    key === "name" ? a.hero.name.localeCompare(b.hero.name) * sign : ((a[key] ?? 0) - (b[key] ?? 0)) * sign);
}

// ---------- win chance ----------

export interface WinChance {
  p: number;
  heroEdge: number;
  matchupEdge: number;
  mineWr: number;
  enemyWr: number | null;
}

/**
 * Rough estimate, deliberately conservative (averages, not sums):
 *   p = 50 + (avg hero WR edge of my team - avg of enemy team) + (avg matchup edge)
 * Hero win rates come from the active game mode; matchups are all-modes and ~antisymmetric,
 * so the net matchup edge is half the difference of both sides' average advantage.
 */
export function winChance(data: MatchupData, mode: Mode, mine: string[], enemy: string[]): WinChance | null {
  const idx = idxMap(data);
  const m = mine.map((id) => idx.get(id)).filter((i): i is number => i !== undefined);
  const e = enemy.map((id) => idx.get(id)).filter((i): i is number => i !== undefined);
  if (!m.length) return null;
  const wr = (i: number) => data.heroes[i].stats[mode].wr ?? 50;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  const mineWr = avg(m.map(wr));
  const enemyWr = e.length ? avg(e.map(wr)) : null;
  const heroEdge = mineWr - (enemyWr ?? 50);
  let matchupEdge = 0;
  if (e.length) {
    const aMine = avg(m.map((i) => avg(e.map((j) => data.adv[i][j]))));
    const aEnemy = avg(e.map((j) => avg(m.map((i) => data.adv[j][i]))));
    matchupEdge = (aMine - aEnemy) / 2;
  }
  const p = Math.min(95, Math.max(5, 50 + heroEdge + matchupEdge));
  return { p, heroEdge, matchupEdge, mineWr, enemyWr };
}

// ---------- URL state: #v=team&m=a&a=b,c&e=d&b=x ----------
const KEYS: Record<Role, string> = { enemy: "e", ally: "a", mine: "m", ban: "b" };

export function encodeHash(sel: Selection, view: View): string {
  const parts = (Object.keys(KEYS) as Role[])
    .filter((r) => sel[r].length)
    .map((r) => `${KEYS[r]}=${sel[r].join(",")}`);
  return [`v=${view}`, ...parts].join("&");
}

export function decodeHash(hash: string, validIds: Set<string>): { sel: Selection; view: string | null } {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const sel = emptySelection();
  const seen = new Set<string>();
  (Object.keys(KEYS) as Role[]).forEach((r) => {
    for (const id of (params.get(KEYS[r]) ?? "").split(",")) {
      if (validIds.has(id) && !seen.has(id) && sel[r].length < LIMITS[r]) {
        sel[r].push(id);
        seen.add(id);
      }
    }
  });
  return { sel, view: params.get("v") };
}
