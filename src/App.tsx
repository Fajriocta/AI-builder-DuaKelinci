import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import sampleCsv from "../data/sales.csv?raw";
import {
  applyFilters, EMPTY_FILTERS, type Filters, kpis, monthsOf, outletDetail, outletScorecard,
  regionBrandMatrix, salesBy, uniqueSorted, weakestOutlets,
} from "./lib/analytics";
import { loadSales, type CleaningReport, type SaleRow } from "./lib/data";
import { dateLabel, monthLabel, periodLabel } from "./lib/format";
import { managerSummary } from "./lib/summary";
import { DataQualitySection, issueCount } from "./components/DataQuality";
import { FilterBar } from "./components/FilterBar";
import { Heatmap } from "./components/Heatmap";
import { Kpis } from "./components/Kpis";
import { OutletDrawer } from "./components/OutletDrawer";
import { RankBars } from "./components/RankBars";
import { SummaryPanel } from "./components/SummaryPanel";
import { TrendChart } from "./components/TrendChart";
import { OutletTable, WeakOutlets } from "./components/WeakOutlets";
import { Card, Icon, Toast } from "./components/ui";

interface Dataset { rows: SaleRow[]; report: CleaningReport; source: string; }

const initialDataset = (): Dataset => ({ ...loadSales(sampleCsv), source: "sales.csv" });

const SECTIONS = [
  { id: "ikhtisar", label: "Ikhtisar", icon: "overview" },
  { id: "region-brand", label: "Region & brand", icon: "map" },
  { id: "outlet", label: "Outlet", icon: "store" },
  { id: "kualitas-data", label: "Kualitas data", icon: "shield" },
] as const;

function readUrlFilters(rows: SaleRow[]): Filters {
  const p = new URLSearchParams(window.location.search);
  const list = (k: string) => (p.get(k) ? p.get(k)!.split("|") : []);
  const regions = uniqueSorted(rows, "region"), brands = uniqueSorted(rows, "brand");
  const month = p.get("bulan");
  return {
    month: month && monthsOf(rows).includes(month) ? month : null,
    regions: list("region").filter((v) => regions.includes(v)),
    brands: list("brand").filter((v) => brands.includes(v)),
  };
}
function writeUrlFilters(f: Filters) {
  const p = new URLSearchParams();
  if (f.month) p.set("bulan", f.month);
  if (f.regions.length) p.set("region", f.regions.join("|"));
  if (f.brands.length) p.set("brand", f.brands.join("|"));
  const q = p.toString();
  window.history.replaceState(null, "", (q ? `?${q}` : window.location.pathname) + window.location.hash);
}

type Theme = "light" | "dark";
function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem("dk-theme") === "dark" ? "dark" : "light"; } catch { return "light"; }
  });
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggle = () => setTheme((t) => {
    const next = t === "dark" ? "light" : "dark";
    try { localStorage.setItem("dk-theme", next); } catch {}
    return next;
  });
  return [theme, toggle];
}

function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight * 0.35;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1];
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [ids]);
  return active;
}

export default function App() {
  const [data, setData] = useState<Dataset>(initialDataset);
  const [filters, setFiltersState] = useState<Filters>(() => readUrlFilters(data.rows));
  const [outletId, setOutletId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const active = useActiveSection(SECTIONS.map((s) => s.id));
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number>();

  const notify = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), error ? 5000 : 2600);
  }, []);

  const setFilters = useCallback((f: Filters) => { setFiltersState(f); writeUrlFilters(f); }, []);
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const months = useMemo(() => monthsOf(data.rows), [data]);
  const regions = useMemo(() => uniqueSorted(data.rows, "region"), [data]);
  const brands = useMemo(() => uniqueSorted(data.rows, "brand"), [data]);
  const lastDate = useMemo(() => data.rows.reduce((m, r) => (r.date > m ? r.date : m), ""), [data]);

  const view = useMemo(() => {
    const rows = applyFilters(data.rows, filters);
    const regionRows = applyFilters(data.rows, { ...filters, regions: [] });
    const brandRows = applyFilters(data.rows, { ...filters, brands: [] });
    const heatRows = applyFilters(data.rows, { ...EMPTY_FILTERS, month: filters.month });
    const pairOf = (rs: SaleRow[]) => { const m = monthsOf(rs); return m.length >= 2 ? [m[m.length - 2], m[m.length - 1]] as [string, string] : null; };
    const scope = [filters.regions.join(", "), filters.brands.join(", ")].filter(Boolean).join(" · ");
    const weak = weakestOutlets(rows, 5);
    return {
      rows,
      k: kpis(rows),
      regionTotals: salesBy(regionRows, "region"),
      brandTotals: salesBy(brandRows, "brand"),
      regionPair: pairOf(regionRows),
      brandPair: pairOf(brandRows),
      matrix: regionBrandMatrix(heatRows),
      weak,
      weakIds: new Set(weak.map((w) => w.outletId)),
      scorecard: outletScorecard(rows),
      scope,
      summary: managerSummary(rows, scope || undefined),
    };
  }, [data, filters]);

  const detail = useMemo(() => (outletId ? outletDetail(view.rows.length ? view.rows : data.rows, outletId) : null), [outletId, view.rows, data.rows]);

  const loadFile = useCallback(async (file: File) => {
    try {
      const next = { ...loadSales(await file.text()), source: file.name };
      setData(next);
      setFilters(EMPTY_FILTERS);
      setOutletId(null);
      notify(`${file.name} dimuat · ${next.report.cleanRows.toLocaleString("id-ID")} baris`);
    } catch (e) {
      notify(`Gagal membaca ${file.name}: ${(e as Error).message}`, true);
    }
  }, [notify, setFilters]);

  useEffect(() => {
    let depth = 0;
    const hasFile = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => { if (hasFile(e)) { depth++; setDragging(true); } };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const over = (e: DragEvent) => { if (hasFile(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFile(e)) return;
      e.preventDefault(); depth = 0; setDragging(false);
      const f = e.dataTransfer?.files[0];
      if (f) loadFile(f);
    };
    const evs: [string, (e: DragEvent) => void][] = [["dragenter", enter], ["dragleave", leave], ["dragover", over], ["drop", drop]];
    evs.forEach(([n, h]) => window.addEventListener(n, h as EventListener));
    return () => evs.forEach(([n, h]) => window.removeEventListener(n, h as EventListener));
  }, [loadFile]);

  const { k } = view;
  const period = filters.month ? monthLabel(filters.month) : periodLabel(months);
  const weakRank = view.weak.find((w) => w.outletId === outletId)?.rank;
  const issues = issueCount(data.report);
  const vsLabel = (pair: [string, string] | null) => (pair ? `Net sales, perubahan ${monthLabel(pair[1], true)} vs ${monthLabel(pair[0], true)}. Klik untuk memfilter.` : "Net sales. Klik untuk memfilter.");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">dk</div>
          <div>
            <div className="brand-name">Dua Kelinci</div>
            <div className="brand-sub">Sales dashboard</div>
          </div>
        </div>

        <div className="nav-label">Menu</div>
        <nav className="nav" aria-label="Bagian halaman">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === s.id}>
              <Icon name={s.icon} size={17} /> <span className="lbl">{s.label}</span>
              {s.id === "kualitas-data" && issues > 0 && <span className="count">{issues}</span>}
              {s.id === "outlet" && <span className="count">{view.scorecard.length}</span>}
            </a>
          ))}
        </nav>

        <div className="side-foot">
          <div className="source">
            Sumber data
            <b>{data.source}</b>
            {data.report.cleanRows.toLocaleString("id-ID")} baris · s/d {lastDate ? dateLabel(lastDate) : "–"}
          </div>
          <div className="side-actions">
            <button className="btn block" onClick={() => fileRef.current?.click()} title="Muat CSV lain (atau seret file ke halaman)">
              <Icon name="upload" /> <span className="hide-sm">Ganti data</span>
            </button>
            <button className="btn icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? "Mode terang" : "Mode gelap"} title={theme === "dark" ? "Mode terang" : "Mode gelap"}>
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />
        </div>
      </aside>

      <div className="main">
        <header className="pagehead">
          <div>
            <div className="crumb">Penjualan · {period}</div>
            <h1>Ikhtisar penjualan</h1>
            <p>{view.scope || "Semua region & brand"} · {k.outlets} outlet aktif</p>
          </div>
        </header>

        <FilterBar months={months} regions={regions} brands={brands} filters={filters} onChange={setFilters}
          right={<span className="hint hide-sm">Klik grafik atau tabel untuk memfilter</span>} />

        <main className="page">
          {view.rows.length === 0 ? (
            <div className="card empty">
              <h2>Tidak ada penjualan untuk kombinasi filter ini</h2>
              <p className="muted">Coba hapus salah satu filter region atau brand.</p>
              <button className="btn primary" onClick={() => setFilters(EMPTY_FILTERS)}>Reset filter</button>
            </div>
          ) : (
            <>
              <section id="ikhtisar" className="section" aria-labelledby="h-ikhtisar">
                <h2 id="h-ikhtisar" className="sr-only">Ikhtisar</h2>
                <div className="overview">
                  <div className="overview-main">
                    <Kpis k={k} />
                    <Card title="Tren penjualan harian" sub="Net sales per hari dengan rata-rata 7 hari"
                      action={<div className="legend"><span><i style={{ background: "var(--c-region)" }} />Per hari</span><span><i className="line" style={{ background: "var(--c-line)" }} />Rata-rata 7 hari</span></div>}>
                      <TrendChart rows={view.rows} dark={theme === "dark"} />
                    </Card>
                  </div>
                  <SummaryPanel generated={view.summary} scope={view.scope || "semua region & brand"} notify={notify} />
                </div>
              </section>

              <section id="region-brand" className="section" aria-labelledby="h-rb">
                <div className="section-head">
                  <div>
                    <h2 id="h-rb">Region & brand</h2>
                    <p>Dari mana penjualan datang, dan bagaimana perubahannya dari bulan ke bulan.</p>
                  </div>
                </div>
                <div className="grid-2">
                  <Card title="Per region" sub={vsLabel(view.regionPair)}>
                    <RankBars items={view.regionTotals} color="var(--c-region)" selected={filters.regions} noun="region" months={view.regionPair}
                      onToggle={(r) => setFilters({ ...filters, regions: toggleIn(filters.regions, r) })} />
                  </Card>
                  <Card title="Per brand" sub={vsLabel(view.brandPair)}>
                    <RankBars items={view.brandTotals} color="var(--c-brand)" selected={filters.brands} noun="brand" months={view.brandPair}
                      onToggle={(b) => setFilters({ ...filters, brands: toggleIn(filters.brands, b) })} />
                  </Card>
                </div>
                <Card title="Region × brand" sub="Net sales setiap kombinasi. Klik sel, nama region, atau nama brand untuk memfilter.">
                  <Heatmap m={view.matrix} selRegions={filters.regions} selBrands={filters.brands}
                    onRegion={(r) => setFilters({ ...filters, regions: toggleIn(filters.regions, r) })}
                    onBrand={(b) => setFilters({ ...filters, brands: toggleIn(filters.brands, b) })}
                    onCell={(r, b) => {
                      const same = filters.regions.length === 1 && filters.regions[0] === r && filters.brands.length === 1 && filters.brands[0] === b;
                      setFilters({ ...filters, regions: same ? [] : [r], brands: same ? [] : [b] });
                    }} />
                </Card>
              </section>

              <section id="outlet" className="section" aria-labelledby="h-outlet">
                <div className="section-head">
                  <div>
                    <h2 id="h-outlet">Outlet</h2>
                    <p>Lima outlet dengan net sales terendah pada filter ini, dibandingkan dengan median outlet sejenis.</p>
                  </div>
                </div>
                <Card title="5 outlet terlemah" sub="Klik outlet untuk melihat penjualan per bulan, per brand, dan riwayat invoice.">
                  <WeakOutlets weak={view.weak} onOpen={setOutletId} />
                </Card>
                <Card title="Semua outlet" sub="Bisa diurutkan dan dicari. Klik baris untuk detail.">
                  <OutletTable all={view.scorecard} weakIds={view.weakIds} onOpen={setOutletId} />
                </Card>
              </section>
            </>
          )}

          <section id="kualitas-data" className="section" aria-labelledby="h-dq">
            <div className="section-head">
              <div>
                <h2 id="h-dq">Kualitas data</h2>
                <p>
                  {data.report.rawRows.toLocaleString("id-ID")} baris mentah → {data.report.cleanRows.toLocaleString("id-ID")} baris bersih.
                  Export ini tidak bersih, dan berikut yang otomatis dibereskan sebelum angka dihitung.
                </p>
              </div>
            </div>
            <DataQualitySection report={data.report} />
          </section>
        </main>
      </div>

      <OutletDrawer detail={detail} weakRank={weakRank} onClose={() => setOutletId(null)} />
      {dragging && <div className="dropzone">Lepaskan file CSV untuk memuat data</div>}
      <Toast toast={toast} />
    </div>
  );
}
