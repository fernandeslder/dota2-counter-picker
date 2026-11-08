import type { MatchupData, Role, Row, Selection } from "./types";

export const LIMITS: Record<Role, number> = { enemy: 5, ally: 4, ban: 12 };

export function emptySelection(): Selection {
  return { enemy: [], ally: [], ban: [] };
}

/** Rank every hero that is still available against the chosen enemies. */
export function computeRows(data: MatchupData, sel: Selection, minMatches: number): Row[] {
  const idx = new Map(data.heroes.map((h, i) => [h.id, i]));
  const enemies = sel.enemy.map((id) => idx.get(id)).filter((i): i is number => i !== undefined);
  if (!enemies.length) return [];
  const taken = new Set([...sel.enemy, ...sel.ally, ...sel.ban]);

  const rows: Row[] = [];
  data.heroes.forEach((hero, c) => {
    if (taken.has(hero.id)) return;
    const perEnemy = enemies.map((e) => data.adv[c][e]);
    const minN = Math.min(...enemies.map((e) => data.n[c][e]));
    if (minN < minMatches) return;
    rows.push({
      hero,
      index: c,
      perEnemy,
      cumAdv: perEnemy.reduce((a, b) => a + b, 0),
      avgWr: enemies.reduce((a, e) => a + data.wr[c][e], 0) / enemies.length,
      minMatches: minN,
    });
  });
  return rows;
}

export type SortKey = "cumAdv" | "avgWr" | "minMatches" | "name" | `enemy:${number}`;

export function sortRows(rows: Row[], key: SortKey, dir: "asc" | "desc"): Row[] {
  const val = (r: Row): number | string =>
    key === "name" ? r.hero.name
    : key.startsWith("enemy:") ? r.perEnemy[Number(key.slice(6))]
    : r[key as "cumAdv" | "avgWr" | "minMatches"];
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = val(a), y = val(b);
    return (typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number)) * sign;
  });
}

// --- URL state: #e=a,b&a=c&b=d ---
const KEYS: Record<Role, string> = { enemy: "e", ally: "a", ban: "b" };

export function encodeHash(sel: Selection): string {
  const parts = (Object.keys(KEYS) as Role[])
    .filter((r) => sel[r].length)
    .map((r) => `${KEYS[r]}=${sel[r].join(",")}`);
  return parts.join("&");
}

export function decodeHash(hash: string, validIds: Set<string>): Selection {
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
  return sel;
}
