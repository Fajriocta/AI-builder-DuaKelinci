import type { Kpis as K } from "../lib/analytics";
import { monthLabel, num, pct, rupiah } from "../lib/format";
import { Delta } from "./ui";

export function Kpis({ k }: { k: K }) {
  const vs = k.prevMonth && k.lastMonth ? `${monthLabel(k.lastMonth, true)} vs ${monthLabel(k.prevMonth, true)}` : null;
  return (
    <div className="kpis">
      <div className="card kpi hero">
        <div className="kpi-label">Net sales</div>
        <div className="kpi-value" title={rupiah(k.net, false)}>{rupiah(k.net)}</div>
        <div className="kpi-foot">
          {vs ? <><Delta value={k.netChange} /> {vs}</> : <span>{rupiah(k.net, false)}</span>}
        </div>
      </div>
      <div className="card kpi">
        <div className="kpi-label">Invoice</div>
        <div className="kpi-value">{num(k.invoices)}</div>
        <div className="kpi-foot">rata-rata {rupiah(k.invoices ? k.net / k.invoices : 0)} / invoice</div>
      </div>
      <div className="card kpi">
        <div className="kpi-label">Outlet aktif</div>
        <div className="kpi-value">{num(k.outlets)}</div>
        <div className="kpi-foot">{num(k.cartons)} karton terjual</div>
      </div>
      <div className="card kpi">
        <div className="kpi-label">Diskon</div>
        <div className="kpi-value">{pct(k.discountRate)}</div>
        <div className="kpi-foot">{rupiah(k.discount)} dari gross {rupiah(k.gross)}</div>
      </div>
    </div>
  );
}
