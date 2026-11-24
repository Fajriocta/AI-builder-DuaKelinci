import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Filters } from "../lib/analytics";
import { monthLabel } from "../lib/format";
import { Icon } from "./ui";

interface Props {
  months: string[];
  regions: string[];
  brands: string[];
  filters: Filters;
  onChange: (f: Filters) => void;
  right?: ReactNode;
}

export function FilterBar({ months, regions, brands, filters, onChange, right }: Props) {
  const active = filters.regions.length + filters.brands.length + (filters.month ? 1 : 0);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="filterbar">
      <div className="filterbar-inner">
        <div className="seg" role="group" aria-label="Periode">
          <button aria-pressed={!filters.month} onClick={() => onChange({ ...filters, month: null })}>Semua periode</button>
          {months.map((m) => (
            <button key={m} aria-pressed={filters.month === m} onClick={() => onChange({ ...filters, month: m })}>
              {monthLabel(m, true)}
            </button>
          ))}
        </div>

        <MultiSelect label="Region" options={regions} selected={filters.regions}
          onChange={(regions) => onChange({ ...filters, regions })} />
        <MultiSelect label="Brand" options={brands} selected={filters.brands}
          onChange={(brands) => onChange({ ...filters, brands })} />

        <div className="chips" aria-label="Filter aktif">
          {filters.regions.map((r) => (
            <button key={r} className="chip" onClick={() => onChange({ ...filters, regions: toggle(filters.regions, r) })} aria-label={`Hapus filter ${r}`}>
              {r} <span className="x"><Icon name="x" size={12} stroke={2.4} /></span>
            </button>
          ))}
          {filters.brands.map((b) => (
            <button key={b} className="chip" onClick={() => onChange({ ...filters, brands: toggle(filters.brands, b) })} aria-label={`Hapus filter ${b}`}>
              {b} <span className="x"><Icon name="x" size={12} stroke={2.4} /></span>
            </button>
          ))}
        </div>
        {active > 0 && (
          <button className="link-btn" onClick={() => onChange({ month: null, regions: [], brands: [] })}>Reset filter</button>
        )}
        <span className="spacer" />
        {right}
      </div>
    </div>
  );
}

function MultiSelect({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="dd" ref={ref}>
      <button className="dd-btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}
        {selected.length > 0 && <span className="count">{selected.length}</span>}
        <Icon name="chev" size={14} />
      </button>
      {open && (
        <div className="dd-menu" role="menu" aria-label={label}>
          {options.map((o) => {
            const on = selected.includes(o);
            return (
              <button key={o} className="dd-item" role="menuitemcheckbox" aria-checked={on}
                onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}>
                <span className={`check ${on ? "on" : ""}`}>{on && <Icon name="check" size={12} stroke={3} />}</span>
                {o}
              </button>
            );
          })}
          <div className="dd-foot">
            <button className="link-btn" onClick={() => onChange([])} disabled={!selected.length}>Kosongkan</button>
            <button className="link-btn" onClick={() => setOpen(false)}>Selesai</button>
          </div>
        </div>
      )}
    </div>
  );
}
