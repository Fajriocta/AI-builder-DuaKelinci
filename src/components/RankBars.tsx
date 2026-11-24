import type { GroupTotal } from "../lib/analytics";
import { monthLabel, pct, rupiah } from "../lib/format";
import { Delta } from "./ui";

interface Props {
  items: GroupTotal[];
  color: string;
  selected: string[];
  onToggle: (key: string) => void;
  months: [string, string] | null;
  noun: string;
}

export function RankBars({ items, color, selected, onToggle, months, noun }: Props) {
  const max = Math.max(1, ...items.map((i) => i.net));
  return (
    <div className="bars">
      {items.map((it) => {
        const on = selected.includes(it.key);
        const dim = selected.length > 0 && !on;
        const w = Math.max(0, (it.net / max) * 100);
        const tip = [
          `${it.key}: ${rupiah(it.net, false)} (${pct(it.share)} dari total)`,
          `${it.invoices} invoice · ${it.outlets} outlet`,
          months && it.prev !== null ? `${monthLabel(months[0], true)} ${rupiah(it.prev)} → ${monthLabel(months[1], true)} ${rupiah(it.last!)}` : "",
          on ? `Klik untuk hapus filter ${noun}` : `Klik untuk filter ${noun} ini`,
        ].filter(Boolean).join("\n");
        return (
          <button key={it.key} className={`bar-row ${dim ? "dim" : ""}`} aria-pressed={on} title={tip} onClick={() => onToggle(it.key)}>
            <span className="bar-label">{it.key}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${w}%`, background: color }} />
              <span className={`bar-share ${w < 22 ? "out" : ""}`} style={w < 22 ? { left: `calc(${w}% + 6px)` } : undefined}>
                {pct(it.share, false, 0)}
              </span>
            </span>
            <span className="bar-val">
              <b>{rupiah(it.net)}</b>
              <Delta value={it.change} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
