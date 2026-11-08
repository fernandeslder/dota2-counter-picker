import type { View } from "./types";

export type Mode = "normal" | "turbo";

export const MODE: Mode = import.meta.env.VITE_MODE === "turbo" ? "turbo" : "normal";
export const OTHER_URL: string = import.meta.env.VITE_OTHER_URL ?? "";

export const SITE = {
  normal: { title: "Dota 2 Counter Picker", tag: "Classic", accent: "#ff4d4d", other: "Turbo" },
  turbo: { title: "Dota 2 Turbo Picker", tag: "Turbo", accent: "#ffc83d", other: "Classic" },
}[MODE];

/** Enemies and bans are only useful in a normal draft; Turbo picks are blind. */
export const VIEWS: { id: View; label: string }[] = [
  { id: "team", label: MODE === "normal" ? "Pick helper" : "Team builder" },
  { id: "win", label: "Win chance" },
];
