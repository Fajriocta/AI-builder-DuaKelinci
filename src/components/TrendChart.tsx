import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { SaleRow } from "../lib/data";
import { axisMoney, dateLabel, monthLabel, rupiah } from "../lib/format";

interface Point { date: string; net: number; avg: number | null; }

export function TrendChart({ rows, dark }: { rows: SaleRow[]; dark: boolean }) {
  const data = useMemo<Point[]>(() => {
    if (!rows.length) return [];
    const byDate = new Map<string, number>();
    for (const r of rows) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.net);
    const dates = [...byDate.keys()].sort();
    const out: Point[] = [];
    for (let d = new Date(dates[0] + "T00:00:00Z"); d <= new Date(dates[dates.length - 1] + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      out.push({ date: iso, net: byDate.get(iso) ?? 0, avg: null });
    }
    out.forEach((p, i) => {
      if (i >= 6) p.avg = out.slice(i - 6, i + 1).reduce((a, q) => a + q.net, 0) / 7;
    });
    return out;
  }, [rows]);

  const monthStarts = data.filter((p, i) => i > 0 && p.date.endsWith("-01")).map((p) => p.date);
  const c = dark
    ? { area: "#7d9a78", line: "#e28a70", grid: "#39322b", text: "#b5a998" }
    : { area: "#a9bca4", line: "#b5573f", grid: "#ece3d3", text: "#8a7f71" };

  return (
    <div style={{ height: 230 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey="date" tickFormatter={(d: string) => dateLabel(d).replace(/ \d{4}$/, "")} tick={{ fontSize: 11, fill: c.text }}
            tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tickFormatter={axisMoney} tick={{ fontSize: 11, fill: c.text }} tickLine={false} axisLine={false} width={52} />
          {monthStarts.map((d) => (
            <ReferenceLine key={d} x={d} stroke={c.text} strokeDasharray="3 3" strokeOpacity={0.5}
              label={{ value: monthLabel(d.slice(0, 7), true), position: "insideTopLeft", fontSize: 11, fill: c.text }} />
          ))}
          <Tooltip content={<TrendTip />} cursor={{ fill: c.text, fillOpacity: 0.08 }} />
          <Bar dataKey="net" fill={c.area} fillOpacity={0.9} radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          <Line type="monotone" dataKey="avg" stroke={c.line} strokeWidth={2.2} dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendTip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tt">
      <b>{dateLabel(p.date)}</b>
      Net sales: {rupiah(p.net)}
      {p.avg !== null && <div className="muted">Rata-rata 7 hari: {rupiah(p.avg)}</div>}
    </div>
  );
}
