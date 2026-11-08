import { describe, expect, it } from "vitest";
import {
  decodeHash, emptyFilters, emptySelection, encodeHash, heroMatches, missingRoles,
  teamRows, winChance,
} from "./logic";
import type { Hero, MatchupData } from "./types";

const st = (wr: number) => ({ wr, pick: 5, ban: 1, tier: "A" });
const h = (id: string, roles: string[], wr: number, lanes: Record<string, number> = {}, attr = "str"): Hero => ({
  id, name: id, roles, attack: "Melee", attr, lanes, stats: { normal: st(wr), turbo: st(wr + 1) },
});
const data: MatchupData = {
  updated: "", source: "",
  heroes: [
    h("a", ["Carry"], 50, { "Safe Lane": 90 }),
    h("b", ["Support", "Disabler"], 52, { "Safe Lane": 70, "Off Lane": 30 }, "int"),
    h("c", ["Initiator", "Durable"], 48, { "Off Lane": 80 }),
  ],
  adv: [[0, 1, -2], [3, 0, 4], [-1, 2, 0]],
  wr: [[50, 51, 49], [53, 50, 54], [48, 52, 50]],
  n: [[0, 900, 50], [800, 0, 700], [600, 500, 0]],
};
const sel = (o: Partial<ReturnType<typeof emptySelection>>) => ({ ...emptySelection(), ...o });

describe("filters", () => {
  const [a, b, c] = data.heroes;
  it("position: core vs support", () => {
    const f = { ...emptyFilters(), position: ["support" as const] };
    expect([a, b, c].filter((x) => heroMatches(x, f)).map((x) => x.id)).toEqual(["b"]);
    const core = { ...emptyFilters(), position: ["core" as const] };
    expect([a, b, c].filter((x) => heroMatches(x, core)).map((x) => x.id)).toEqual(["a", "c"]);
  });
  it("multiple roles: any vs all", () => {
    const any = { ...emptyFilters(), roles: ["Carry", "Initiator"] };
    expect([a, b, c].filter((x) => heroMatches(x, any)).map((x) => x.id)).toEqual(["a", "c"]);
    const all = { ...emptyFilters(), roles: ["Initiator", "Durable"], matchAllRoles: true };
    expect([a, b, c].filter((x) => heroMatches(x, all)).map((x) => x.id)).toEqual(["c"]);
  });
  it("lane and attribute", () => {
    expect(heroMatches(b, { ...emptyFilters(), lanes: ["Off Lane"] })).toBe(true); // 30% secondary
    expect(heroMatches(a, { ...emptyFilters(), lanes: ["Off Lane"] })).toBe(false);
    expect(heroMatches(b, { ...emptyFilters(), attrs: ["int"] })).toBe(true);
    expect(heroMatches(a, { ...emptyFilters(), attrs: ["int"] })).toBe(false);
  });
});

describe("team builder", () => {
  it("reports roles the team still lacks", () => {
    expect(missingRoles([data.heroes[0]])).toEqual(["Support", "Disabler", "Initiator", "Durable"]);
  });
  it("ranks by mode win rate plus role-fill bonus", () => {
    const rows = teamRows(data, "turbo", sel({ mine: ["a"] }), emptyFilters());
    const b = rows.find((r) => r.hero.id === "b")!;
    expect(b.wr).toBe(53); // turbo = base + 1
    expect(b.fills).toEqual(["Support", "Disabler"]);
    expect(b.fit).toBeCloseTo(3 + 1, 5);
    expect(rows.map((r) => r.hero.id).sort()).toEqual(["b", "c"]);
  });
  it("adds average advantage vs known enemies", () => {
    const rows = teamRows(data, "normal", sel({ mine: ["a"], enemy: ["c"] }), emptyFilters());
    expect(rows.find((r) => r.hero.id === "b")!.vsEnemies).toBe(4);
  });
  it("works with no enemies, and ignores low-sample matchups", () => {
    expect(teamRows(data, "normal", emptySelection(), emptyFilters()).every((r) => r.vsEnemies === null)).toBe(true);
    // a vs c has only 50 matches, so its -2 doesn't count
    const r = teamRows(data, "normal", sel({ enemy: ["c"] }), emptyFilters()).find((x) => x.hero.id === "a")!;
    expect(r.vsEnemies).toBe(0);
  });
  it("rewards heroes whose main lane the team doesn't cover yet", () => {
    const r = teamRows(data, "normal", sel({ ally: ["a"] }), emptyFilters()).find((x) => x.hero.id === "c")!;
    expect(r.fillsLane).toBe("Off Lane");
  });
});

describe("winChance", () => {
  it("is null with nobody on my team", () => {
    expect(winChance(data, "turbo", [], ["a"])).toBeNull();
  });
  it("combines hero win rates and matchups", () => {
    const w = winChance(data, "normal", ["b"], ["a"])!;
    expect(w.heroEdge).toBe(2); // 52 vs 50
    expect(w.matchupEdge).toBe((3 - 1) / 2); // b vs a = 3, a vs b = 1
    expect(w.p).toBe(53);
  });
  it("uses the mode's win rates and clamps", () => {
    expect(winChance(data, "turbo", ["b"], [])!.p).toBe(53);
    const big = { ...data, adv: [[0, 90, 0], [90, 0, 0], [0, 0, 0]] };
    expect(winChance(big, "normal", ["a"], ["b"])!.p).toBeLessThanOrEqual(95);
  });
});

describe("hash", () => {
  it("round-trips and drops unknown/duplicate ids", () => {
    const ids = new Set(["a", "b", "c"]);
    const s = sel({ enemy: ["a", "b"], ally: ["c"] });
    expect(decodeHash("#" + encodeHash(s, "win"), ids)).toEqual({ sel: s, view: "win" });
    expect(decodeHash("#e=a,zzz,a&a=a&m=b", ids).sel).toEqual(sel({ enemy: ["a"], mine: ["b"] }));
  });
});
