export interface SaleRow {
  date: string;
  month: string;
  invoiceNo: string;
  region: string;
  branch: string;
  outletId: string;
  outletName: string;
  outletType: string;
  salesman: string;
  brand: string;
  sku: string;
  qty: number;
  price: number;
  gross: number;
  discount: number;
  net: number;
}

export interface CleaningReport {
  rawRows: number;
  cleanRows: number;
  wrappedLines: boolean;
  duplicatesRemoved: number;
  regionsNormalised: number;
  regionVariants: string[];
  namesTrimmed: number;
  missingSalesman: number;
  returnLines: number;
  droppedInvalid: number;
  sharedOutletNames: { name: string; outletIds: string[] }[];
}

export const UNKNOWN_SALESMAN = "(tidak tercatat)";

const REQUIRED = [
  "date", "invoice_no", "region", "branch", "outlet_id", "outlet_name", "outlet_type",
  "brand", "sku", "qty_carton", "price_per_carton_idr", "gross_sales_idr", "discount_idr", "net_sales_idr",
] as const;

const REGION_ALIASES: Record<string, string> = {
  jabar: "Jawa Barat",
  jateng: "Jawa Tengah",
  jatim: "Jawa Timur",
  jabodetabek: "Jabodetabek",
  "jawa barat": "Jawa Barat",
  "jawa tengah": "Jawa Tengah",
  "jawa timur": "Jawa Timur",
  sumatera: "Sumatera",
  sumatra: "Sumatera",
  kalimantan: "Kalimantan",
};

const titleCase = (s: string) => s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());

export function canonicalRegion(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return REGION_ALIASES[key] ?? titleCase(raw.trim());
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

export function unwrapQuotedLines(text: string): { text: string; wrapped: boolean } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const wrapped = lines.length > 0 && lines.every((l) => {
    const t = l.trim();
    return t.length >= 2 && t.startsWith('"') && t.endsWith('"') && (t.match(/"/g) ?? []).length === 2;
  });
  return { text: wrapped ? lines.map((l) => l.trim().slice(1, -1)).join("\n") : lines.join("\n"), wrapped };
}

const toNumber = (s: string | undefined) => {
  const n = Number((s ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

export function loadSales(csvText: string): { rows: SaleRow[]; report: CleaningReport } {
  const { text, wrapped } = unwrapQuotedLines(csvText);
  const table = parseCsv(text);
  if (table.length < 2) throw new Error("File kosong atau tidak berisi baris data.");

  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`Kolom wajib tidak ditemukan: ${missing.join(", ")}`);
  const idx = Object.fromEntries(header.map((h, i) => [h, i])) as Record<string, number>;
  const get = (r: string[], c: string) => (idx[c] === undefined ? "" : r[idx[c]] ?? "");

  const report: CleaningReport = {
    rawRows: table.length - 1, cleanRows: 0, wrappedLines: wrapped, duplicatesRemoved: 0,
    regionsNormalised: 0, regionVariants: [], namesTrimmed: 0, missingSalesman: 0,
    returnLines: 0, droppedInvalid: 0, sharedOutletNames: [],
  };

  const seen = new Set<string>();
  const variants = new Set<string>();
  const rows: SaleRow[] = [];

  for (const raw of table.slice(1)) {
    const key = raw.map((f) => f.trim()).join("\u0001");
    if (seen.has(key)) { report.duplicatesRemoved++; continue; }
    seen.add(key);

    const date = get(raw, "date").trim();
    const nums = ["qty_carton", "price_per_carton_idr", "gross_sales_idr", "discount_idr", "net_sales_idr"].map((c) => toNumber(get(raw, c)));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || nums.some((n) => Number.isNaN(n))) { report.droppedInvalid++; continue; }

    const rawRegion = get(raw, "region");
    const region = canonicalRegion(rawRegion);
    if (region !== rawRegion) { report.regionsNormalised++; variants.add(rawRegion.trim()); }

    const textCols = ["invoice_no", "branch", "outlet_id", "outlet_name", "outlet_type", "salesman", "brand", "sku"];
    if (textCols.some((c) => get(raw, c) !== get(raw, c).trim())) report.namesTrimmed++;

    let salesman = get(raw, "salesman").trim();
    if (!salesman) { salesman = UNKNOWN_SALESMAN; report.missingSalesman++; }

    const [qty, price, gross, discount, net] = nums;
    if (qty < 0) report.returnLines++;

    rows.push({
      date, month: date.slice(0, 7), invoiceNo: get(raw, "invoice_no").trim(), region,
      branch: get(raw, "branch").trim(), outletId: get(raw, "outlet_id").trim(),
      outletName: get(raw, "outlet_name").trim(), outletType: get(raw, "outlet_type").trim(),
      salesman, brand: get(raw, "brand").trim(), sku: get(raw, "sku").trim(),
      qty, price, gross, discount, net,
    });
  }

  const nameCounts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = nameCounts.get(r.outletId) ?? new Map<string, number>();
    m.set(r.outletName, (m.get(r.outletName) ?? 0) + 1);
    nameCounts.set(r.outletId, m);
  }
  const canonicalName = new Map([...nameCounts].map(([id, m]) => [id, [...m].sort((a, b) => b[1] - a[1])[0][0]]));
  for (const r of rows) r.outletName = canonicalName.get(r.outletId)!;

  const idsByName = new Map<string, Set<string>>();
  for (const [id, name] of canonicalName) idsByName.set(name, (idsByName.get(name) ?? new Set()).add(id));
  report.sharedOutletNames = [...idsByName]
    .filter(([, ids]) => ids.size > 1)
    .map(([name, ids]) => ({ name, outletIds: [...ids].sort() }))
    .sort((a, b) => b.outletIds.length - a.outletIds.length || a.name.localeCompare(b.name));

  report.regionVariants = [...variants].sort();
  report.cleanRows = rows.length;
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.invoiceNo.localeCompare(b.invoiceNo));
  return { rows, report };
}
