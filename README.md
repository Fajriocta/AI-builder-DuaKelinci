# Dua Kelinci – Sales Dashboard (build test)

A React web app for exploring `data/sales.csv` (Sep–Oct 2026, 1,891 invoice lines). It covers the three requirements of the test:

1. **Sales by region and brand**: ranked bars with month-on-month change, plus a region × brand heatmap.
2. **The 5 weakest outlets**, each with the reasons it is flagged. Click an outlet to open a detail panel with monthly sales, brand mix and invoice history.
3. **A one-paragraph summary** a sales manager can read in Telegram. You can copy it, edit it, or send it straight from a bot (optional).

Everything runs in the browser. There is no backend and no API key.

## Run it

Requires Node.js 18 or newer.

```bash
cd development
npm install
npm run dev        # opens http://localhost:5173
```

Other scripts:

```bash
npm test           # unit tests (Vitest): cleaning, analytics, summary
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

## Using the dashboard

- **Filters**: period, region and brand in the sticky bar. You can also click any bar, heatmap cell, region name or brand name to filter.
  - Charts cross-filter. Each chart ignores its own dimension, so unselected options stay visible (dimmed) and you can click them.
  - Filters are saved in the URL (`?bulan=2026-10&region=Kalimantan`), so a filtered view can be shared as a link.
- **Summary**: always reflects the current filters. For example, filter to *Kalimantan* to get a paragraph for the Kalimantan manager.
- **Layout**: a sidebar navigates the four sections (Ikhtisar, Region & brand, Outlet, Kualitas data) and highlights the one you're reading.
- **Ganti data**: load another CSV with the same columns, using the sidebar button or by dragging the file onto the page.
- **Kualitas data**: the last section shows exactly what was cleaned (see below).
- **Look**: soft cream palette with warm accents, an optional espresso dark mode, and a mobile layout.

### Sending to Telegram (optional)

Copying the summary always works. To send directly, create a bot with @BotFather, add it to the target chat, then enter the bot token and chat ID under **Kirim…**.

To pre-fill those fields for local use, copy `.env.example` to `.env.local`. These values are bundled into the browser build, so use them only on your own machine.

## Data issues and how they are handled

The export is not clean. All of this is handled in `src/lib/data.ts` and covered by tests.

| Issue | Handling |
|---|---|
| Every line is wrapped in quotes (`"date,invoice_no,..."`), so a normal CSV read gives one column | Detected and unwrapped before parsing. Ordinary CSVs still load. |
| 3 exact duplicate lines (same invoice, SKU and qty) | Removed, so sales are not double-counted. |
| Region spelled inconsistently: `Jabar`, `JAWA BARAT`, `JABODETABEK`, `JAWA TIMUR` | Mapped to 6 canonical regions. |
| Outlet names with trailing spaces (`"Grosir Berkah "`) | Trimmed. |
| One name used by several outlets (e.g. *Toko Anugerah* = OUT1024/1041/1045) | Outlets are always keyed by `outlet_id`. |
| 5 lines with no salesman | Labelled `(tidak tercatat)`. Every outlet is served by two salesmen in rotation, so the name is not guessed. |
| 1 return line (`RTR900001`, qty −2) | Kept as a deduction from net sales, but not counted as a sales invoice. |

Checks: `gross = qty × price` and `net = gross − discount` hold on every line, and the region, brand and heatmap totals reconcile with the overall total.

## How "weakest outlet" is defined

The 5 outlets with the **lowest net sales** in the current selection. Ties go to the outlet with fewer invoices.

I chose the simplest definition that a sales manager can check by hand. Each outlet also shows context explaining *why* it is weak:

- position relative to the **median outlet of the same type**, so a warung is not judged against a grosir
- invoice count
- month-on-month change
- number of SKUs bought
- days since the last order

In this data the 5 outlets form a clear group:

- their net sales are Rp 0.56–1.23 million each, while the next outlet is at Rp 5.2 million
- all are below 10% of the median for their type

Several of them grew month-on-month, but from a very small base. The card says so ("naik dari basis kecil"), so a positive change is not mistaken for health. **Lihat semua outlet** opens a sortable scorecard of every outlet.

## Why the summary is a template, not an LLM

The Telegram paragraph is generated from the computed numbers (`src/lib/summary.ts`):

- every figure matches the dashboard exactly and cannot be made up
- it works offline with no API key
- the output is deterministic and covered by tests

The same function could be called by a scheduled job to post a daily digest without the UI.

## Project structure

```
development/
├── data/sales.csv            # sample data (unchanged copy)
├── src/
│   ├── lib/                  # pure TypeScript, no React
│   │   ├── data.ts           # CSV parsing + cleaning + cleaning report
│   │   ├── analytics.ts      # filters, KPIs, totals, outlet scorecard, weakest outlets
│   │   ├── summary.ts        # Telegram paragraph
│   │   ├── telegram.ts       # Bot API call
│   │   ├── format.ts         # Rupiah / % / date formatting (id-ID)
│   │   └── lib.test.ts       # Vitest
│   ├── components/           # UI components
│   ├── App.tsx               # state, filters (URL-synced), layout
│   └── styles.css            # design tokens (cream / espresso), responsive layout
└── package.json
```

Stack: Vite, React 18, TypeScript, Recharts (daily trend chart). The other charts are plain HTML/CSS so they are clickable and accessible.
