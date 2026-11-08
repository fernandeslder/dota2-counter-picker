import type { View } from "./types";

export type Mode = "normal" | "turbo";

export const MODE: Mode = import.meta.env.VITE_MODE === "turbo" ? "turbo" : "normal";
export const OTHER_URL: string = import.meta.env.VITE_OTHER_URL ?? "";

export const SITE = {
  normal: { title: "Dota 2 Counter Picker", tag: "Classic", accent: "#ff4d4d", other: "Turbo" },
  turbo: { title: "Dota 2 Turbo Picker", tag: "Turbo", accent: "#ffc83d", other: "Classic" },
}[MODE];

/** Counter-picking needs a draft with visible enemies, so it only exists on the classic site. */
export const VIEWS: { id: View; label: string }[] = [
  ...(MODE === "normal" ? [{ id: "counter" as View, label: "Counter-pick" }] : []),
  { id: "team", label: "Team builder" },
  { id: "win", label: "Win chance" },
];
