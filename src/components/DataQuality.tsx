import type { ReactNode } from "react";
import type { CleaningReport } from "../lib/data";
import { UNKNOWN_SALESMAN } from "../lib/data";
import { Icon } from "./ui";

interface Item { n: string | number; title: string; body: ReactNode; }

function items(r: CleaningReport): Item[] {
  const out: Item[] = [];
  if (r.wrappedLines) out.push({
    n: "1×", title: "Setiap baris terbungkus tanda kutip",
    body: <>Isinya <code>"date,invoice_no,…"</code>, jadi jika dibaca biasa hanya muncul 1 kolom. Tanda kutip dibuka dulu sebelum di-parse.</>,
  });
  if (r.duplicatesRemoved) out.push({
    n: r.duplicatesRemoved, title: "Baris duplikat dihapus",
    body: "Invoice, SKU, dan qty sama persis, sehingga dianggap terekspor dua kali. Dihapus supaya penjualan tidak terhitung ganda.",
  });
  if (r.regionsNormalised) out.push({
    n: r.regionsNormalised, title: "Penulisan region diseragamkan",
    body: <>{r.regionVariants.map((v, i) => <span key={v}>{i > 0 && " "}<code>{v}</code></span>)} → nama baku, mis. Jawa Barat.</>,
  });
  if (r.namesTrimmed) out.push({
    n: r.namesTrimmed, title: "Spasi berlebih dirapikan",
    body: <>Mis. <code>"Grosir Berkah "</code> → <code>"Grosir Berkah"</code>.</>,
  });
  if (r.sharedOutletNames.length) out.push({
    n: r.sharedOutletNames.length, title: "Nama outlet yang sama dipakai beberapa outlet",
    body: <>Mis. <b>{r.sharedOutletNames[0].name}</b> = {r.sharedOutletNames[0].outletIds.join(", ")}. Karena itu outlet selalu dikenali lewat <code>outlet_id</code>.</>,
  });
  if (r.missingSalesman) out.push({
    n: r.missingSalesman, title: "Baris tanpa salesman",
    body: <>Ditandai <b>{UNKNOWN_SALESMAN}</b>. Tiap outlet dilayani 2 salesman bergantian, jadi namanya tidak ditebak.</>,
  });
  if (r.returnLines) out.push({
    n: r.returnLines, title: "Baris retur (qty negatif)",
    body: "Bukan error. Dihitung sebagai pengurang net sales, tapi tidak dihitung sebagai invoice penjualan.",
  });
  if (r.droppedInvalid) out.push({
    n: r.droppedInvalid, title: "Baris tidak valid dibuang",
    body: "Tanggal atau angka tidak bisa dibaca.",
  });
  return out;
}

export function issueCount(r: CleaningReport): number {
  return items(r).filter((i) => i.title !== "Baris retur (qty negatif)").length;
}

export function DataQualitySection({ report }: { report: CleaningReport }) {
  return (
    <>
      <div className="dq-grid">
        {items(report).map((it) => (
          <div key={it.title} className="card dq-item">
            <span className="dq-num">{it.n}</span>
            <div><h3>{it.title}</h3><p>{it.body}</p></div>
          </div>
        ))}
      </div>
      <div className="dq-check">
        <Icon name="check" /> Pengecekan lolos: gross = qty × harga dan net = gross − diskon di semua baris, serta total per region, brand, dan heatmap cocok dengan total keseluruhan.
      </div>
    </>
  );
}
