import { Fragment } from "react";
import type { Matrix } from "../lib/analytics";
import { rupiah } from "../lib/format";

interface Props {
  m: Matrix;
  selRegions: string[];
  selBrands: string[];
  onCell: (region: string, brand: string) => void;
  onRegion: (region: string) => void;
  onBrand: (brand: string) => void;
}

const short = (v: number) => rupiah(v).replace("Rp ", "");

export function Heatmap({ m, selRegions, selBrands, onCell, onRegion, onBrand }: Props) {
  const anySel = selRegions.length > 0 || selBrands.length > 0;
  const inSel = (r: string, b: string) =>
    (!selRegions.length || selRegions.includes(r)) && (!selBrands.length || selBrands.includes(b));
  const rowTotal = (r: string) => m.cols.reduce((a, c) => a + m.values[r][c], 0);
  const colTotal = (c: string) => m.rows.reduce((a, r) => a + m.values[r][c], 0);

  return (
    <>
      <div className="heat-wrap">
        <div className="heat" style={{ gridTemplateColumns: `minmax(110px, auto) repeat(${m.cols.length}, minmax(70px, 1fr)) 72px` }}>
          <div />
          {m.cols.map((c) => (
            <button key={c} className="heat-h" style={selBrands.includes(c) ? { color: "var(--accent)" } : undefined}
              onClick={() => onBrand(c)} title={`Filter brand ${c} · total ${rupiah(colTotal(c))}`}>
              {c}
            </button>
          ))}
          <div className="heat-h">Total</div>

          {m.rows.map((r) => (
            <Fragment key={r}>
              <button className="heat-r" style={selRegions.includes(r) ? { color: "var(--accent)" } : undefined}
                onClick={() => onRegion(r)} title={`Filter region ${r}`}>
                {r}
              </button>
              {m.cols.map((c) => {
                const v = m.values[r][c];
                const t = m.max ? Math.max(0, v) / m.max : 0;
                const alpha = 0.08 + 0.92 * Math.pow(t, 0.75);
                const sel = selRegions.includes(r) && selBrands.includes(c);
                return (
                  <button key={c} className={`heat-c ${sel ? "sel" : ""}`}
                    style={{
                      background: `rgba(var(--heat), ${alpha})`,
                      color: alpha > 0.55 ? "var(--heat-ink)" : "var(--text)",
                      opacity: anySel && !inSel(r, c) ? 0.3 : 1,
                    }}
                    title={`${r} × ${c}: ${rupiah(v, false)}\nKlik untuk memfilter kombinasi ini`}
                    aria-label={`${r}, ${c}: ${rupiah(v)}`}
                    onClick={() => onCell(r, c)}>
                    {short(v)}
                  </button>
                );
              })}
              <div className="heat-tot">{short(rowTotal(r))}</div>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="heat-scale">
        <span>rendah</span><span className="ramp" /><span>tinggi</span>
      </div>
    </>
  );
}
