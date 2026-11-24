import { useMemo, useState } from "react";
import type { OutletCard, WeakOutlet } from "../lib/analytics";
import { pct, rupiah } from "../lib/format";
import { Delta, Icon } from "./ui";

interface Props {
  weak: WeakOutlet[];
  onOpen: (outletId: string) => void;
}

export function WeakOutlets({ weak, onOpen }: Props) {
  if (!weak.length) return <p className="muted">Tidak ada outlet pada filter ini.</p>;
  return (
    <ol className="weak-list">
      {weak.map((w) => (
        <li key={w.outletId}>
          <button className="weak" onClick={() => onOpen(w.outletId)} aria-label={`Detail ${w.outletName}`}>
            <span className="rank">{w.rank}</span>

            <span style={{ minWidth: 0 }}>
              <span className="weak-name">{w.outletName}<span className="id">{w.outletId}</span></span>
              <span className="weak-meta">
                {w.outletType} · {w.branch}, {w.region} · {w.salesmen.join(" & ") || "salesman tidak tercatat"}
              </span>
              <span className="reasons">
                {w.reasons.slice(1).map((r) => (
                  <span key={r} className={`reason ${/turun|tanpa order/.test(r) ? "hot" : ""}`}>{r}</span>
                ))}
                {w.momChange !== null && w.momChange > 0 && (
                  <span className="reason" title="Masih naik, tapi dari basis yang sangat kecil">naik dari basis kecil</span>
                )}
              </span>
            </span>

            <span className="vs" title={`Median net sales ${w.outletType}: ${rupiah(w.typeMedian)}`}>
              <span className="vs-track"><span className="vs-fill" style={{ width: `${Math.min(100, w.vsTypeMedian * 100)}%` }} /></span>
              <span className="vs-cap">
                <span><b>{pct(w.vsTypeMedian, false, 0)}</b> dari median {w.outletType.toLowerCase()}</span>
                <span className="hide-sm">{rupiah(w.typeMedian)}</span>
              </span>
            </span>

            <span className="weak-num">
              <b>{rupiah(w.net)}</b>
              <small>{w.invoices} invoice · {w.skus} SKU</small>
              <Delta value={w.momChange} label="Bulan terakhir vs bulan sebelumnya" />
            </span>

            <span className="weak-chev"><Icon name="chevr" size={18} /></span>
          </button>
        </li>
      ))}
    </ol>
  );
}

type SortKey = "outletName" | "outletType" | "branch" | "net" | "vsTypeMedian" | "invoices" | "momChange" | "daysSinceOrder";

const COLS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "outletName", label: "Outlet" },
  { key: "outletType", label: "Tipe" },
  { key: "branch", label: "Cabang" },
  { key: "net", label: "Net sales", num: true },
  { key: "vsTypeMedian", label: "vs median tipe", num: true },
  { key: "invoices", label: "Invoice", num: true },
  { key: "momChange", label: "MoM", num: true },
  { key: "daysSinceOrder", label: "Hari sejak order", num: true },
];

export function OutletTable({ all, weakIds, onOpen }: { all: OutletCard[]; weakIds: Set<string>; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "net", asc: true });
  const [query, setQuery] = useState("");
  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const val = (c: OutletCard) => c[sort.key] ?? -Infinity;
    return all
      .filter((c) => !q || `${c.outletName} ${c.outletId} ${c.branch} ${c.region} ${c.salesmen.join(" ")}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const x = val(a), y = val(b);
        const r = typeof x === "string" ? x.localeCompare(String(y)) : (x as number) - (y as number);
        return sort.asc ? r : -r;
      });
  }, [all, sort, query]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="row between">
        <label className="field" style={{ flex: "1 1 260px", maxWidth: 360 }}>
          <span className="sr-only">Cari outlet</span>
          <input type="search" placeholder="Cari outlet, cabang, atau salesman…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <span className="hint">{sorted.length} dari {all.length} outlet · 5 terlemah ditandai garis merah bata</span>
      </div>
      <div className="table-wrap" style={{ maxHeight: 480 }}>
        <table className="tbl">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className={c.num ? "num" : ""} aria-sort={sort.key === c.key ? (sort.asc ? "ascending" : "descending") : "none"}>
                  <button onClick={() => setSort((s) => ({ key: c.key, asc: s.key === c.key ? !s.asc : !c.num }))}>
                    {c.label}
                    {sort.key === c.key ? <Icon name={sort.asc ? "up" : "down"} size={12} /> : <span style={{ opacity: 0.35 }}><Icon name="sort" size={12} /></span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.outletId} className={`click ${weakIds.has(c.outletId) ? "flag" : ""}`} onClick={() => onOpen(c.outletId)}
                tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(c.outletId)}>
                <td><b>{c.outletName}</b> <span className="hint">{c.outletId}</span></td>
                <td>{c.outletType}</td>
                <td>{c.branch}</td>
                <td className="num"><b>{rupiah(c.net)}</b></td>
                <td className="num">{pct(c.vsTypeMedian, false, 0)}</td>
                <td className="num">{c.invoices}</td>
                <td className="num">{c.momChange === null ? "–" : <Delta value={c.momChange} />}</td>
                <td className="num">{c.daysSinceOrder}</td>
              </tr>
            ))}
            {!sorted.length && <tr><td colSpan={COLS.length} className="muted" style={{ textAlign: "center", padding: 24 }}>Tidak ada outlet yang cocok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
