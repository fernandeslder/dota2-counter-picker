import { describe, expect, it } from "vitest";
import { computeRows, decodeHash, encodeHash, sortRows } from "./logic";
import type { MatchupData } from "./types";

const h = (id: string) => ({ id, name: id, tier: "A", wr: 50, pick: 1, ban: 1 });
const data: MatchupData = {
  updated: "", source: "",
  heroes: [h("a"), h("b"), h("c")],
  adv: [[0, 1, -2], [3, 0, 4], [-1, 2, 0]],
  wr: [[50, 51, 49], [53, 50, 54], [48, 52, 50]],
  n: [[0, 900, 50], [800, 0, 700], [600, 500, 0]],
};

describe("computeRows", () => {
  it("sums advantage and averages win rate over enemies", () => {
    const rows = computeRows(data, { enemy: ["a", "c"], ally: [], ban: [] }, 0);
    const b = rows.find((r) => r.hero.id === "b")!;
    expect(b.cumAdv).toBe(7);
    expect(b.avgWr).toBe(53.5);
    expect(rows.map((r) => r.hero.id)).toEqual(["b"]); // a, c are enemies
  });
  it("hides allies, bans and low-sample matchups", () => {
    const sel = { enemy: ["a"], ally: ["b"], ban: [] };
    expect(computeRows(data, sel, 0).map((r) => r.hero.id)).toEqual(["c"]);
    expect(computeRows(data, { enemy: ["c"], ally: [], ban: [] }, 100).map((r) => r.hero.id)).toEqual(["b"]);
  });
  it("is empty with no enemies", () => {
    expect(computeRows(data, { enemy: [], ally: [], ban: [] }, 0)).toEqual([]);
  });
});

describe("sortRows", () => {
  it("sorts by cumulative advantage desc", () => {
    const rows = computeRows(data, { enemy: ["a"], ally: [], ban: [] }, 0);
    expect(sortRows(rows, "cumAdv", "desc").map((r) => r.hero.id)).toEqual(["b", "c"]);
  });
});

describe("hash", () => {
  it("round-trips and drops unknown/duplicate ids", () => {
    const ids = new Set(["a", "b", "c"]);
    const sel = { enemy: ["a", "b"], ally: ["c"], ban: [] };
    expect(decodeHash("#" + encodeHash(sel), ids)).toEqual(sel);
    expect(decodeHash("#e=a,zzz,a&a=a", ids)).toEqual({ enemy: ["a"], ally: [], ban: [] });
  });
});
