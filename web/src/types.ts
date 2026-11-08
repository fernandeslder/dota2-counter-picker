export interface Hero {
  id: string;
  name: string;
  tier: string;
  wr: number | null;
  pick: number | null;
  ban: number | null;
}

export interface MatchupData {
  updated: string;
  source: string;
  heroes: Hero[];
  /** [counter][enemy] */
  adv: number[][];
  wr: number[][];
  n: number[][];
}

export type Role = "enemy" | "ally" | "ban";

export interface Selection {
  enemy: string[];
  ally: string[];
  ban: string[];
}

export interface Row {
  hero: Hero;
  index: number;
  cumAdv: number;
  avgWr: number;
  minMatches: number;
  perEnemy: number[];
}
