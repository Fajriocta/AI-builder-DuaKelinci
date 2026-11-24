import type { OutletDetail } from "../lib/analytics";
import { dateLabel, monthLabel, num, pct, rupiah } from "../lib/format";
import { Delta, Drawer } from "./ui";

export function OutletDrawer({ detail, weakRank, onClose }: { detail: OutletDetail | null; weakRank?: number; onClose: () => void }) {
  if (!detail) return null;
  const { card: c, byMonth, byBrand, invoices } = detail;
  const maxMonth = Math.max(1, ...byMonth.map((m) => m.net));
  const maxBrand = Math.max(1, ...byBrand.map((b) => b.net));

  return (
    <Drawer open onClose={onClose}
      title={c.outletName}
      sub={<>{c.outletId} · {c.outletType} · {c.branch}, {c.region}{weakRank ? <> · <b style={{ color: "var(--neg)" }}>#{weakRank} terlemah</b></> : null}</>}>
      <div className="stat-grid">
        <div className="stat"><small>Net sales</small><b>{rupiah(c.net)}</b></div>
        <div className="stat"><small>Invoice</small><b>{c.invoices}</b></div>
        <div className="stat"><small>Rata-rata / invoice</small><b>{rupiah(c.avgInvoice)}</b></div>
        <div className="stat"><small>vs median {c.outletType}</small><b>{pct(c.vsTypeMedian, false, 0)}</b></div>
        <div className="stat"><small>SKU dibeli</small><b>{c.skus}</b></div>
        <div className="stat"><small>Order terakhir</small><b>{dateLabel(c.lastOrder).replace(/ \d{4}$/, "")}</b>
          <div className="hint">{c.daysSinceOrder === 0 ? "hari terakhir data" : `${c.daysSinceOrder} hari sebelum akhir data`}</div></div>
      </div>

      <div>
        <h3 className="sub-title">Salesman</h3>
        <div>{c.salesmen.join(", ") || "Tidak tercatat"}</div>
      </div>

      <div>
        <h3 className="sub-title">Per bulan {c.momChange !== null && <Delta value={c.momChange} />}</h3>
        <div className="bars">
          {byMonth.map((m) => (
            <div key={m.month} className="bar-row">
              <span className="bar-label">{monthLabel(m.month)}</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: `${(Math.max(0, m.net) / maxMonth) * 100}%`, background: "var(--c-region)" }} /></span>
              <span className="bar-val"><b>{rupiah(m.net)}</b></span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="sub-title">Per brand</h3>
        <div className="bars">
          {byBrand.map((b) => (
            <div key={b.key} className="bar-row">
              <span className="bar-label">{b.key}</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: `${(Math.max(0, b.net) / maxBrand) * 100}%`, background: "var(--c-brand)" }} /></span>
              <span className="bar-val"><span className="hint">{num(b.cartons)} krt</span><b>{rupiah(b.net)}</b></span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="sub-title">Riwayat invoice ({invoices.length})</h3>
        <div className="table-wrap">
          <table className="tbl" style={{ minWidth: 0 }}>
            <thead><tr><th>Tanggal</th><th>Invoice</th><th>Salesman</th><th className="num">Karton</th><th className="num">Net</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.invoiceNo}>
                  <td>{dateLabel(i.date)}</td>
                  <td>{i.invoiceNo}{i.cartons < 0 && <span className="reason hot" style={{ marginLeft: 6 }}>retur</span>}</td>
                  <td>{i.salesman}</td>
                  <td className="num">{i.cartons}</td>
                  <td className="num"><b>{rupiah(i.net)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}
