import type { SaleRow } from "./data";
import { kpis, salesBy, weakestOutlets } from "./analytics";
import { monthName, pct, periodLabel, rupiah } from "./format";

export function managerSummary(rows: SaleRow[], scope?: string): string {
  if (!rows.length) return "Tidak ada data penjualan untuk filter yang dipilih.";

  const k = kpis(rows);
  const title = `Ringkasan penjualan ${periodLabel(k.months)}${scope ? ` – ${scope}` : ""}`;
  let first = `${title}: net sales ${rupiah(k.net)} dari ${k.invoices} invoice di ${k.outlets} outlet`;
  if (k.netChange !== null && k.prevMonth && k.lastMonth) {
    first += `, ${monthName(k.lastMonth)} ${k.netChange >= 0 ? "naik" : "turun"} ${pct(Math.abs(k.netChange))} dibanding ${monthName(k.prevMonth)}`;
  }
  const parts = [first + "."];

  const regions = salesBy(rows, "region");
  if (regions.length > 1) {
    const top = regions[0], bottom = regions[regions.length - 1];
    let s = `Region terbesar ${top.key} (${rupiah(top.net)}, ${pct(top.share)}), terkecil ${bottom.key} (${rupiah(bottom.net)})`;
    const worst = regions.filter((g) => g.change !== null).sort((a, b) => a.change! - b.change!)[0];
    if (worst && worst.change! < 0) s += `; penurunan terdalam di ${worst.key} (${pct(worst.change!, true)} MoM)`;
    parts.push(s + ".");
  }

  const brands = salesBy(rows, "brand");
  if (brands.length) {
    let s = brands.length > 1 ? `Brand teratas ${brands[0].key} (${pct(brands[0].share)} dari total)` : `Brand ${brands[0].key}`;
    const withChange = brands.filter((g) => g.change !== null).sort((a, b) => b.change! - a.change!);
    if (withChange.length > 1) {
      const best = withChange[0], worst = withChange[withChange.length - 1];
      if (best.change! > 0) s += `, tumbuh tercepat ${best.key} (${pct(best.change!, true)})`;
      if (worst.change! < 0) s += `, melemah ${worst.key} (${pct(worst.change!, true)})`;
    }
    parts.push(s + ".");
  }

  const weak = weakestOutlets(rows, 5);
  if (weak.length) {
    const names = weak.map((w) => `${w.outletName} (${w.branch})`).join(", ");
    const total = weak.reduce((a, w) => a + w.net, 0);
    parts.push(`${weak.length} outlet terlemah: ${names}; total hanya ${rupiah(total)}, perlu dicek kunjungan & stoknya minggu ini.`);
  }

  const returns = rows.filter((r) => r.qty < 0);
  if (returns.length) {
    parts.push(`Ada ${returns.length} baris retur senilai ${rupiah(returns.reduce((a, r) => a + r.net, 0))}.`);
  }
  return parts.join(" ");
}

export const TELEGRAM_LIMIT = 4096;
