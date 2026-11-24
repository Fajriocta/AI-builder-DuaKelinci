import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSales, parseCsv, UNKNOWN_SALESMAN } from "./data";
import { applyFilters, EMPTY_FILTERS, kpis, outletScorecard, regionBrandMatrix, salesBy, weakestOutlets } from "./analytics";
import { managerSummary } from "./summary";
import { periodLabel, pct, rupiah } from "./format";

const csv = readFileSync(new URL("../../data/sales.csv", import.meta.url), "utf8");
const { rows, report } = loadSales(csv);

describe("loading & cleaning", () => {
  it("unwraps lines that are wrapped in quotes", () => {
    expect(report.wrappedLines).toBe(true);
    expect(report.rawRows).toBe(1891);
  });

  it("removes duplicates, normalises regions, flags missing salesman", () => {
    expect(report.duplicatesRemoved).toBe(3);
    expect(rows).toHaveLength(1888);
    expect([...new Set(rows.map((r) => r.region))].sort()).toEqual(
      ["Jabodetabek", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Kalimantan", "Sumatera"],
    );
    expect(report.regionVariants).toEqual(["JABODETABEK", "JAWA BARAT", "JAWA TIMUR", "Jabar"]);
    expect(rows.filter((r) => r.salesman === UNKNOWN_SALESMAN)).toHaveLength(5);
    expect(report.returnLines).toBe(1);
  });

  it("gives every outlet id exactly one (trimmed) name", () => {
    const names = new Map<string, Set<string>>();
    for (const r of rows) names.set(r.outletId, (names.get(r.outletId) ?? new Set()).add(r.outletName));
    expect(Math.max(...[...names.values()].map((s) => s.size))).toBe(1);
    expect(rows.find((r) => r.outletId === "OUT1004")!.outletName).toBe("Grosir Berkah");
    expect(report.sharedOutletNames.find((s) => s.name === "Toko Anugerah")!.outletIds).toHaveLength(3);
  });

  it("still reads an ordinary (unwrapped) CSV", () => {
    const plain = csv.split(/\r?\n/).map((l) => l.replace(/^"|"$/g, "")).join("\n");
    const res = loadSales(plain);
    expect(res.report.wrappedLines).toBe(false);
    expect(res.rows).toHaveLength(1888);
  });

  it("rejects files without the required columns", () => {
    expect(() => loadSales("a,b\n1,2")).toThrow(/Kolom wajib/);
  });

  it("parses quoted fields with commas", () => {
    expect(parseCsv('a,"b, c",d\n1,"x ""y""",3')).toEqual([["a", "b, c", "d"], ["1", 'x "y"', "3"]]);
  });
});

describe("analytics", () => {
  it("reconciles line maths and totals", () => {
    for (const r of rows) {
      expect(r.gross).toBe(r.qty * r.price);
      expect(r.net).toBe(r.gross - r.discount);
    }
    const total = rows.reduce((a, r) => a + r.net, 0);
    expect(salesBy(rows, "region").reduce((a, g) => a + g.net, 0)).toBe(total);
    expect(salesBy(rows, "brand").reduce((a, g) => a + g.net, 0)).toBe(total);
    const m = regionBrandMatrix(rows);
    expect(m.rows.reduce((a, reg) => a + m.cols.reduce((b, c) => b + m.values[reg][c], 0), 0)).toBe(total);
  });

  it("computes KPIs and month-on-month change", () => {
    const k = kpis(rows);
    expect(k.net).toBe(1_725_966_000);
    expect(k.invoices).toBe(823);
    expect(k.netChange).toBeCloseTo(0.0365, 3);
  });

  it("finds the 5 weakest outlets", () => {
    const weak = weakestOutlets(rows, 5);
    expect(weak.map((w) => w.outletId)).toEqual(["OUT1003", "OUT1026", "OUT1035", "OUT1045", "OUT1042"]);
    const rest = outletScorecard(rows).slice(5);
    expect(Math.max(...weak.map((w) => w.net))).toBeLessThan(Math.min(...rest.map((c) => c.net)));
    expect(weak[3].reasons.join(" ")).toMatch(/turun 55% MoM/);
  });

  it("respects filters", () => {
    const oct = applyFilters(rows, { ...EMPTY_FILTERS, month: "2026-10" });
    expect(kpis(oct).netChange).toBeNull();
    const kal = applyFilters(rows, { ...EMPTY_FILTERS, regions: ["Kalimantan"] });
    expect(new Set(kal.map((r) => r.region))).toEqual(new Set(["Kalimantan"]));
  });
});

describe("summary & formatting", () => {
  it("writes a single Telegram-sized paragraph", () => {
    const s = managerSummary(rows);
    expect(s).not.toContain("\n");
    expect(s.length).toBeLessThan(4096);
    expect(s).toContain("naik 3,6% dibanding September");
    expect(s).toContain("Toko Sinar Abadi (Jakarta Barat)");
  });

  it("handles empty selections", () => {
    expect(managerSummary([])).toMatch(/Tidak ada data/);
  });

  it("formats rupiah and percentages the Indonesian way", () => {
    expect(rupiah(1_725_966_000)).toBe("Rp 1,73 M");
    expect(rupiah(12_500_000)).toBe("Rp 12,5 jt");
    expect(rupiah(-528_000)).toBe("-Rp 528 rb");
    expect(rupiah(1_700_000)).toBe("Rp 1,7 jt");
    expect(rupiah(940_500, false)).toBe("Rp 940.500");
    expect(pct(0.123, true)).toBe("+12,3%");
    expect(pct(-0.139, true)).toBe("-13,9%");
    expect(periodLabel(["2026-09", "2026-10"])).toBe("Sep–Okt 2026");
  });
});
