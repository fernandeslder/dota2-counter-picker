export interface Stat {
  wr: number | null;
  pick: number | null;
  ban: number | null;
  tier: string | null;
}

export interface Hero {
  id: string;
  name: string;
  roles: string[];
  attack: string | null;
  attr: string | null;
  /** lane name -> presence % (e.g. "Safe Lane": 91.8) */
  lanes: Record<string, number>;
  stats: { normal: Stat; turbo: Stat };
}

export interface MatchupData {
  updated: string;
  patch?: string;
  source: string;
  heroes: Hero[];
  /** [counter][enemy], all game modes (Dotabuff doesn't split matchups by mode) */
  adv: number[][];
  wr: number[][];
  n: number[][];
  /** same-team synergy in win-rate percentage points, [a][b] symmetric; synN = matches behind it */
  syn?: number[][];
  synN?: number[][];
  synergySources?: { stratz?: string; d2pt?: string; agreement?: number };
}

export type Role = "enemy" | "ally" | "mine" | "ban";
export type View = "team" | "win";

export interface Selection {
  enemy: string[];
  ally: string[];
  mine: string[];
  ban: string[];
}

export interface Filters {
  position: ("core" | "support")[];
  roles: string[];
  matchAllRoles: boolean;
  lanes: string[];
  attrs: string[];
}

export interface TeamRow {
  hero: Hero;
  index: number;
  wr: number;
  pick: number;
  tier: string;
  fills: string[];
  fillsLane: string | null;
  /** average same-team synergy (pp) with the chosen teammates; null when no teammates or no data */
  synergy: number | null;
  partner: boolean;
  perEnemy: number[];
  vsEnemies: number | null;
  fit: number;
}
