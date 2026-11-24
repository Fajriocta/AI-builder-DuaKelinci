import type { SaleRow } from "./data";
import { UNKNOWN_SALESMAN } from "./data";

export interface Filters {
  month: string | null;
  regions: string[];
  brands: string[];
}

export const EMPTY_FILTERS: Filters = { month: null, regions: [], brands: [] };

export function applyFilters(rows: SaleRow[], f: Filters): SaleRow[] {
  return rows.filter(
    (r) =>
      (!f.month || r.month === f.month) &&
      (!f.regions.length || f.regions.includes(r.region)) &&
      (!f.brands.length || f.brands.includes(r.brand)),
  );
}

export const uniqueSorted = (rows: SaleRow[], key: keyof SaleRow) =>
  [...new Set(rows.map((r) => String(r[key])))].sort((a, b) => a.localeCompare(b));

export const monthsOf = (rows: SaleRow[]) => uniqueSorted(rows, "month");

const sum = (rows: SaleRow[], f: (r: SaleRow) => number) => rows.reduce((a, r) => a + f(r), 0);

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it); else m.set(k, [it]);
  }
  return m;
}

function lastTwoMonths(rows: SaleRow[]): [string, string] | null {
  const ms = monthsOf(rows);
  return ms.length >= 2 ? [ms[ms.length - 2], ms[ms.length - 1]] : null;
}

const change = (prev: number, last: number) => (prev ? (last - prev) / Math.abs(prev) : null);

export interface Kpis {
  net: number;
  gross: number;
  discount: number;
  discountRate: number;
  invoices: number;
  cartons: number;
  outlets: number;
  months: string[];
  prevMonth: string | null;
  lastMonth: string | null;
  netPrev: number | null;
  netLast: number | null;
  netChange: number | null;
}

export function kpis(rows: SaleRow[]): Kpis {
  const gross = sum(rows, (r) => r.gross);
  const discount = sum(rows, (r) => r.discount);
  const pair = lastTwoMonths(rows);
  const netPrev = pair ? sum(rows.filter((r) => r.month === pair[0]), (r) => r.net) : null;
  const netLast = pair ? sum(rows.filter((r) => r.month === pair[1]), (r) => r.net) : null;
  return {
    net: sum(rows, (r) => r.net),
    gross,
    discount,
    discountRate: gross ? discount / gross : 0,
    invoices: new Set(rows.filter((r) => r.qty > 0).map((r) => r.invoiceNo)).size,
    cartons: sum(rows, (r) => r.qty),
    outlets: new Set(rows.map((r) => r.outletId)).size,
    months: monthsOf(rows),
    prevMonth: pair?.[0] ?? null,
    lastMonth: pair?.[1] ?? null,
    netPrev,
    netLast,
    netChange: pair ? change(netPrev!, netLast!) : null,
  };
}

export interface GroupTotal {
  key: string;
  net: number;
  share: number;
  cartons: number;
  invoices: number;
  outlets: number;
  prev: number | null;
  last: number | null;
  change: number | null;
}

export function salesBy(rows: SaleRow[], key: "region" | "brand" | "branch" | "outletType" | "sku" | "salesman"): GroupTotal[] {
  const total = sum(rows, (r) => r.net);
  const pair = lastTwoMonths(rows);
  return [...groupBy(rows, (r) => r[key])]
    .map(([k, rs]) => {
      const prev = pair ? sum(rs.filter((r) => r.month === pair[0]), (r) => r.net) : null;
      const last = pair ? sum(rs.filter((r) => r.month === pair[1]), (r) => r.net) : null;
      const net = sum(rs, (r) => r.net);
      return {
        key: k,
        net,
        share: total ? net / total : 0,
        cartons: sum(rs, (r) => r.qty),
        invoices: new Set(rs.filter((r) => r.qty > 0).map((r) => r.invoiceNo)).size,
        outlets: new Set(rs.map((r) => r.outletId)).size,
        prev,
        last,
        change: pair ? change(prev!, last!) : null,
      };
    })
    .sort((a, b) => b.net - a.net);
}

export interface Matrix {
  rows: string[];
  cols: string[];
  values: Record<string, Record<string, number>>;
  max: number;
}

export function regionBrandMatrix(rows: SaleRow[]): Matrix {
  const regions = salesBy(rows, "region").map((g) => g.key);
  const brands = salesBy(rows, "brand").map((g) => g.key);
  const values: Record<string, Record<string, number>> = {};
  for (const reg of regions) values[reg] = Object.fromEntries(brands.map((b) => [b, 0]));
  for (const r of rows) values[r.region][r.brand] += r.net;
  const max = Math.max(0, ...regions.flatMap((reg) => brands.map((b) => values[reg][b])));
  return { rows: regions, cols: brands, values, max };
}

export interface OutletCard {
  outletId: string;
  outletName: string;
  outletType: string;
  region: string;
  branch: string;
  salesmen: string[];
  net: number;
  invoices: number;
  skus: number;
  cartons: number;
  firstOrder: string;
  lastOrder: string;
  daysSinceOrder: number;
  avgInvoice: number;
  prev: number | null;
  last: number | null;
  momChange: number | null;
  typeMedian: number;
  vsTypeMedian: number;
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function outletScorecard(rows: SaleRow[]): OutletCard[] {
  if (!rows.length) return [];
  const end = rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0].date);
  const pair = lastTwoMonths(rows);
  const cards = [...groupBy(rows, (r) => r.outletId)].map(([id, rs]): OutletCard => {
    const dates = rs.map((r) => r.date).sort();
    const invoices = new Set(rs.filter((r) => r.qty > 0).map((r) => r.invoiceNo)).size;
    const net = sum(rs, (r) => r.net);
    const prev = pair ? sum(rs.filter((r) => r.month === pair[0]), (r) => r.net) : null;
    const last = pair ? sum(rs.filter((r) => r.month === pair[1]), (r) => r.net) : null;
    return {
      outletId: id,
      outletName: rs[0].outletName,
      outletType: rs[0].outletType,
      region: rs[0].region,
      branch: rs[0].branch,
      salesmen: [...new Set(rs.map((r) => r.salesman))].filter((s) => s !== UNKNOWN_SALESMAN).sort(),
      net,
      invoices,
      skus: new Set(rs.map((r) => r.sku)).size,
      cartons: sum(rs, (r) => r.qty),
      firstOrder: dates[0],
      lastOrder: dates[dates.length - 1],
      daysSinceOrder: daysBetween(dates[dates.length - 1], end),
      avgInvoice: invoices ? net / invoices : 0,
      prev,
      last,
      momChange: pair ? change(prev!, last!) : null,
      typeMedian: 0,
      vsTypeMedian: 0,
    };
  });
  for (const [, group] of groupBy(cards, (c) => c.outletType)) {
    const med = median(group.map((c) => c.net));
    for (const c of group) {
      c.typeMedian = med;
      c.vsTypeMedian = med ? c.net / med : 0;
    }
  }
  return cards.sort((a, b) => a.net - b.net || a.invoices - b.invoices);
}

export interface WeakOutlet extends OutletCard {
  rank: number;
  reasons: string[];
}

export function weakestOutlets(rows: SaleRow[], n = 5): WeakOutlet[] {
  return outletScorecard(rows).slice(0, n).map((c, i) => ({ ...c, rank: i + 1, reasons: weaknessReasons(c) }));
}

export function weaknessReasons(c: OutletCard): string[] {
  const out = [`${Math.round(c.vsTypeMedian * 100)}% dari median ${c.outletType}`];
  if (c.invoices <= 5) out.push(`hanya ${c.invoices} invoice`);
  if (c.momChange !== null && c.momChange <= -0.2) out.push(`turun ${Math.round(Math.abs(c.momChange) * 100)}% MoM`);
  if (c.prev === 0 && (c.last ?? 0) > 0) out.push("outlet baru bulan ini");
  if (c.skus <= 2) out.push(`hanya ${c.skus} SKU`);
  if (c.daysSinceOrder >= 14) out.push(`${c.daysSinceOrder} hari tanpa order`);
  return out;
}

export interface OutletDetail {
  card: OutletCard;
  byMonth: { month: string; net: number }[];
  byBrand: GroupTotal[];
  invoices: { invoiceNo: string; date: string; salesman: string; net: number; lines: number; cartons: number }[];
}

export function outletDetail(rows: SaleRow[], outletId: string): OutletDetail | null {
  const rs = rows.filter((r) => r.outletId === outletId);
  if (!rs.length) return null;
  const card = outletScorecard(rows).find((c) => c.outletId === outletId)!;
  const byMonth = [...groupBy(rs, (r) => r.month)].map(([month, g]) => ({ month, net: sum(g, (r) => r.net) })).sort((a, b) => a.month.localeCompare(b.month));
  const invoices = [...groupBy(rs, (r) => r.invoiceNo)]
    .map(([invoiceNo, g]) => ({ invoiceNo, date: g[0].date, salesman: g[0].salesman, net: sum(g, (r) => r.net), lines: g.length, cartons: sum(g, (r) => r.qty) }))
    .sort((a, b) => b.date.localeCompare(a.date));
  return { card, byMonth, byBrand: salesBy(rs, "brand"), invoices };
}
