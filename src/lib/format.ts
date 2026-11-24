export const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const trimZeros = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);

export function rupiah(x: number, short = true): string {
  const sign = x < 0 ? "-" : "";
  const v = Math.abs(x);
  if (!short) return `${sign}Rp ${Math.round(v).toLocaleString("id-ID")}`;
  const units: [number, string][] = [[1e12, "T"], [1e9, "M"], [1e6, "jt"], [1e3, "rb"]];
  for (const [div, unit] of units) {
    if (v >= div) {
      const n = v / div;
      const txt = trimZeros(n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2));
      return `${sign}Rp ${txt.replace(".", ",")} ${unit}`;
    }
  }
  return `${sign}Rp ${v.toFixed(0)}`;
}

export function axisMoney(x: number): string {
  if (x === 0) return "0";
  return rupiah(x).replace(/^-?Rp /, x < 0 ? "-" : "");
}

export function pct(x: number, signed = false, digits = 1): string {
  const s = (x * 100).toFixed(digits).replace(".", ",");
  return `${signed && x > 0 ? "+" : ""}${s}%`;
}

export function num(x: number): string {
  return Math.round(x).toLocaleString("id-ID");
}

export function monthLabel(ym: string, short = false): string {
  const [y, m] = ym.split("-").map(Number);
  const name = MONTHS_ID[m - 1];
  return short ? `${name.slice(0, 3)} ${y}` : `${name} ${y}`;
}

export function monthName(ym: string): string {
  return MONTHS_ID[Number(ym.split("-")[1]) - 1];
}

export function periodLabel(months: string[]): string {
  if (!months.length) return "–";
  if (months.length === 1) return monthLabel(months[0]);
  const first = months[0], last = months[months.length - 1];
  if (first.slice(0, 4) === last.slice(0, 4)) return `${monthName(first).slice(0, 3)}–${monthName(last).slice(0, 3)} ${last.slice(0, 4)}`;
  return `${monthLabel(first, true)} – ${monthLabel(last, true)}`;
}

export function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_ID[m - 1].slice(0, 3)} ${y}`;
}
