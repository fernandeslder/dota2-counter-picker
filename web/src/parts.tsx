import { ATTRS, LANES, LIMITS, ROLE_LABELS, ROLE_ORDER, filtersActive, emptyFilters } from "./logic";
import type { Filters, Hero, Role, Selection } from "./types";

export const img = (id: string) => `/heroes/${id}.jpg`;
export const sign = (v: number) => (v > 0 ? "+" : "") + v.toFixed(2);

export const ROLE_TEXT: Record<Role, string> = { enemy: "Enemies", ally: "Allies", mine: "My pick", ban: "Banned" };

const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

export function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button className={`pill ${on ? "on" : ""}`} aria-pressed={on} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

export function SelectionBar({
  roles, role, setRole, sel, byId, onRemove, onClear, hint,
}: {
  roles: Role[]; role: Role; setRole: (r: Role) => void; sel: Selection;
  byId: Map<string, Hero>; onRemove: (id: string) => void; onClear: () => void; hint: string;
}) {
  const any = roles.some((r) => sel[r].length);
  return (
    <>
      <div className="roles" role="tablist" aria-label="Selecting as">
        {roles.map((r) => (
          <button key={r} role="tab" aria-selected={role === r} className={`role ${r} ${role === r ? "on" : ""}`} onClick={() => setRole(r)}>
            {ROLE_TEXT[r]} <small>{sel[r].length}/{LIMITS[r]}</small>
          </button>
        ))}
        <button className="ghost" onClick={onClear} disabled={!any}>Clear all</button>
      </div>
      <div className="chips">
        {roles.flatMap((r) =>
          sel[r].map((id) => (
            <button key={id} className={`chip ${r}`} onClick={() => onRemove(id)} title="Remove">
              <img src={img(id)} alt="" /> {byId.get(id)?.name} <span aria-hidden>×</span>
            </button>
          ))
        )}
        {!any && <span className="hint">{hint}</span>}
      </div>
    </>
  );
}

export function HeroGrid({
  heroes, taken, onPick, query,
}: { heroes: Hero[]; taken: Map<string, Role>; onPick: (id: string) => void; query: string }) {
  return (
    <div className="grid">
      {heroes.map((h) => (
        <button key={h.id} className={`tile ${taken.get(h.id) ?? ""}`} onClick={() => onPick(h.id)} title={h.name}>
          <img src={img(h.id)} alt="" loading="lazy" />
          <span>{h.name}</span>
        </button>
      ))}
      {!heroes.length && <span className="hint">No heroes match "{query}".</span>}
    </div>
  );
}

export function FilterPanel({ f, setF }: { f: Filters; setF: (f: Filters) => void }) {
  const set = (p: Partial<Filters>) => setF({ ...f, ...p });
  return (
    <div className="filters">
      <div className="frow">
        <b>Position</b>
        <Chip on={f.position.includes("core")} onClick={() => set({ position: toggle(f.position, "core") })} title="Heroes with the Carry role, or without the Support role">Core</Chip>
        <Chip on={f.position.includes("support")} onClick={() => set({ position: toggle(f.position, "support") })} title="Heroes with Dotabuff's Support role">Support</Chip>
      </div>
      <div className="frow">
        <b>Role</b>
        {ROLE_ORDER.map((r) => (
          <Chip key={r} on={f.roles.includes(r)} onClick={() => set({ roles: toggle(f.roles, r) })}>{ROLE_LABELS[r]}</Chip>
        ))}
        <button className="ghost small" onClick={() => set({ matchAllRoles: !f.matchAllRoles })} title="Whether a hero needs any or all of the selected roles">
          match: {f.matchAllRoles ? "all" : "any"}
        </button>
      </div>
      <div className="frow">
        <b>Lane</b>
        {LANES.map((l) => (
          <Chip key={l} on={f.lanes.includes(l)} onClick={() => set({ lanes: toggle(f.lanes, l) })}>{l.replace(" Lane", "")}</Chip>
        ))}
        <b className="gap">Attribute</b>
        {ATTRS.map((a) => (
          <Chip key={a.id} on={f.attrs.includes(a.id)} onClick={() => set({ attrs: toggle(f.attrs, a.id) })}>{a.label}</Chip>
        ))}
        {filtersActive(f) && <button className="ghost small" onClick={() => setF(emptyFilters())}>Reset filters</button>}
      </div>
    </div>
  );
}

export function Tier({ t }: { t: string }) {
  return <small className={`tier t${t}`}>{t}</small>;
}
